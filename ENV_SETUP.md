# 环境变量配置说明

## 快速设置

1. **复制环境变量模板**
   ```bash
   cp .env.example .env
   ```

2. **编辑 `.env` 文件**
   将你的实际API密钥填入：
   ```bash
   # API配置
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_API_KEY=你的DeepSeek_API密钥
   
   MODELSCOPE_MODEL=Qwen/Qwen3-Coder-480B-A35B-Instruct
   MODELSCOPE_API_KEY=你的ModelScope_API密钥
   MODELSCOPE_ENDPOINT=https://api-inference.modelscope.cn/v1
   ```

3. **验证配置**
   ```bash
   node -e "import('./PackedAgent.js').then(m => console.log('配置加载成功'))"
   ```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_BASE_URL` | DeepSeek API基础URL | `https://api.deepseek.com` |
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | 需要设置 |
| `MODELSCOPE_MODEL` | ModelScope模型名称 | `Qwen/Qwen3-Coder-480B-A35B-Instruct` |
| `MODELSCOPE_API_KEY` | ModelScope API密钥 | 需要设置 |
| `MODELSCOPE_ENDPOINT` | ModelScope API端点 | `https://api-inference.modelscope.cn/v1` |

## 安全提醒

- ✅ `.env` 文件已添加到 `.gitignore`，不会被提交到Git
- ✅ 使用环境变量避免硬编码敏感信息
- ⚠️ 请妥善保管你的API密钥
- ⚠️ 不要将 `.env` 文件分享给他人

## 故障排除

如果遇到配置问题：
1. 检查 `.env` 文件是否存在
2. 确认API密钥格式正确
3. 验证网络连接正常 