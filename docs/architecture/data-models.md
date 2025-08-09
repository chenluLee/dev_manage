# Data Models

## Project Model (项目模型)
```typescript
interface Project {
  id: string;                    // 唯一标识符
  name: string;                  // 项目名称
  description?: string;          // 项目描述
  status: 'active' | 'completed'; // 项目状态
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  order: number;                 // 排序权重
  urls?: ProjectUrl[];           // 快速访问链接
  tags?: string[];               // 项目标签
  todos: Todo[];                 // 嵌套任务列表
}

interface ProjectUrl {
  name: string;                  // 链接名称
  url: string;                   // 链接地址
  icon?: string;                 // 图标
}
```

## Todo Model (任务模型)
```typescript
interface Todo {
  id: string;                    // 唯一标识符
  content: string;               // 任务内容
  status: 'pending' | 'in-progress' | 'completed'; // 任务状态
  priority: 'low' | 'medium' | 'high'; // 优先级
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  order: number;                 // 排序权重
  tags?: string[];               // 任务标签
  subtasks?: Subtask[];          // 子任务列表
}
```

## Subtask Model (子任务模型)
```typescript
interface Subtask {
  id: string;                    // 唯一标识符
  content: string;               // 子任务内容
  status: 'pending' | 'completed'; // 子任务状态
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  order: number;                 // 排序权重
}
```

## Application Data Model (应用数据模型)
```typescript
interface AppData {
  version: string;               // 数据格式版本
  projects: Project[];           // 项目列表
  settings: AppSettings;         // 应用设置
  metadata: {
    createdAt: Date;
    lastModified: Date;
    totalProjects: number;
    totalTodos: number;
  };
}

interface AppSettings {
  storagePath?: string;          // 存储路径
  theme: 'light' | 'dark' | 'auto'; // 主题设置
  autoSave: boolean;             // 自动保存
  showCompletedProjects: boolean; // 显示完成项目
}
```
