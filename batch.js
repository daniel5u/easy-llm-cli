import { executeTask } from './test.js';
import { TokenCostCalculator } from './token-calculator.js';
import fs from 'fs';
import path from 'path';

class BatchProcessor {
  constructor() {
    this.tasks = [];
    this.results = [];
    this.currentTaskIndex = 0;
    this.isRunning = false;
    this.totalTokenStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      calls: 0
    };
    this.costCalculator = new TokenCostCalculator();
    this.maxConcurrent = 3; // 最大并发数，避免API限制
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

  // 获取任务状态
  getTaskStatus() {
    return {
      total: this.tasks.length,
      completed: this.results.length,
      current: this.currentTaskIndex,
      isRunning: this.isRunning
    };
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
      
      console.log(`✅ 任务 ${taskIndex + 1} 完成 (耗时: ${duration}s)`);
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
      if (result.tokenStats) {
        const cost = this.costCalculator.calculateTaskCost(result.tokenStats);
        console.log(`💰 ${this.costCalculator.formatCost(cost)}`);
      }
      
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
      
      console.log(`❌ 任务 ${taskIndex + 1} 失败 (耗时: ${duration}s)`);
      console.log(`💥 错误: ${error.message}`);
      
      return taskResult;
    }
  }

  // 并行执行任务
  async executeTasksParallel() {
    if (this.tasks.length === 0) {
      console.log('❌ 没有可执行的任务');
      return;
    }

    this.isRunning = true;
    this.results = [];
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
      // 创建任务执行函数数组
      const taskPromises = this.tasks.map((task, index) => {
        return this.executeSingleTask(index);
      });

      // 使用Promise.allSettled确保所有任务都能完成，即使有失败的
      const results = await Promise.allSettled(taskPromises);
      
      // 处理结果
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          // 任务成功完成
          console.log(`✅ 任务 ${index + 1} 成功完成`);
        } else {
          // 任务失败
          console.log(`❌ 任务 ${index + 1} 执行失败: ${result.reason.message}`);
        }
      });

    } finally {
      this.isRunning = false;
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n' + '=' * 60);
      console.log(`🎉 并行执行完成! 总耗时: ${totalTime}s`);
      this.printSummary();
    }
  }

  // 串行执行任务（保持原有功能）
  async executeAllTasks() {
    if (this.tasks.length === 0) {
      console.log('❌ 没有可执行的任务');
      return;
    }

    this.isRunning = true;
    this.currentTaskIndex = 0;
    this.results = [];
    this.totalTokenStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      calls: 0
    };

    console.log(`\n🎯 开始串行执行 ${this.tasks.length} 个任务`);
    console.log('=' * 50);

    const startTime = Date.now();

    try {
      for (let i = 0; i < this.tasks.length; i++) {
        this.currentTaskIndex = i;
        await this.executeSingleTask(i);
        
        // 任务间短暂休息，避免API限制
        if (i < this.tasks.length - 1) {
          console.log('⏳ 等待 2 秒后继续下一个任务...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } finally {
      this.isRunning = false;
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n' + '=' * 50);
      console.log(`🎉 串行执行完成! 总耗时: ${totalTime}s`);
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

    // 显示成本分析
    // this.costCalculator.analyzeCosts(this.results);

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
  saveResults(outputPath = './batch_results.json') {
    try {
      const output = {
        summary: {
          totalTasks: this.tasks.length,
          completedTasks: this.results.filter(r => r.result.status === 'completed').length,
          failedTasks: this.results.filter(r => r.result.status === 'error').length,
          timeoutTasks: this.results.filter(r => r.result.status === 'timeout').length,
          timestamp: new Date().toISOString(),
          totalTokenStats: this.totalTokenStats,
          costAnalysis: this.costCalculator.calculateBatchCost(this.results)
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
      console.log('⏹️ 正在停止批量执行...');
      this.isRunning = false;
    }
  }
}

// 主函数
async function main() {
  const processor = new BatchProcessor();
  
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

export { BatchProcessor };
