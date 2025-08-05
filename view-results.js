#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户选择
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 显示结果摘要
function showSummary(data) {
  const summary = data.summary;
  console.log('\n📊 执行摘要:');
  console.log(`总任务数: ${summary.totalTasks}`);
  console.log(`成功完成: ${summary.completedTasks}`);
  console.log(`执行失败: ${summary.failedTasks}`);
  console.log(`超时未完成: ${summary.timeoutTasks}`);
  console.log(`成功率: ${((summary.completedTasks / summary.totalTasks) * 100).toFixed(1)}%`);
  
  if (summary.totalTokenStats) {
    console.log('\n💾 Token统计:');
    console.log(`总Token: ${summary.totalTokenStats.totalTokens.toLocaleString()}`);
    console.log(`输入Token: ${summary.totalTokenStats.promptTokens.toLocaleString()}`);
    console.log(`输出Token: ${summary.totalTokenStats.completionTokens.toLocaleString()}`);
    console.log(`API调用次数: ${summary.totalTokenStats.calls}`);
  }
  
  if (summary.maxConcurrent) {
    console.log(`最大并发数: ${summary.maxConcurrent}`);
  }
  
  console.log(`执行时间: ${summary.timestamp}`);
}

// 显示任务详情
function showTaskDetails(task, index) {
  console.log(`\n${'=' * 60}`);
  console.log(`📋 任务 ${index + 1}: ${task.task.first_prompt.substring(0, 100)}...`);
  console.log(`⏱️  耗时: ${task.duration}s`);
  console.log(`📊 状态: ${task.result.status}`);
  console.log(`🔄 迭代次数: ${task.result.iterations}`);
  
  if (task.result.tokenStats) {
    console.log(`💾 Token使用: ${task.result.tokenStats.totalTokens} (输入: ${task.result.tokenStats.promptTokens}, 输出: ${task.result.tokenStats.completionTokens})`);
  }
  
  if (task.result.lastResponse) {
    console.log(`\n📝 最后响应:`);
    console.log(task.result.lastResponse);
  }
  
  if (task.result.lastEvaluation) {
    console.log(`\n🔍 最后评估:`);
    console.log(task.result.lastEvaluation);
  }
  
  if (task.result.error) {
    console.log(`\n❌ 错误信息:`);
    console.log(task.result.error);
  }
}

// 显示菜单
function showMenu() {
  console.log('\n📋 结果查看器');
  console.log('=' * 40);
  console.log('1. 查看并行执行结果');
  console.log('2. 查看串行执行结果');
  console.log('3. 查看测试结果');
  console.log('4. 查看自定义文件');
  console.log('5. 退出');
  console.log('=' * 40);
}

// 加载并显示结果文件
async function loadAndDisplayResults(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ 文件不存在: ${filePath}`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 显示摘要
    showSummary(data);
    
    // 询问是否查看详细任务信息
    const showDetails = await askQuestion('\n是否查看详细任务信息? (y/n): ');
    if (showDetails.toLowerCase() === 'y') {
      console.log('\n📋 详细任务信息:');
      data.results.forEach((task, index) => {
        showTaskDetails(task, index);
      });
    }
    
  } catch (error) {
    console.error('❌ 读取文件失败:', error.message);
  }
}

// 主函数
async function main() {
  try {
    while (true) {
      showMenu();
      
      const choice = await askQuestion('\n请选择要查看的结果文件 (1-5): ');
      
      switch (choice) {
        case '1':
          await loadAndDisplayResults('./parallel_batch_results.json');
          break;
          
        case '2':
          await loadAndDisplayResults('./batch_results.json');
          break;
          
        case '3':
          await loadAndDisplayResults('./test_results.json');
          break;
          
        case '4':
          const customPath = await askQuestion('请输入文件路径: ');
          await loadAndDisplayResults(customPath);
          break;
          
        case '5':
          console.log('\n👋 再见!');
          rl.close();
          return;
          
        default:
          console.log('\n❌ 无效选择，请重新输入');
          break;
      }
      
      const continueChoice = await askQuestion('\n是否继续查看其他结果? (y/n): ');
      if (continueChoice.toLowerCase() !== 'y') {
        console.log('\n👋 再见!');
        break;
      }
    }
  } catch (error) {
    console.error('\n❌ 执行出错:', error.message);
  } finally {
    rl.close();
  }
}

// 如果直接运行此文件
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { main }; 