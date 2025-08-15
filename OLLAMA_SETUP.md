# Ollama 服务配置指南

本文档说明如何配置 Ollama 服务以支持多设备访问。

## 问题背景

在开发环境中，前端应用需要访问 Ollama 服务，但由于 CORS（跨域资源共享）限制，直接访问外部 Ollama 服务会失败。本项目通过 Vite 开发服务器的代理功能解决这个问题。

## 解决方案

### 方法一：环境变量配置（推荐）

如果你的 Ollama 服务运行在非默认地址（非 `http://localhost:11434`），请按以下步骤配置：

1. **设置环境变量**：
   ```bash
   export OLLAMA_URL=http://你的IP地址:端口
   ```
   
   例如：
   ```bash
   export OLLAMA_URL=http://10.2.2.19:11345
   ```

2. **重启开发服务器**：
   ```bash
   npm run dev
   ```

### 方法二：.env 文件配置（持久化）

1. **创建 .env.local 文件**：
   ```bash
   touch .env.local
   ```

2. **添加配置**：
   ```bash
   echo "OLLAMA_URL=http://你的IP地址:端口" > .env.local
   ```

3. **重启开发服务器**：
   ```bash
   npm run dev
   ```

## 验证配置

配置完成后，应用会自动使用代理连接到你的 Ollama 服务。在浏览器开发者工具的控制台中，你应该看到类似的日志：

```
✅ 使用代理路径: /api/ollama/v1/chat/completions (基于用户配置: http://你的IP:端口)
🔄 代理请求: POST /api/ollama/v1/chat/completions -> 你的IP:端口/v1/chat/completions
✅ 代理响应: 200 /api/ollama/v1/chat/completions
```

## 智能连接策略

本项目实现了智能连接策略：

1. **开发环境**：优先使用 Vite 代理避免 CORS 问题
2. **代理失败时**：自动尝试直接连接（可能遇到 CORS 限制）
3. **错误提示**：提供详细的解决建议

## 常见问题

### Q: 仍然看到 CORS 错误怎么办？

A: 确保：
1. 已正确设置 `OLLAMA_URL` 环境变量
2. 已重启开发服务器
3. Ollama 服务在目标地址正常运行

### Q: 如何检查 Ollama 服务状态？

A: 运行以下命令：
```bash
# 检查 Ollama 服务状态
ollama list

# 启动 Ollama 服务（如果未启动）
ollama serve
```

### Q: 生产环境如何配置？

A: 生产环境需要确保：
1. Ollama 服务配置了正确的 CORS 头
2. 或者通过反向代理（如 Nginx）处理 CORS

## 技术细节

- 开发服务器代理路径：`/api/ollama/*`
- 代理目标：从 `OLLAMA_URL` 环境变量读取，默认 `http://localhost:11434`
- 支持的 API 格式：OpenAI 兼容 API 和标准 Ollama API