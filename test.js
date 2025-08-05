import { ElcAgent } from 'easy-llm-cli';
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-110624f89fbe41089c937edbed855742'
});

// Token统计类
class TokenTracker {
  constructor() {
    this.totalTokens = 0;
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.calls = 0;
  }

  addUsage(usage) {
    if (usage) {
      this.totalTokens += usage.total_tokens || 0;
      this.promptTokens += usage.prompt_tokens || 0;
      this.completionTokens += usage.completion_tokens || 0;
      this.calls++;
    }
  }

  getStats() {
    return {
      totalTokens: this.totalTokens,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      calls: this.calls,
      averageTokensPerCall: this.calls > 0 ? Math.round(this.totalTokens / this.calls) : 0
    };
  }

  reset() {
    this.totalTokens = 0;
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.calls = 0;
  }
}

// 创建一个支持持久对话的ElcAgent包装类
class PersistentElcAgent {
  constructor(agentConfig, first_prompt = null) {
    this.agentConfig = agentConfig;
    this.conversationHistory = [];
    this.currentAgent = null;
    this.supervisorAgent = null;
    this.taskCompleted = false;
    this.first_prompt = first_prompt;
    this.tokenTracker = new TokenTracker();
  }

  async chat(userInput) {
    // 添加用户输入到对话历史
    this.conversationHistory.push({ role: 'user', content: userInput });
    
    // 构建包含历史对话的完整提示
    const fullPrompt = this.buildFullPrompt();
    
    // 创建新的agent实例（因为原API每次都会重新初始化）
    this.currentAgent = new ElcAgent(this.agentConfig);
    
    try {
      // 发送完整对话给AI
      const response = await this.currentAgent.run(fullPrompt);
      
      // 尝试获取token使用情况（如果ElcAgent支持）
      try {
        const results = this.currentAgent.getAllResults();
        // 查找包含token信息的响应
        const tokenInfo = this.extractTokenInfo(results);
        if (tokenInfo) {
          this.tokenTracker.addUsage(tokenInfo);
        }
      } catch (e) {
        // 如果无法获取token信息，忽略错误
      }
      
      // 添加AI回复到对话历史
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // 检查任务是否完成
      const evaluation = await this.TaskEvaluation();
      const isTaskCompleted = evaluation && typeof evaluation === 'string' && evaluation.includes('任务已完成')
      
      if (isTaskCompleted) {
        this.taskCompleted = true;
        return [response + '\n\n检测信息：任务已完成', evaluation];
      }
      
      return [response, evaluation];
    } catch (error) {
      throw error;
    }
  }

  // 尝试从ElcAgent结果中提取token信息
  extractTokenInfo(results) {
    if (!results || !Array.isArray(results)) return null;
    
    // 查找包含token信息的响应
    for (const result of results) {
      if (result.type === 'content' && result.metadata && result.metadata.usage) {
        return result.metadata.usage;
      }
      if (result.usage) {
        return result.usage;
      }
    }
    return null;
  }

  async TaskEvaluation() {
    try {
      // 获取Agent完成的所有任务结果
      const allResults = this.currentAgent.getAllResults();

      // 构建评估提示
      const evaluationPrompt = this.buildEvaluationPrompt(allResults);

      // 创建监督者Agent来评估任务完成状态
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: evaluationPrompt }],
        model: "deepseek-chat",
      });
  
      const evaluation = completion.choices[0].message.content;
      
      // 记录评估调用的token使用情况
      if (completion.usage) {
        this.tokenTracker.addUsage(completion.usage);
      }
      
      return evaluation;
      
    } catch (error) {
      return '任务评估出错';
    }
  }

  buildEvaluationPrompt(allResults) {
    let prompt = `你是一个任务完成状态评估专家。请分析以下AI Agent的任务执行结果，判断任务是否已经完成。

任务的具体内容是:${this.first_prompt}

以下是AI Agent的执行结果：
`;

    // 添加所有结果到评估提示中
    allResults.forEach((result, index) => {
      if (result.type === 'content') {
        prompt += `\n${index + 1}. 内容输出: ${result.content}`;
      } else if (result.type === 'tool_call') {
        prompt += `\n${index + 1}. 工具调用: ${result.toolCall.name}`;
        prompt += `\n   参数: ${JSON.stringify(result.toolCall.args)}`;
        prompt += `\n   结果: ${JSON.stringify(result.toolCall.result)}`;
      } else if (result.type === 'error') {
        prompt += `\n${index + 1}. 错误: ${result.error}`;
      }
    });

    prompt += `

对话历史：
`;

    // 添加对话历史
    this.conversationHistory.forEach((msg, index) => {
      prompt += `\n${index + 1}. ${msg.role}: ${msg.content}`;
    });

    prompt += `

请仔细分析以上信息，判断：
1. 用户最初提出的任务是什么？
2. AI Agent是否已经完成了这个任务？
3. 是否还有未完成的部分？

如果你认为任务仍然没有完成，请你参照最初的任务和AI Agent作出的回应来指导接下来的行动，来完成任务。
注意，如果AI Agent向你询问有关任务的细节需求，请你根据自己的喜好给出一个详细的回答来让AI Agent更好的完成任务。

如果你认为任务已经完成，请回答"任务已完成"。
你的回答：`;

    return prompt;
  }

  buildFullPrompt() {
    // 构建包含历史对话的完整提示
    let prompt = '';
    
    // 添加系统提示（可选）
    prompt += '你是一个有用的AI助手。请基于以下对话历史来回答用户的问题：\n\n';
    
    // 添加对话历史
    this.conversationHistory.forEach((msg) => {
      if (msg.role === 'user') {
        prompt += `用户: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `助手: ${msg.content}\n`;
      }
    });
    
    // 添加当前用户输入
    const currentUserInput = this.conversationHistory[this.conversationHistory.length - 1].content;
    prompt += `用户: ${currentUserInput}\n助手: `;
    
    return prompt;
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
    this.taskCompleted = false;
  }

  isTaskCompleted() {
    return this.taskCompleted;
  }

  getTokenStats() {
    return this.tokenTracker.getStats();
  }

  async end() {
    // 清理资源
    if (this.currentAgent) {
      // 原ElcAgent会在run方法结束时自动清理
      this.currentAgent = null;
    }
    if (this.supervisorAgent) {
      this.supervisorAgent = null;
    }
  }
}

// 创建非交互式任务执行函数
export async function executeTask(dir = process.cwd(), first_prompt, onStatusUpdate = null) {
  const agent = new PersistentElcAgent({
    model: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    apiKey: 'ms-0948ee73-16b4-4c95-8a1c-5cdcf2afa85b',
    endpoint: 'https://api-inference.modelscope.cn/v1',
    log: false,
    rootPath: dir,
  }, first_prompt);

  let evaluation = null;
  let lastResponse = null;
  let iterationCount = 0;
  const maxIterations = 10; // 防止无限循环
  
  if (first_prompt) {
    if (onStatusUpdate) onStatusUpdate('开始处理初始任务...');
    const [response, initialEvaluation] = await agent.chat(first_prompt);
    lastResponse = response;
    evaluation = initialEvaluation;
    iterationCount++;
  }

  try {
    while (iterationCount < maxIterations) {
      if (evaluation && evaluation.includes('任务已完成')){
        if (onStatusUpdate) onStatusUpdate('任务已完成');
        const tokenStats = agent.getTokenStats();
        return { 
          status: 'completed', 
          iterations: iterationCount,
          tokenStats: tokenStats,
          lastResponse: lastResponse,
          lastEvaluation: evaluation
        };
      }
      
      try {
        if (onStatusUpdate) onStatusUpdate(`第 ${iterationCount + 1} 轮评估中...`);
        const [response, new_evaluation] = await agent.chat(evaluation);
        lastResponse = response;
        evaluation = new_evaluation;
        iterationCount++;
        
        // 检查任务是否完成
        if (agent.isTaskCompleted()) {
          if (onStatusUpdate) onStatusUpdate('任务已完成');
          const tokenStats = agent.getTokenStats();
          return { 
            status: 'completed', 
            iterations: iterationCount,
            tokenStats: tokenStats,
            lastResponse: lastResponse,
            lastEvaluation: evaluation
          };
        }
      } catch (error) {
        if (onStatusUpdate) onStatusUpdate(`错误: ${error.message}`);
        const tokenStats = agent.getTokenStats();
        return { 
          status: 'error', 
          error: error.message, 
          iterations: iterationCount,
          tokenStats: tokenStats,
          lastResponse: lastResponse,
          lastEvaluation: evaluation
        };
      }
    }
    
    if (onStatusUpdate) onStatusUpdate('达到最大迭代次数，任务未完成');
    const tokenStats = agent.getTokenStats();
    return { 
      status: 'timeout', 
      iterations: iterationCount,
      tokenStats: tokenStats,
      lastResponse: lastResponse,
      lastEvaluation: evaluation
    };
  } finally {
    await agent.end();
  }
}

// 保持原有的交互式函数用于测试
export async function interactiveChat(dir = process.cwd(), first_prompt) {
  const agent = new PersistentElcAgent({
    model: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    apiKey: 'ms-0948ee73-16b4-4c95-8a1c-5cdcf2afa85b',
    endpoint: 'https://api-inference.modelscope.cn/v1',
    log: false,
    rootPath: dir,
  }, first_prompt);

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    return new Promise((resolve) => {
      rl.question('你: ', (input) => {
        resolve(input.trim());
      });
    });
  };

  let evaluation = null;
  
  if (first_prompt) {
    console.log('AI正在处理初始任务...');
    const [response, initialEvaluation] = await agent.chat(first_prompt);
    console.log(`检测信息：${initialEvaluation}\n`);
    evaluation = initialEvaluation;
  }

  try {
    while (true) {
      if (evaluation && evaluation.includes('任务已完成')){
        console.log('任务已完成，对话结束。');
        break;
      }
      try {
        const [response, new_evaluation] = await agent.chat(evaluation);
        console.log(`检测信息：${new_evaluation}\n`);
        evaluation = new_evaluation;
        // 检查任务是否完成
        if (agent.isTaskCompleted()) {
          console.log('任务已完成，对话结束。');
          break;
        }
      } catch (error) {
        console.error('AI回复出错:', error.message);
      }
    }
  } finally {
    rl.close();
    await agent.end();
  }
}

// 运行交互式对话（保持原有功能）
if (process.argv[1] === new URL(import.meta.url).pathname) {
  interactiveChat(process.cwd(), "帮我写一个背单词的软件").catch(console.error);
}
