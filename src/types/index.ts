export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  todoId: string;
}

export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  subtasks: Subtask[];
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  todos: Todo[];
  order: number; // 用于排序的权重字段
}

export type ProjectFilter = "active" | "completed";

export interface AppSettings {
  storagePath?: string;          // 存储路径
  theme: 'light' | 'dark' | 'auto'; // 主题设置
  autoSave: boolean;             // 自动保存
  showCompletedProjects: boolean; // 显示完成项目
  autoBackup: boolean;           // 自动备份
  backupInterval: number;        // 备份间隔（小时）
  lastBackupTime?: string;       // 上次备份时间 ISO
  // 新增用户偏好字段
  projectOrder: {id: string, order: number}[]; // 项目排序偏好
  collapsedProjects: string[];   // 折叠的项目ID列表
  searchHistory: string[];       // 搜索历史（最多5条）
  statusFilter: ('active' | 'completed')[]; // 状态筛选偏好
}

export interface BackupMetadata {
  filename: string;
  createdAt: Date;
  size: number;
  compressed: boolean;
  version: string;
  checksum?: string;
}

export interface BackupFile extends BackupMetadata {
  data: AppData;
}

export interface AppData {
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
