# Frontend Architecture

## Component Architecture
**架构模式：** 模块化MVC，每个组件自包含

**目录结构：**
```
scripts/
├── app.js              # 应用入口和路由
├── components/
│   ├── ProjectCard.js
│   ├── TodoList.js
│   ├── TodoItem.js
│   └── SettingsModal.js
├── managers/
│   ├── ProjectManager.js
│   ├── TodoManager.js
│   ├── StorageManager.js
│   └── DragDropManager.js
├── utils/
│   ├── dom.js
│   ├── storage.js
│   └── validation.js
└── config.js
```

## State Management
**方案：** 简单的发布-订阅模式，避免过度复杂化

```javascript
class StateManager {
  constructor() {
    this.state = {};
    this.listeners = {};
  }
  
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
  
  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
  }
}
```

## Routing Architecture
**方案：** 单页面应用，基于锚点的简单路由

**路由规则：**
- `#/` - 默认首页，显示活跃项目
- `#/completed` - 显示完成项目
- `#/settings` - 设置页面
