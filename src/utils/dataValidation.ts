import { AppData, Project, Todo, Subtask, AppSettings } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationContext {
  checkIds: boolean; // 检查ID唯一性
  allowPartialData: boolean; // 允许部分数据
  strictMode: boolean; // 严格模式
}

const DEFAULT_VALIDATION_CONTEXT: ValidationContext = {
  checkIds: true,
  allowPartialData: false,
  strictMode: true
};

export class DataValidator {
  
  /**
   * 验证完整的AppData结构
   */
  static validateAppData(data: any, context: Partial<ValidationContext> = {}): ValidationResult {
    const ctx = { ...DEFAULT_VALIDATION_CONTEXT, ...context };
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // 基本类型检查
    if (!data || typeof data !== 'object') {
      result.errors.push('数据必须是一个有效对象');
      result.valid = false;
      return result;
    }

    // 版本字段检查
    if (!data.version || typeof data.version !== 'string') {
      result.errors.push('缺少版本字段或版本格式无效');
      result.valid = false;
    }

    // 项目数组检查
    if (!data.projects || !Array.isArray(data.projects)) {
      result.errors.push('缺少项目列表或项目列表格式无效');
      result.valid = false;
    } else {
      const projectValidation = this.validateProjects(data.projects, ctx);
      result.errors.push(...projectValidation.errors);
      result.warnings.push(...projectValidation.warnings);
      if (!projectValidation.valid) {
        result.valid = false;
      }
    }

    // 设置对象检查
    if (!data.settings || typeof data.settings !== 'object') {
      result.errors.push('缺少设置对象或设置格式无效');
      result.valid = false;
    } else {
      const settingsValidation = this.validateAppSettings(data.settings, ctx);
      result.errors.push(...settingsValidation.errors);
      result.warnings.push(...settingsValidation.warnings);
      if (!settingsValidation.valid) {
        result.valid = false;
      }
    }

    // 元数据检查
    if (!data.metadata || typeof data.metadata !== 'object') {
      result.errors.push('缺少元数据对象或元数据格式无效');
      result.valid = false;
    } else {
      const metadataValidation = this.validateMetadata(data.metadata, ctx);
      result.errors.push(...metadataValidation.errors);
      result.warnings.push(...metadataValidation.warnings);
      if (!metadataValidation.valid) {
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * 验证项目数组
   */
  static validateProjects(projects: any[], context: ValidationContext): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const projectIds = new Set<string>();

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const projectValidation = this.validateProject(project, context, i);
      
      result.errors.push(...projectValidation.errors);
      result.warnings.push(...projectValidation.warnings);
      
      if (!projectValidation.valid) {
        result.valid = false;
      }

      // ID唯一性检查
      if (context.checkIds && project?.id) {
        if (projectIds.has(project.id)) {
          result.errors.push(`项目ID重复: ${project.id}`);
          result.valid = false;
        } else {
          projectIds.add(project.id);
        }
      }
    }

    return result;
  }

  /**
   * 验证单个项目
   */
  static validateProject(project: any, context: ValidationContext, index?: number): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = index !== undefined ? `项目 ${index + 1}` : '项目';

    if (!project || typeof project !== 'object') {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!project.id || typeof project.id !== 'string') {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!project.name || typeof project.name !== 'string') {
      result.errors.push(`${prefix}: 缺少名称字段或名称格式无效`);
      result.valid = false;
    }

    if (typeof project.isCompleted !== 'boolean') {
      result.errors.push(`${prefix}: 完成状态字段格式无效`);
      result.valid = false;
    }

    // 日期字段检查
    if (project.createdAt && !this.isValidDateString(project.createdAt)) {
      result.warnings.push(`${prefix}: 创建时间格式可能无效`);
    }

    if (project.updatedAt && !this.isValidDateString(project.updatedAt)) {
      result.warnings.push(`${prefix}: 更新时间格式可能无效`);
    }

    // Todo列表检查
    if (!project.todos || !Array.isArray(project.todos)) {
      result.errors.push(`${prefix}: 任务列表格式无效`);
      result.valid = false;
    } else {
      const todoValidation = this.validateTodos(project.todos, context, project.name);
      result.errors.push(...todoValidation.errors);
      result.warnings.push(...todoValidation.warnings);
      if (!todoValidation.valid) {
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * 验证Todo数组
   */
  static validateTodos(todos: any[], context: ValidationContext, projectName?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const todoIds = new Set<string>();

    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i];
      const todoValidation = this.validateTodo(todo, context, i, projectName);
      
      result.errors.push(...todoValidation.errors);
      result.warnings.push(...todoValidation.warnings);
      
      if (!todoValidation.valid) {
        result.valid = false;
      }

      // ID唯一性检查
      if (context.checkIds && todo?.id) {
        if (todoIds.has(todo.id)) {
          result.errors.push(`任务ID重复: ${todo.id} (项目: ${projectName})`);
          result.valid = false;
        } else {
          todoIds.add(todo.id);
        }
      }
    }

    return result;
  }

  /**
   * 验证单个Todo
   */
  static validateTodo(todo: any, context: ValidationContext, index?: number, projectName?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = `任务 ${index !== undefined ? index + 1 : ''}${projectName ? ` (项目: ${projectName})` : ''}`;

    if (!todo || typeof todo !== 'object') {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!todo.id || typeof todo.id !== 'string') {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!todo.text || typeof todo.text !== 'string') {
      result.errors.push(`${prefix}: 缺少文本字段或文本格式无效`);
      result.valid = false;
    }

    if (typeof todo.isCompleted !== 'boolean') {
      result.errors.push(`${prefix}: 完成状态字段格式无效`);
      result.valid = false;
    }

    // 子任务检查
    if (todo.subtasks && Array.isArray(todo.subtasks)) {
      const subtaskValidation = this.validateSubtasks(todo.subtasks, context, todo.text);
      result.errors.push(...subtaskValidation.errors);
      result.warnings.push(...subtaskValidation.warnings);
      if (!subtaskValidation.valid) {
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * 验证子任务数组
   */
  static validateSubtasks(subtasks: any[], context: ValidationContext, todoText?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const subtaskIds = new Set<string>();

    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const subtaskValidation = this.validateSubtask(subtask, context, i, todoText);
      
      result.errors.push(...subtaskValidation.errors);
      result.warnings.push(...subtaskValidation.warnings);
      
      if (!subtaskValidation.valid) {
        result.valid = false;
      }

      // ID唯一性检查
      if (context.checkIds && subtask?.id) {
        if (subtaskIds.has(subtask.id)) {
          result.errors.push(`子任务ID重复: ${subtask.id} (任务: ${todoText})`);
          result.valid = false;
        } else {
          subtaskIds.add(subtask.id);
        }
      }
    }

    return result;
  }

  /**
   * 验证单个子任务
   */
  static validateSubtask(subtask: any, context: ValidationContext, index?: number, todoText?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = `子任务 ${index !== undefined ? index + 1 : ''}${todoText ? ` (任务: ${todoText})` : ''}`;

    if (!subtask || typeof subtask !== 'object') {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!subtask.id || typeof subtask.id !== 'string') {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!subtask.text || typeof subtask.text !== 'string') {
      result.errors.push(`${prefix}: 缺少文本字段或文本格式无效`);
      result.valid = false;
    }

    if (typeof subtask.isCompleted !== 'boolean') {
      result.errors.push(`${prefix}: 完成状态字段格式无效`);
      result.valid = false;
    }

    return result;
  }

  /**
   * 验证应用设置
   */
  static validateAppSettings(settings: any, context: ValidationContext): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!settings || typeof settings !== 'object') {
      result.errors.push('设置必须是有效对象');
      result.valid = false;
      return result;
    }

    // 主题设置检查
    if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
      result.errors.push('主题设置值无效，支持: light, dark, auto');
      result.valid = false;
    }

    // 布尔值检查
    if (settings.autoSave !== undefined && typeof settings.autoSave !== 'boolean') {
      result.errors.push('自动保存设置格式无效');
      result.valid = false;
    }

    if (settings.showCompletedProjects !== undefined && typeof settings.showCompletedProjects !== 'boolean') {
      result.errors.push('显示完成项目设置格式无效');
      result.valid = false;
    }

    return result;
  }

  /**
   * 验证元数据
   */
  static validateMetadata(metadata: any, context: ValidationContext): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!metadata || typeof metadata !== 'object') {
      result.errors.push('元数据必须是有效对象');
      result.valid = false;
      return result;
    }

    // 日期字段检查
    if (metadata.createdAt && !this.isValidDateString(metadata.createdAt)) {
      result.warnings.push('元数据创建时间格式可能无效');
    }

    if (metadata.lastModified && !this.isValidDateString(metadata.lastModified)) {
      result.warnings.push('元数据修改时间格式可能无效');
    }

    // 数字字段检查
    if (metadata.totalProjects !== undefined && (typeof metadata.totalProjects !== 'number' || metadata.totalProjects < 0)) {
      result.warnings.push('元数据项目总数格式无效');
    }

    if (metadata.totalTodos !== undefined && (typeof metadata.totalTodos !== 'number' || metadata.totalTodos < 0)) {
      result.warnings.push('元数据任务总数格式无效');
    }

    return result;
  }

  /**
   * 检查日期字符串格式
   */
  private static isValidDateString(dateStr: any): boolean {
    if (typeof dateStr !== 'string') return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * 数据清理和标准化
   */
  static sanitizeAppData(data: any): AppData {
    const sanitized = { ...data };

    // 确保版本字段
    if (!sanitized.version) {
      sanitized.version = '1.0.0';
    }

    // 清理项目数据
    if (Array.isArray(sanitized.projects)) {
      sanitized.projects = sanitized.projects.map((project: any, index: number) => 
        this.sanitizeProject(project, index)
      ).filter(Boolean);
    } else {
      sanitized.projects = [];
    }

    // 清理设置数据
    sanitized.settings = this.sanitizeAppSettings(sanitized.settings || {});

    // 清理元数据
    sanitized.metadata = this.sanitizeMetadata(sanitized.metadata || {});

    return sanitized as AppData;
  }

  private static sanitizeProject(project: any, index: number): Project | null {
    if (!project || typeof project !== 'object') return null;

    const sanitized: any = {};

    sanitized.id = project.id || `project-${Date.now()}-${index}`;
    sanitized.name = project.name || `未命名项目 ${index + 1}`;
    sanitized.description = project.description || '';
    sanitized.isCompleted = Boolean(project.isCompleted);
    sanitized.createdAt = project.createdAt || new Date().toISOString();
    sanitized.updatedAt = project.updatedAt || new Date().toISOString();

    // 清理Todo列表
    if (Array.isArray(project.todos)) {
      sanitized.todos = project.todos.map((todo: any, todoIndex: number) => 
        this.sanitizeTodo(todo, todoIndex, sanitized.id)
      ).filter(Boolean);
    } else {
      sanitized.todos = [];
    }

    return sanitized as Project;
  }

  private static sanitizeTodo(todo: any, index: number, projectId: string): Todo | null {
    if (!todo || typeof todo !== 'object') return null;

    const sanitized: any = {};

    sanitized.id = todo.id || `todo-${Date.now()}-${index}`;
    sanitized.text = todo.text || `未命名任务 ${index + 1}`;
    sanitized.isCompleted = Boolean(todo.isCompleted);
    sanitized.order = typeof todo.order === 'number' ? todo.order : index;
    sanitized.projectId = projectId;

    // 清理子任务
    if (Array.isArray(todo.subtasks)) {
      sanitized.subtasks = todo.subtasks.map((subtask: any, subtaskIndex: number) => 
        this.sanitizeSubtask(subtask, subtaskIndex, sanitized.id)
      ).filter(Boolean);
    } else {
      sanitized.subtasks = [];
    }

    return sanitized as Todo;
  }

  private static sanitizeSubtask(subtask: any, index: number, todoId: string): Subtask | null {
    if (!subtask || typeof subtask !== 'object') return null;

    return {
      id: subtask.id || `subtask-${Date.now()}-${index}`,
      text: subtask.text || `未命名子任务 ${index + 1}`,
      isCompleted: Boolean(subtask.isCompleted),
      order: typeof subtask.order === 'number' ? subtask.order : index,
      todoId: todoId
    };
  }

  private static sanitizeAppSettings(settings: any): AppSettings {
    return {
      storagePath: settings.storagePath || undefined,
      theme: ['light', 'dark', 'auto'].includes(settings.theme) ? settings.theme : 'auto',
      autoSave: Boolean(settings.autoSave),
      showCompletedProjects: Boolean(settings.showCompletedProjects)
    };
  }

  private static sanitizeMetadata(metadata: any): any {
    const now = new Date();
    return {
      createdAt: this.isValidDateString(metadata.createdAt) ? new Date(metadata.createdAt) : now,
      lastModified: this.isValidDateString(metadata.lastModified) ? new Date(metadata.lastModified) : now,
      totalProjects: typeof metadata.totalProjects === 'number' ? metadata.totalProjects : 0,
      totalTodos: typeof metadata.totalTodos === 'number' ? metadata.totalTodos : 0
    };
  }
}