import { executeTask } from './test.js';
import fs from 'fs';
import path from 'path';

class ParallelBatchProcessor {
  constructor(maxConcurrent = 3) {
    this.tasks = [];
    this.results = [];
    this.isRunning = false;
    this.totalTokenStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      calls: 0
    };
    this.maxConcurrent = maxConcurrent;
    this.activeTasks = 0;
    this.completedTasks = 0;
  }

  // 加载任务配置
  loadTasks(taskFilePath = './task.json') {
    try {
      const taskData = JSON.parse(fs.readFileSync(taskFilePath, 'utf8'));
      this.tasks = taskData.tasks || [];
      console.log(`✅ 已加载 ${this.tasks.length} 个任务`);
      return this.tasks.length;
    } catch (error) {
      console.error('❌ 加载任务配置失败:', error.message);
      return 0;
    }
  }

  // 状态更新回调
  onStatusUpdate(taskIndex, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 任务 ${taskIndex + 1}/${this.tasks.length}: ${message}`);
  }

  // 格式化token统计信息
  formatTokenStats(tokenStats) {
    if (!tokenStats) return '无token统计信息';
    
    return `📊 Token使用: 总计${tokenStats.totalTokens} (输入${tokenStats.promptTokens}, 输出${tokenStats.completionTokens}) - ${tokenStats.calls}次调用`;
  }

  // 执行单个任务
  async executeSingleTask(taskIndex) {
    const task = this.tasks[taskIndex];
    if (!task) {
      throw new Error(`任务索引 ${taskIndex} 不存在`);
    }

    const taskDir = task.dir || process.cwd();
    const firstPrompt = task.first_prompt;

    console.log(`\n🚀 开始执行任务 ${taskIndex + 1}/${this.tasks.length}`);
    console.log(`📝 任务内容: ${firstPrompt.substring(0, 100)}...`);
    console.log(`📁 工作目录: ${taskDir}`);

    const startTime = Date.now();
    
    try {
      const result = await executeTask(
        taskDir, 
        firstPrompt, 
        (message) => this.onStatusUpdate(taskIndex, message)
      );
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      // 更新总token统计
      if (result.tokenStats) {
        this.totalTokenStats.totalTokens += result.tokenStats.totalTokens || 0;
        this.totalTokenStats.promptTokens += result.tokenStats.promptTokens || 0;
        this.totalTokenStats.completionTokens += result.tokenStats.completionTokens || 0;
        this.totalTokenStats.calls += result.tokenStats.calls || 0;
      }
      
      const taskResult = {
        taskIndex,
        task: task,
        result: result,
        duration: duration,
        timestamp: new Date().toISOString()
      };

      this.results.push(taskResult);
      this.completedTasks++;
      
      console.log(`✅ 任务 ${taskIndex + 1} 完成 (耗时: ${duration}s) [${this.completedTasks}/${this.tasks.length}]`);
      console.log(`📊 状态: ${result.status}, 迭代次数: ${result.iterations}`);
      console.log(`💾 ${this.formatTokenStats(result.tokenStats)}`);
      
      // 显示最后一次响应和评估
      if (result.lastResponse) {
        console.log(`📝 最后响应: ${result.lastResponse.substring(0, 200)}...`);
      }
      if (result.lastEvaluation) {
        console.log(`🔍 最后评估: ${result.lastEvaluation.substring(0, 200)}...`);
      }
      
      // 显示任务成本
      //   if (result.tokenStats) {
      //     const cost = this.costCalculator.calculateTaskCost(result.tokenStats);
      //     console.log(`💰 ${this.costCalculator.formatCost(cost)}`);
      //   }
      
      return taskResult;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      const taskResult = {
        taskIndex,
        task: task,
        result: { 
          status: 'error', 
          error: error.message, 
          iterations: 0,
          tokenStats: null
        },
        duration: duration,
        timestamp: new Date().toISOString()
      };

      this.results.push(taskResult);
      this.completedTasks++;
      
      console.log(`❌ 任务 ${taskIndex + 1} 失败 (耗时: ${duration}s) [${this.completedTasks}/${this.tasks.length}]`);
      console.log(`💥 错误: ${error.message}`);
      
      return taskResult;
    } finally {
      this.activeTasks--;
    }
  }

  // 控制并发执行
  async executeWithConcurrencyControl() {
    const taskPromises = [];
    const runningTasks = new Set();

    for (let i = 0; i < this.tasks.length; i++) {
      // 等待有空闲的并发槽位
      while (this.activeTasks >= this.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.activeTasks++;
      const taskPromise = this.executeSingleTask(i);
      runningTasks.add(taskPromise);
      
      // 任务完成后从运行集合中移除
      taskPromise.finally(() => {
        runningTasks.delete(taskPromise);
      });

      taskPromises.push(taskPromise);
    }

    // 等待所有任务完成
    await Promise.allSettled(taskPromises);
  }

  // 并行执行任务
  async executeTasksParallel() {
    if (this.tasks.length === 0) {
      console.log('❌ 没有可执行的任务');
      return;
    }

    this.isRunning = true;
    this.results = [];
    this.completedTasks = 0;
    this.activeTasks = 0;
    this.totalTokenStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      calls: 0
    };

    console.log(`\n🎯 开始并行执行 ${this.tasks.length} 个任务 (最大并发: ${this.maxConcurrent})`);
    console.log('=' * 60);

    const startTime = Date.now();

    try {
      await this.executeWithConcurrencyControl();
    } finally {
      this.isRunning = false;
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n' + '=' * 60);
      console.log(`🎉 并行执行完成! 总耗时: ${totalTime}s`);
      this.printSummary();
    }
  }

  // 打印执行摘要
  printSummary() {
    const completed = this.results.filter(r => r.result.status === 'completed').length;
    const errors = this.results.filter(r => r.result.status === 'error').length;
    const timeouts = this.results.filter(r => r.result.status === 'timeout').length;

    console.log('\n📊 执行摘要:');
    console.log(`✅ 成功完成: ${completed} 个任务`);
    console.log(`❌ 执行失败: ${errors} 个任务`);
    console.log(`⏰ 超时未完成: ${timeouts} 个任务`);
    console.log(`📈 成功率: ${((completed / this.tasks.length) * 100).toFixed(1)}%`);

    // 显示token统计
    console.log('\n💾 Token使用统计:');
    console.log(`📊 总Token: ${this.totalTokenStats.totalTokens.toLocaleString()}`);
    console.log(`📥 输入Token: ${this.totalTokenStats.promptTokens.toLocaleString()}`);
    console.log(`📤 输出Token: ${this.totalTokenStats.completionTokens.toLocaleString()}`);
    console.log(`🔄 API调用次数: ${this.totalTokenStats.calls}`);
    if (this.totalTokenStats.calls > 0) {
      console.log(`📊 平均每次调用: ${Math.round(this.totalTokenStats.totalTokens / this.totalTokenStats.calls)} tokens`);
    }

    // 显示详细结果
    console.log('\n📋 详细结果:');
    this.results.forEach((result, index) => {
      const status = result.result.status === 'completed' ? '✅' : 
                    result.result.status === 'error' ? '❌' : '⏰';
      const tokenInfo = result.result.tokenStats ? 
        ` (${result.result.tokenStats.totalTokens} tokens)` : '';
      console.log(`${status} 任务 ${index + 1}: ${result.result.status} (${result.duration}s)${tokenInfo}`);
    });
  }

  // 保存结果到文件
  saveResults(outputPath = './parallel_batch_results.json') {
    try {
      const output = {
        summary: {
          totalTasks: this.tasks.length,
          completedTasks: this.results.filter(r => r.result.status === 'completed').length,
          failedTasks: this.results.filter(r => r.result.status === 'error').length,
          timeoutTasks: this.results.filter(r => r.result.status === 'timeout').length,
          maxConcurrent: this.maxConcurrent,
          timestamp: new Date().toISOString(),
          totalTokenStats: this.totalTokenStats,
        },
        results: this.results
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`💾 结果已保存到: ${outputPath}`);
    } catch (error) {
      console.error('❌ 保存结果失败:', error.message);
    }
  }

  // 停止执行
  stop() {
    if (this.isRunning) {
      console.log('⏹️ 正在停止并行执行...');
      this.isRunning = false;
    }
  }
}

// 主函数
async function main() {
  // 可以通过命令行参数设置并发数
  const maxConcurrent = parseInt(process.argv[2]) || 3;
  
  const processor = new ParallelBatchProcessor(maxConcurrent);
  
  // 加载任务
  const taskCount = processor.loadTasks();
  if (taskCount === 0) {
    console.log('❌ 没有找到任务配置，请检查 task.json 文件');
    return;
  }

  // 并行执行所有任务
  await processor.executeTasksParallel();
  
  // 保存结果
  processor.saveResults();
}

// 如果直接运行此文件
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { ParallelBatchProcessor }; 