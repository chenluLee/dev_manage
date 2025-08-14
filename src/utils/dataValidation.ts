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

// 类型守卫函数
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export class DataValidator {
  
  /**
   * 验证完整的AppData结构
   */
  static validateAppData(data: unknown, context: Partial<ValidationContext> = {}): ValidationResult {
    const ctx = { ...DEFAULT_VALIDATION_CONTEXT, ...context };
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // 基本类型检查
    if (!isRecord(data)) {
      result.errors.push('数据必须是一个有效对象');
      result.valid = false;
      return result;
    }

    // 版本字段检查
    if (!data.version || !isString(data.version)) {
      result.errors.push('缺少版本字段或版本格式无效');
      result.valid = false;
    }

    // 项目数组检查
    if (!data.projects || !isArray(data.projects)) {
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
    if (!data.settings || !isRecord(data.settings)) {
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
    if (!data.metadata || !isRecord(data.metadata)) {
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
  static validateProjects(projects: unknown[], context: ValidationContext): ValidationResult {
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
      if (context.checkIds && isRecord(project) && isString(project.id)) {
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
  static validateProject(project: unknown, context: ValidationContext, index?: number): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = index !== undefined ? `项目 ${index + 1}` : '项目';

    if (!isRecord(project)) {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!project.id || !isString(project.id)) {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!project.name || !isString(project.name)) {
      result.errors.push(`${prefix}: 缺少名称字段或名称格式无效`);
      result.valid = false;
    }

    if (!isBoolean(project.isCompleted)) {
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
    if (!project.todos || !isArray(project.todos)) {
      result.errors.push(`${prefix}: 任务列表格式无效`);
      result.valid = false;
    } else {
      const todoValidation = this.validateTodos(project.todos, context, isString(project.name) ? project.name : undefined);
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
  static validateTodos(todos: unknown[], context: ValidationContext, projectName?: string): ValidationResult {
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
      if (context.checkIds && isRecord(todo) && isString(todo.id)) {
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
  static validateTodo(todo: unknown, context: ValidationContext, index?: number, projectName?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = `任务 ${index !== undefined ? index + 1 : ''}${projectName ? ` (项目: ${projectName})` : ''}`;

    if (!isRecord(todo)) {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!todo.id || !isString(todo.id)) {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!todo.text || !isString(todo.text)) {
      result.errors.push(`${prefix}: 缺少文本字段或文本格式无效`);
      result.valid = false;
    }

    if (!isBoolean(todo.isCompleted)) {
      result.errors.push(`${prefix}: 完成状态字段格式无效`);
      result.valid = false;
    }

    // 完成时间字段检查 (可选字段)
    if (todo.completedAt && !this.isValidDateString(todo.completedAt)) {
      result.warnings.push(`${prefix}: 完成时间格式可能无效`);
    }

    // 子任务检查
    if (todo.subtasks && isArray(todo.subtasks)) {
      const subtaskValidation = this.validateSubtasks(todo.subtasks, context, isString(todo.text) ? todo.text : undefined);
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
  static validateSubtasks(subtasks: unknown[], context: ValidationContext, todoText?: string): ValidationResult {
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
      if (context.checkIds && isRecord(subtask) && isString(subtask.id)) {
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
  static validateSubtask(subtask: unknown, _context: ValidationContext, index?: number, todoText?: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const prefix = `子任务 ${index !== undefined ? index + 1 : ''}${todoText ? ` (任务: ${todoText})` : ''}`;

    if (!isRecord(subtask)) {
      result.errors.push(`${prefix}: 不是有效对象`);
      result.valid = false;
      return result;
    }

    // 必需字段检查
    if (!subtask.id || !isString(subtask.id)) {
      result.errors.push(`${prefix}: 缺少ID字段或ID格式无效`);
      result.valid = false;
    }

    if (!subtask.text || !isString(subtask.text)) {
      result.errors.push(`${prefix}: 缺少文本字段或文本格式无效`);
      result.valid = false;
    }

    if (!isBoolean(subtask.isCompleted)) {
      result.errors.push(`${prefix}: 完成状态字段格式无效`);
      result.valid = false;
    }

    // 完成时间字段检查 (可选字段)
    if (subtask.completedAt && !this.isValidDateString(subtask.completedAt)) {
      result.warnings.push(`${prefix}: 完成时间格式可能无效`);
    }

    return result;
  }

  /**
   * 验证应用设置
   */
  static validateAppSettings(settings: unknown, _context: ValidationContext): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!isRecord(settings)) {
      result.errors.push('设置必须是有效对象');
      result.valid = false;
      return result;
    }

    // 主题设置检查
    if (settings.theme && (!isString(settings.theme) || !['light', 'dark', 'auto'].includes(settings.theme))) {
      result.errors.push('主题设置值无效，支持: light, dark, auto');
      result.valid = false;
    }

    // 布尔值检查
    if (settings.autoSave !== undefined && !isBoolean(settings.autoSave)) {
      result.errors.push('自动保存设置格式无效');
      result.valid = false;
    }

    if (settings.showCompletedProjects !== undefined && !isBoolean(settings.showCompletedProjects)) {
      result.errors.push('显示完成项目设置格式无效');
      result.valid = false;
    }

    return result;
  }

  /**
   * 验证元数据
   */
  static validateMetadata(metadata: unknown, _context: ValidationContext): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!isRecord(metadata)) {
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
    if (metadata.totalProjects !== undefined && (!isNumber(metadata.totalProjects) || metadata.totalProjects < 0)) {
      result.warnings.push('元数据项目总数格式无效');
    }

    if (metadata.totalTodos !== undefined && (!isNumber(metadata.totalTodos) || metadata.totalTodos < 0)) {
      result.warnings.push('元数据任务总数格式无效');
    }

    return result;
  }

  /**
   * 检查日期字符串格式
   */
  private static isValidDateString(dateStr: unknown): boolean {
    if (!isString(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * 数据清理和标准化
   */
  static sanitizeAppData(data: unknown): AppData {
    const sanitized = isRecord(data) ? { ...data } : {};

    // 确保版本字段
    if (!isString(sanitized.version)) {
      sanitized.version = '1.0.0';
    }

    // 清理项目数据
    if (isArray(sanitized.projects)) {
      sanitized.projects = sanitized.projects.map((project: unknown, index: number) => 
        this.sanitizeProject(project, index)
      ).filter(Boolean);
    } else {
      sanitized.projects = [];
    }

    // 清理设置数据
    sanitized.settings = this.sanitizeAppSettings(sanitized.settings || {});

    // 清理元数据
    sanitized.metadata = this.sanitizeMetadata(sanitized.metadata || {});

    return sanitized as unknown as AppData;
  }

  private static sanitizeProject(project: unknown, index: number): Project | null {
    if (!isRecord(project)) return null;

    const sanitized: Record<string, unknown> = {};

    sanitized.id = isString(project.id) ? project.id : `project-${Date.now()}-${index}`;
    sanitized.name = isString(project.name) ? project.name : `未命名项目 ${index + 1}`;
    sanitized.description = isString(project.description) ? project.description : '';
    sanitized.isCompleted = isBoolean(project.isCompleted) ? project.isCompleted : false;
    sanitized.createdAt = isString(project.createdAt) ? project.createdAt : new Date().toISOString();
    sanitized.updatedAt = isString(project.updatedAt) ? project.updatedAt : new Date().toISOString();

    // 清理Todo列表
    if (isArray(project.todos)) {
      sanitized.todos = project.todos.map((todo: unknown, todoIndex: number) => 
        this.sanitizeTodo(todo, todoIndex, sanitized.id as string)
      ).filter(Boolean);
    } else {
      sanitized.todos = [];
    }

    return sanitized as unknown as Project;
  }

  private static sanitizeTodo(todo: unknown, index: number, projectId: string): Todo | null {
    if (!isRecord(todo)) return null;

    const sanitized: Record<string, unknown> = {};

    sanitized.id = isString(todo.id) ? todo.id : `todo-${Date.now()}-${index}`;
    sanitized.text = isString(todo.text) ? todo.text : `未命名任务 ${index + 1}`;
    sanitized.isCompleted = isBoolean(todo.isCompleted) ? todo.isCompleted : false;
    sanitized.order = isNumber(todo.order) ? todo.order : index;
    sanitized.projectId = projectId;
    
    // 保持 completedAt 字段 (可选)
    if (isString(todo.completedAt)) {
      sanitized.completedAt = todo.completedAt;
    }

    // 清理子任务
    if (isArray(todo.subtasks)) {
      sanitized.subtasks = todo.subtasks.map((subtask: unknown, subtaskIndex: number) => 
        this.sanitizeSubtask(subtask, subtaskIndex, sanitized.id as string)
      ).filter(Boolean);
    } else {
      sanitized.subtasks = [];
    }

    return sanitized as unknown as Todo;
  }

  private static sanitizeSubtask(subtask: unknown, index: number, todoId: string): Subtask | null {
    if (!isRecord(subtask)) return null;

    const sanitized: Subtask = {
      id: isString(subtask.id) ? subtask.id : `subtask-${Date.now()}-${index}`,
      text: isString(subtask.text) ? subtask.text : `未命名子任务 ${index + 1}`,
      isCompleted: isBoolean(subtask.isCompleted) ? subtask.isCompleted : false,
      order: isNumber(subtask.order) ? subtask.order : index,
      todoId: todoId
    };

    // 保持 completedAt 字段 (可选)
    if (isString(subtask.completedAt)) {
      sanitized.completedAt = subtask.completedAt;
    }

    return sanitized;
  }

  private static sanitizeAppSettings(settings: unknown): AppSettings {
    const settingsObj = isRecord(settings) ? settings : {};
    
    return {
      storagePath: isString(settingsObj.storagePath) ? settingsObj.storagePath : undefined,
      theme: isString(settingsObj.theme) && ['light', 'dark', 'auto'].includes(settingsObj.theme) 
        ? settingsObj.theme as 'light' | 'dark' | 'auto' 
        : 'auto',
      autoSave: isBoolean(settingsObj.autoSave) ? settingsObj.autoSave : false,
      showCompletedProjects: isBoolean(settingsObj.showCompletedProjects) ? settingsObj.showCompletedProjects : false,
      autoBackup: isBoolean(settingsObj.autoBackup) ? settingsObj.autoBackup : false,
      backupInterval: isNumber(settingsObj.backupInterval) && settingsObj.backupInterval > 0 ? settingsObj.backupInterval : 24
    };
  }

  private static sanitizeMetadata(metadata: unknown): Record<string, unknown> {
    const now = new Date();
    const metadataObj = isRecord(metadata) ? metadata : {};
    
    return {
      createdAt: this.isValidDateString(metadataObj.createdAt) ? new Date(metadataObj.createdAt as string) : now,
      lastModified: this.isValidDateString(metadataObj.lastModified) ? new Date(metadataObj.lastModified as string) : now,
      totalProjects: isNumber(metadataObj.totalProjects) ? metadataObj.totalProjects : 0,
      totalTodos: isNumber(metadataObj.totalTodos) ? metadataObj.totalTodos : 0
    };
  }
}