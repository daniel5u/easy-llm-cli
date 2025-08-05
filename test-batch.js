import { BatchProcessor } from './batch.js';
import { ParallelBatchProcessor } from './parallel-batch.js';

// 测试批量处理器
async function testBatchProcessor() {
  console.log('🧪 测试批量处理器...\n');
  
  const processor = new BatchProcessor();
  
  // 加载任务
  const taskCount = processor.loadTasks();
  console.log(`📊 加载了 ${taskCount} 个任务\n`);
  
  if (taskCount === 0) {
    console.log('❌ 没有找到任务，请确保 task.json 文件存在且包含任务');
    return;
  }
  
  // 显示任务状态
  const status = processor.getTaskStatus();
  console.log('📋 任务状态:', status);
  
  // 测试执行单个任务（只执行第一个任务作为测试）
  console.log('\n🔬 测试执行第一个任务...');
  try {
    const result = await processor.executeSingleTask(0);
    console.log('✅ 单个任务测试成功');
    console.log('📊 结果:', result.result.status);
    console.log('🔄 迭代次数:', result.result.iterations);
    
    // 显示token统计
    if (result.result.tokenStats) {
      console.log('💾 Token统计:');
      console.log(`  📊 总Token: ${result.result.tokenStats.totalTokens}`);
      console.log(`  📥 输入Token: ${result.result.tokenStats.promptTokens}`);
      console.log(`  📤 输出Token: ${result.result.tokenStats.completionTokens}`);
      console.log(`  🔄 API调用次数: ${result.result.tokenStats.calls}`);
      console.log(`  📊 平均每次调用: ${result.result.tokenStats.averageTokensPerCall} tokens`);
    } else {
      console.log('💾 Token统计: 无可用数据');
    }
  } catch (error) {
    console.error('❌ 单个任务测试失败:', error.message);
  }
  
  // 显示摘要
  // processor.printSummary();
}

// 测试并行处理器
async function testParallelProcessor() {
  console.log('\n🚀 测试并行处理器...\n');
  
  const processor = new ParallelBatchProcessor(2); // 设置并发数为2
  
  // 加载任务
  const taskCount = processor.loadTasks();
  console.log(`📊 加载了 ${taskCount} 个任务\n`);
  
  if (taskCount === 0) {
    console.log('❌ 没有找到任务，请确保 task.json 文件存在且包含任务');
    return;
  }
  
  // 测试并行执行前3个任务
  console.log('\n🔬 测试并行执行前3个任务...');
  try {
    // 临时修改任务列表，只执行前3个任务进行测试
    const originalTasks = processor.tasks;
    processor.tasks = originalTasks.slice(0, 3);
    
    await processor.executeTasksParallel();
    
    console.log('✅ 并行执行测试成功');
    
    // 恢复原始任务列表
    processor.tasks = originalTasks;
    
  } catch (error) {
    console.error('❌ 并行执行测试失败:', error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('🧪 开始测试批量处理系统...\n');
  
  // 测试串行处理器
  await testBatchProcessor();
  
  // 测试并行处理器
  await testParallelProcessor();
  
  console.log('\n✅ 所有测试完成!');
}

// 运行测试
runTests().catch(console.error); 