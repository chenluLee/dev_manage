# Development Workflow

## 本地开发环境设置
```bash
# 1. 克隆项目
git clone <repository-url>
cd dev-todo-tool

# 2. 安装开发工具（可选）
npm install -g live-server prettier

# 3. 启动本地开发服务器
live-server --host=localhost --port=3000

# 4. 或使用Python简单服务器
python -m http.server 3000
```

## 开发流程

### 分支策略
- **main**: 生产分支，稳定版本
- **develop**: 开发分支，功能集成
- **feature/***: 功能分支，新特性开发
- **hotfix/***: 紧急修复分支

### 代码提交规范
```bash
# 提交类型
feat: 新功能
fix: 问题修复
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具变动

# 提交示例
git commit -m "feat: 添加任务拖拽排序功能"
git commit -m "fix: 修复数据保存时的边界问题"
```

## 开发工具配置

### VS Code 扩展推荐
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ritwickdey.liveserver"
  ]
}
```

### Prettier 配置
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 测试策略

### 手动测试清单
- [ ] 基础功能测试（CRUD操作）
- [ ] 拖拽交互测试
- [ ] 数据持久化测试
- [ ] 跨浏览器兼容性测试
- [ ] 响应式设计测试
- [ ] 可访问性测试

### 自动化测试
```javascript
// 基础单元测试示例
function testTaskCreation() {
  const task = createTask('Test Task', 'high')
  assert(task.title === 'Test Task')
  assert(task.priority === 'high')
  assert(task.id !== null)
}
```

## 代码质量保证

### 代码检查
- **ESLint**: JavaScript代码质量检查
- **Prettier**: 代码格式化
- **HTML Validator**: HTML标准验证

### 性能检查
- **Lighthouse**: 性能、可访问性、SEO检查
- **Bundle Analyzer**: 代码包大小分析
- **Performance Monitor**: 运行时性能监控

## 发布流程
1. **代码审查**: PR review
2. **测试验证**: 自动化测试通过
3. **构建打包**: 生产环境构建
4. **部署上线**: 自动化部署
5. **监控检查**: 部署后健康检查