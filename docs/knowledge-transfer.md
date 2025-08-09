# 独立开发者Todo工具 - 知识转移文档

## 文档概述

本文档旨在为项目的新团队成员、维护者和贡献者提供全面的知识转移，确保项目的可持续发展和维护。

## 项目核心信息

### 项目愿景
为独立开发者打造一个轻量级、直观的项目和任务管理工具，专注于核心功能，避免过度复杂化。

### 核心价值主张
- **极简设计**：零依赖，500KB以内包大小
- **数据隐私**：完全本地存储，用户拥有数据完全控制权
- **多设备同步**：通过File System Access API支持云盘同步
- **开发者友好**：专门针对独立开发者的工作流程优化

## 技术架构知识转移

### 核心技术栈
```
Frontend: HTML5 + CSS3 + 原生JavaScript (ES2020+)
存储: File System Access API + IndexedDB (后备)
测试: QUnit (单元测试) + Puppeteer (集成测试)
部署: 静态文件托管 (Netlify/Vercel/GitHub Pages)
```

### 架构设计原则
1. **零依赖原则**：不引入第三方框架或库
2. **渐进式增强**：在新API不支持时优雅降级
3. **模块化设计**：清晰的组件和服务分离
4. **性能优先**：虚拟滚动、懒加载等优化策略

### 关键技术决策
参考 `docs/decision-history.md` 了解详细的技术决策背景和考量。

#### 重要的设计模式
1. **MVC架构**：Model(数据层) + View(DOM) + Controller(业务逻辑)
2. **发布-订阅模式**：组件间通信和状态管理
3. **策略模式**：存储方案的切换（File System vs IndexedDB）
4. **单例模式**：全局管理器（StorageManager, StateManager等）

## 代码结构和组织

### 目录结构说明
```
src/
├── components/          # UI组件
│   ├── ProjectCard.tsx  # 项目卡片组件
│   ├── TodoList.tsx     # 任务列表组件
│   └── ...
├── hooks/               # 自定义hooks
│   ├── useProjects.ts   # 项目管理hook
│   ├── useDragDrop.ts   # 拖拽功能hook
│   └── ...
├── types/               # TypeScript类型定义
└── ...

docs/
├── prd.md              # 产品需求文档
├── architecture.md     # 技术架构文档
├── front-end-spec.md   # 前端规范
├── user-guide.md       # 用户指南
├── decision-history.md # 决策历史记录
└── knowledge-transfer.md # 本文档
```

### 核心模块说明

#### 1. 数据模型 (Types)
```typescript
// 核心数据结构
Project: 项目基本信息 + URLs + 任务列表
Todo: 任务信息 + 子任务 + 状态管理
Subtask: 子任务基本信息
AppData: 应用全局数据结构
AppSettings: 用户设置
```

#### 2. 存储层 (StorageManager)
- **主存储**：File System Access API
- **后备存储**：IndexedDB
- **功能**：CRUD操作、备份恢复、导入导出

#### 3. 业务逻辑层 (Managers)
- **ProjectManager**：项目CRUD、排序、状态管理
- **TodoManager**：任务CRUD、状态变更、子任务管理
- **DragDropManager**：拖拽交互统一管理
- **StateManager**：全局状态管理和组件通信

#### 4. UI组件层 (Components)
- **ProjectCard**：项目卡片，包含任务列表
- **TodoList/TodoItem**：任务管理组件
- **SettingsModal**：设置弹窗
- **OnboardingManager**：用户引导流程

## 开发工作流程

### 本地开发环境设置
```bash
# 1. 克隆项目
git clone [repository-url]
cd todo-tool

# 2. 启动开发服务器
# 方式1：使用VS Code Live Server扩展
# 方式2：使用Python
python -m http.server 8080
# 方式3：使用Node.js
npx serve .

# 3. 访问应用
open http://localhost:8080
```

### 代码规范
- **JavaScript**：ES6+ 语法，async/await异步处理
- **CSS**：BEM命名规范，CSS变量，8px网格系统
- **HTML**：语义化标签，ARIA无障碍属性

### 测试策略
```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 手动测试检查清单
- 拖拽功能在所有目标浏览器
- File System Access API权限流程
- 响应式设计在不同设备
- 键盘导航和无障碍功能
```

### 发布流程
1. **代码审查**：确保符合编码规范
2. **测试验证**：运行所有自动化测试
3. **版本标记**：更新版本号和变更日志
4. **静态部署**：推送到托管平台
5. **用户通知**：更新文档和发布说明

## 功能模块深入理解

### 拖拽功能实现
```javascript
// 核心实现原理
1. HTML5 Drag API事件监听
2. 拖拽状态管理和视觉反馈
3. 位置计算和重新排序
4. 跨项目任务移动
5. 键盘操作作为无障碍替代
```

**注意事项：**
- 移动端兼容性限制
- 需要处理边界情况和错误状态
- 性能优化避免频繁DOM操作

### 存储机制详解
```javascript
// 存储策略决策流程
1. 检测File System Access API支持
2. 用户授权文件系统访问
3. 优雅降级到IndexedDB
4. 数据同步和冲突处理
```

**关键考虑：**
- 浏览器兼容性处理
- 权限请求用户体验
- 数据迁移和备份策略

### 用户引导系统
6步交互式引导流程：
1. 欢迎介绍（30s）
2. 存储设置（30s）
3. 创建项目（30s）
4. 添加任务（30s）
5. 拖拽演示（20s）
6. 完成引导（20s）

## 常见问题和解决方案

### 开发常见问题

#### Q: 如何调试File System Access API问题？
A: 
```javascript
// 检查API支持
if ('showDirectoryPicker' in window) {
  // 支持File System Access API
} else {
  // 降级到IndexedDB
}

// 调试工具
window.TodoToolDebug.exportState()
```

#### Q: 如何处理拖拽在不同浏览器的表现差异？
A: 
1. 测试目标浏览器的拖拽事件触发顺序
2. 使用统一的事件处理函数
3. 提供键盘操作替代方案
4. 详细的浏览器兼容性测试

#### Q: 性能优化的关键点？
A:
1. 虚拟滚动处理大量任务
2. 防抖处理用户输入和自动保存
3. 避免频繁的DOM查询和操作
4. 合理使用CSS动画避免重排

### 用户支持常见问题

#### Q: 用户数据丢失怎么办？
A: 
1. 检查自动备份文件
2. 查看浏览器IndexedDB数据
3. 从导出的JSON文件恢复
4. 指导用户正确的数据同步设置

#### Q: 浏览器不支持文件选择功能？
A: 
1. 确认浏览器版本是否支持File System Access API
2. 解释降级到本地存储的影响
3. 提供浏览器升级建议
4. 演示基本功能仍然可用

## 扩展和维护指南

### 添加新功能
1. **评估影响**：确保不破坏现有功能和性能目标
2. **设计文档**：更新架构文档和API规范
3. **实现开发**：遵循现有代码规范和架构模式
4. **测试验证**：添加相应的单元测试和集成测试
5. **文档更新**：更新用户指南和技术文档

### 性能监控
关键指标：
- 首屏加载时间 < 2秒
- 交互响应时间 < 100ms
- 内存使用 < 100MB
- 包大小 < 500KB

### 安全考虑
- XSS防护：严格的输入验证和输出编码
- 数据完整性：导入数据验证和错误处理
- 隐私保护：确保数据不会意外泄露

## 联系和支持

### 项目相关人员
- **产品负责人**：Sarah (PO) - 产品决策和用户体验
- **架构师**：Winston - 技术架构和系统设计
- **UX专家**：负责用户界面和交互设计

### 文档和资源
- **代码仓库**：[GitHub链接]
- **部署地址**：[应用链接]
- **用户反馈**：[Issues链接]
- **技术讨论**：[Discussions链接]

### 学习资源
推荐阅读：
- [File System Access API MDN文档](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [HTML5 Drag and Drop API指南](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Web无障碍WCAG指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [性能优化最佳实践](https://web.dev/performance/)

## 版本历史和变更

### v1.0 (计划)
- 基础项目和任务管理
- 拖拽排序功能
- 本地存储和导入导出
- URL快速访问
- 用户引导系统

### v1.1 (规划)
- 标签系统（基于用户反馈）
- 高级搜索和筛选
- 移动端体验优化
- 性能进一步优化

### 长期规划
基于用户需求和反馈：
- 多用户协作功能
- 数据统计和报告
- 插件系统扩展
- 移动原生应用

## 结语

这个项目体现了"少即是多"的设计哲学，通过精心的技术选择和功能取舍，为独立开发者提供了一个真正实用的工具。

新的团队成员应该：
1. **理解用户**：深入了解独立开发者的工作方式和痛点
2. **保持简洁**：任何新功能都要经过MVP价值评估
3. **重视性能**：确保工具始终轻量级和响应迅速
4. **关注隐私**：用户数据安全和隐私是不可妥协的核心原则

欢迎为项目贡献，让我们一起为独立开发者社区创造更好的工具！

---

**文档维护：** 请在重要变更后及时更新此文档  
**最后更新：** 2025-08-09  
**维护者：** Sarah (PO)