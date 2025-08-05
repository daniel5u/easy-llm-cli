# AI批处理任务执行系统

一个基于Easy LLM CLI的智能批处理系统，支持并行执行多个AI任务，自动管理API调用和资源分配。

## 🚀 主要功能

- **并行任务执行** - 支持多任务并发处理，提高执行效率
- **智能任务管理** - 自动任务分配、状态监控和错误处理
- **API资源优化** - 智能控制并发数量，避免API限制
- **Token使用统计** - 详细记录API调用和Token消耗
- **结果持久化** - 自动保存执行结果和统计信息
- **环境变量配置** - 安全的API密钥管理



## 工作流程

工作主体是调用了Easy-LLM-CLI的ElcAgent方式，封装了一个PersistantElcAgent来实现多轮对话，将任务设置到Coder Agent和Eval Agent的prompt中，并且让Eval Agent自行评估Coder Agent的任务完成情况，同时如果Coder Agent对于任务的需求不明确，Eval Agent也会自动生成提示让其继续任务。

在Coder Agent上建议选择Qwen-3-coder等coding模型，在测试过程中发现DeepSeek-R1等推理模型对于工具使用的效果很差，完成任务的时间很长。

在Eval Agent的选择上可以自行选择，默认使用的是DeepSeek-V3

![picture](file:///Users/danielsu/Study/easy-llm-cli/picture.png)



## 📋 系统组件

### 核心脚本

| 文件 | 功能 | 说明 |
|------|------|------|
| `PackedAgent.js` | AI代理封装 | 支持持久对话和任务评估 |
| `parallel-batch.js` | 并行批处理器 | 管理并发任务执行 |
| `run.js` | 交互式启动器 | 用户友好的命令行界面 |

### 配置文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `.env` | 环境变量配置 | 存储API密钥等敏感信息 |
| `task.json` | 任务定义文件 | 定义要执行的AI任务 |
| `parallel_batch_results.json` | 执行结果 | 自动生成的执行报告 |

## 🛠️ 快速开始

### 1. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件，填入你的API密钥
nano .env
```

环境变量配置：
```bash
# Eval Agent配置
EVALUATION_BASE_URL=https://api.deepseek.com(可自行更改)
EVALUATION_API_KEY=你的DeepSeek_API密钥

# Coder Agent配置  
CODER_MODEL=Qwen/Qwen3-Coder-480B-A35B-Instruct（可自行更改，建议使用Coder模型）
CODER_API_KEY=你的ModelScope_API密钥
CODER_ENDPOINT=https://api-inference.modelscope.cn/v1
```

### 2. 定义任务

创建 `task.json` 文件：
```json
{
  "tasks": [
    {
      "dir": "./project1",
      "first_prompt": "帮我优化这个React组件的性能"
    },
    {
      "dir": "./project2", 
      "first_prompt": "为这个Python脚本添加错误处理"
    },
    {
      "dir": "./project3",
      "first_prompt": "重构这个Java类，提高代码可读性"
    }
  ]
}
```

### 3. 执行批处理

```bash
# 交互式启动（推荐）
node run.js
```

## ⚙️ 并发配置

目前没有测试高于10的并发数，过高可能会导致API Key访问受限。  
*同时，选择Qwen-3-Coder的原因也是其支持比较高的并发数，在测试Gemini的时候经常会出现fetch error*


## 📊 执行监控

### 实时状态

```
🚀 开始并行执行 (并发数: 3)...
[14:30:15] 任务 1/5: 开始处理初始任务...
[14:30:18] 任务 2/5: 第 1 轮评估中...
✅ 任务 1 完成 (耗时: 45.12s) [1/5]
📊 状态: completed, 迭代次数: 3
💾 Token使用: 总计1,890 (输入1,200, 输出690) - 3次调用
```

### 结果统计

执行完成后会生成详细报告：
- 任务完成率统计
- Token使用情况分析
- 执行时间对比
- 错误原因分析

## 🔧 高级配置

### 自定义模型

在 `PackedAgent.js` 中修改模型配置：
```javascript
const agent = new PersistentElcAgent({
  model: process.env.MODELSCOPE_MODEL,
  apiKey: process.env.MODELSCOPE_API_KEY,
  endpoint: process.env.MODELSCOPE_ENDPOINT,
  // 其他配置...
});
```

### 任务评估

系统使用独立的评估模型来判断任务完成状态：
```javascript
const evaluation = await this.TaskEvaluation();
if (evaluation.includes('任务已完成')) {
  // 任务完成处理
}
```
## 🛡️ 安全特性

- ✅ 环境变量管理敏感信息
- ✅ `.env` 文件被Git忽略
- ✅ API密钥不暴露在代码中
- ✅ 支持多环境配置

## 🔍 故障排除

### 常见问题

1. **API限制错误**
   ```bash
   # 降低并发数量
   # 检查API配额
   # 验证API密钥
   ```

2. **任务超时**
   ```bash
   # 增加最大迭代次数
   # 优化任务描述
   # 检查网络连接
   ```

3. **配置错误**
   ```bash
   # 验证.env文件格式
   # 检查环境变量名称
   # 确认API端点可访问
   ```

### 调试模式

启用详细日志：
```javascript
log: true, // 在PackedAgent配置中启用
```

## 📚 相关文档

- [环境变量配置](./ENV_SETUP.md) - 详细的配置说明
- [批处理使用指南](./BATCH_README.md) - 完整的使用教程
- [API限制说明](./docs/quota-and-pricing.md) - 各平台API限制

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个批处理系统！

---

**注意**: 请确保妥善保管你的API密钥，不要将 `.env` 文件提交到版本控制系统。

