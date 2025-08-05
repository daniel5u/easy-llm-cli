#!/usr/bin/env node

import { ParallelBatchProcessor } from './parallel-batch.js';
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

// 主函数
async function main() {
  try {
    while (true) {
        const concurrentChoice = await askQuestion('请输入并发数量 (默认3): ');
        const maxConcurrent = parseInt(concurrentChoice) || 3;
        
        console.log(`\n🚀 开始并行执行 (并发数: ${maxConcurrent})...`);
        const parallelProcessor = new ParallelBatchProcessor(maxConcurrent);
        const parallelTaskCount = parallelProcessor.loadTasks();
        if (parallelTaskCount > 0) {
        await parallelProcessor.executeTasksParallel();
        parallelProcessor.saveResults();
        }
        break;
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