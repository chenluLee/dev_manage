# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite 的独立开发者项目管理工具。主要功能包括项目卡片管理、待办事项管理、子任务管理、拖拽排序、数据导入导出等。项目采用 shadcn/ui 组件库和 Tailwind CSS 进行 UI 开发。

## 常用开发命令

### 启动和构建
- `npm run dev` - 启动开发服务器 (http://localhost:8080)
- `npm run build` - 生产构建
- `npm run build:dev` - 开发模式构建
- `npm run preview` - 预览构建结果

### 代码质量和测试
- `npm run lint` - 运行 ESLint 检查
- `npm test` - 运行所有测试 (Vitest)
- `npm run test:run` - 运行测试一次
- `npm run test:coverage` - 运行测试并生成覆盖率报告
- `npm run test:ui` - 启动测试 UI 界面

## 架构和代码结构

### 核心目录结构
- `src/components/` - React 组件
  - `ui/` - shadcn/ui 基础组件
  - 业务组件如 ProjectCard, TodoList, SettingsModal 等
- `src/hooks/` - 自定义 React Hooks
- `src/managers/` - 业务逻辑管理器 (ProjectManager, StorageManager)
- `src/types/` - TypeScript 类型定义
- `src/utils/` - 工具函数
- `src/pages/` - 页面组件

### 核心数据模型
- `Project` - 项目实体，包含 todos 数组
- `Todo` - 待办事项，包含 subtasks 数组  
- `Subtask` - 子任务
- `AppSettings` - 应用设置和用户偏好

### 状态管理
使用自定义 hooks 进行状态管理：
- `useProjects` - 项目和待办事项的 CRUD 操作
- `useUserPreferences` - 用户偏好设置
- `useStoragePath` - 存储路径管理

### 拖拽功能
使用 @dnd-kit 库实现拖拽排序：
- 项目横向拖拽排序
- 待办事项纵向拖拽排序  
- 子任务拖拽排序

### 数据持久化
- 默认使用 localStorage 存储
- 支持用户自定义存储路径
- 提供数据导入导出功能 (JSON 格式)
- 包含备份和恢复机制

## 开发规范

### 组件开发
- 使用 TypeScript 进行严格类型检查
- 组件文件放在对应的目录下，使用 PascalCase 命名
- 优先使用 shadcn/ui 组件库中的基础组件
- 自定义组件需要添加相应的测试文件

### 样式规范
- 使用 Tailwind CSS 进行样式开发
- 避免内联样式，使用 Tailwind 类名
- 遵循响应式设计原则，支持移动端

### 测试要求
- 为新增的业务逻辑编写单元测试
- 测试文件放在 `src/__tests__/` 目录下
- 使用 Vitest + Testing Library 进行测试
- 确保测试覆盖率满足要求

### 类型安全
- 所有新增的数据结构都要在 `src/types/index.ts` 中定义类型
- 使用严格的 TypeScript 配置，避免 any 类型
- API 调用和数据处理都要有类型保护

## 重要注意事项

### 错误处理
- 所有异步操作都要有适当的错误处理
- 用户界面要显示友好的错误信息
- 数据操作失败时要有回滚机制

### 性能考虑
- 大量数据时考虑虚拟滚动或分页
- 使用适当的防抖和节流
- 避免不必要的重新渲染

### 数据兼容性
- 新增字段时要考虑向后兼容性
- 数据导入时要验证数据格式
- 版本升级要有数据迁移方案

## 调试和开发工具

### 浏览器开发工具
- React Developer Tools
- Redux DevTools (如果使用)
- 网络面板用于调试存储操作

### VS Code 配置
- 已配置路径别名 `@` 指向 `src` 目录
- ESLint 和 Prettier 集成
- TypeScript 严格模式