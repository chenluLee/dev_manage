# Components

## Core Components

### 1. ProjectCard Component (项目卡片组件)
**功能：** 完整的项目管理单元，包含项目信息、状态管理和任务展示

**主要特性：**
- 项目基本信息展示和编辑
- 项目状态切换（活跃/完成）
- 嵌套任务列表管理
- 拖拽排序支持
- URL快速访问

### 2. TodoList Component (任务列表组件)
**功能：** 管理项目下的所有任务，支持完整的CRUD操作

**主要特性：**
- 任务的增删改查
- 任务状态管理
- 拖拽排序
- 子任务管理

### 3. DragDropManager (拖拽管理器)
**功能：** 统一管理所有拖拽交互，确保一致的用户体验

**主要特性：**
- HTML5 Drag & Drop API封装
- 项目卡片拖拽排序
- 任务拖拽排序
- 跨项目任务移动

### 4. StorageManager (存储管理器)
**功能：** 统一管理数据持久化，支持多种存储方式

**主要特性：**
- File System Access API集成
- IndexedDB后备存储
- 数据导入导出
- 自动备份机制
