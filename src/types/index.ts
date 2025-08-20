export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  todoId: string;
  completedAt?: string; // ISO 8601 格式的完成时间戳
}

export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  subtasks: Subtask[];
  projectId: string;
  completedAt?: string; // ISO 8601 格式的完成时间戳
}

export type RiskStatus = 'high' | 'attention' | 'normal' | 'ahead' | 'paused' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  todos: Todo[];
  order: number; // 用于排序的权重字段
  riskStatus?: RiskStatus; // 项目风险状态：高风险(红色)、注意(橙色)、正常(绿色)、超前(蓝色)、暂停(灰色)、已完成(绿色圆环)
  urls?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

export type ProjectFilter = "all" | "active" | "completed";

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
  // AI报告生成配置
  aiReport?: {
    ollamaUrl: string;           // Ollama服务器URL
    modelName: string;           // AI模型名称
    temperature: number;         // 温度参数 (0-2)
  };
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

// 报告生成相关类型
export interface ReportData {
  dateRange: { start: string; end: string };
  completedItems: {
    projectName: string;
    riskStatus?: RiskStatus; // 项目风险状态
    todos: Array<{
      content: string;
      completedAt: string;
      subtasks: Array<{
        content: string;
        completedAt: string;
      }>;
    }>;
  }[];
  statistics: {
    totalProjects: number;
    totalTodos: number;
    totalSubtasks: number;
  };
}

// AI报告生成相关类型
export interface AIReportRequest {
  model: string;
  prompt: string;
  temperature: number;
  stream?: boolean;
}

export interface AIReportResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface AIReportConfig {
  ollamaUrl: string;
  modelName: string;
  temperature: number;
}

export interface GenerateReportResult {
  success: boolean;
  content?: string;
  error?: string;
}

// 状态转换工具函数
export const isProjectCompleted = (project: Project): boolean => {
  return project.riskStatus === 'completed';
};

export const getProjectCompletionStatus = (project: Project): boolean => {
  // 向后兼容：优先使用 riskStatus，回退到 isCompleted
  if (project.riskStatus) {
    return project.riskStatus === 'completed';
  }
  return project.isCompleted;
};

export const migrateProjectStatus = (project: Project): Project => {
  // 如果没有 riskStatus，根据 isCompleted 设置默认值
  if (!project.riskStatus) {
    return {
      ...project,
      riskStatus: project.isCompleted ? 'completed' : 'normal'
    };
  }
  return project;
};
