import { Project, AppData } from '@/types';
import { StorageManager } from './StorageManager';

export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProjectCreateData {
  name: string;
  description?: string;
  status?: 'active' | 'completed';
}

class ProjectManagerClass {
  
  // 生成唯一项目ID
  private generateProjectId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // 获取当前ISO时间戳
  private nowISO(): string {
    return new Date().toISOString();
  }

  // 创建新项目
  async create(projectData: ProjectCreateData): Promise<Project> {
    // 数据验证
    const validation = this.validateProjectData(projectData);
    if (!validation.valid) {
      throw new Error(`项目创建失败: ${validation.errors.join(', ')}`);
    }

    const project: Project = {
      id: this.generateProjectId(),
      name: projectData.name,
      description: projectData.description || '',
      isCompleted: projectData.status === 'completed' || false,
      createdAt: this.nowISO(),
      updatedAt: this.nowISO(),
      todos: [],
    };

    return project;
  }

  // 更新项目
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (!id) {
      throw new Error('项目ID不能为空');
    }

    // 验证更新数据
    if (updates.name !== undefined) {
      const nameValidation = this.validateProjectName(updates.name);
      if (!nameValidation.valid) {
        throw new Error(`项目更新失败: ${nameValidation.errors.join(', ')}`);
      }
    }

    if (updates.description !== undefined) {
      const descValidation = this.validateProjectDescription(updates.description);
      if (!descValidation.valid) {
        throw new Error(`项目更新失败: ${descValidation.errors.join(', ')}`);
      }
    }

    // 创建更新对象（排除不应该被更新的字段）
    const allowedUpdates = {
      ...updates,
      updatedAt: this.nowISO(),
    };

    // 移除不应该被直接更新的字段
    delete allowedUpdates.id;
    delete allowedUpdates.createdAt;

    // 注意：这个方法返回更新后的项目，但实际的数据更新需要在调用方处理
    // 因为这里没有直接的数据存储访问
    return allowedUpdates as Project;
  }

  // 删除项目（返回是否成功）
  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('项目ID不能为空');
    }

    // 这里只返回true表示验证通过，实际删除逻辑由调用方处理
    // 因为删除需要访问项目列表数据
    return true;
  }

  // 验证项目数据
  validateProjectData(projectData: Partial<Project>): ProjectValidationResult {
    const errors: string[] = [];

    if (projectData.name !== undefined) {
      const nameValidation = this.validateProjectName(projectData.name);
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    if (projectData.description !== undefined) {
      const descValidation = this.validateProjectDescription(projectData.description);
      if (!descValidation.valid) {
        errors.push(...descValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 验证项目名称
  private validateProjectName(name: string): ProjectValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('项目名称不能为空');
    } else if (name.length > 100) {
      errors.push('项目名称长度不能超过100个字符');
    } else if (name.length < 1) {
      errors.push('项目名称长度不能少于1个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 验证项目描述
  private validateProjectDescription(description: string): ProjectValidationResult {
    const errors: string[] = [];

    if (description && description.length > 500) {
      errors.push('项目描述长度不能超过500个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 检查项目名称是否重复
  async checkDuplicateName(name: string, projects: Project[], excludeId?: string): Promise<boolean> {
    if (!name || !projects) return false;

    const trimmedName = name.trim().toLowerCase();
    return projects.some(project => 
      project.id !== excludeId && 
      project.name.trim().toLowerCase() === trimmedName
    );
  }

  // 获取用户友好的验证错误提示
  getUserFriendlyValidationError(error: string): string {
    const errorMap: { [key: string]: string } = {
      '项目名称不能为空': '请输入项目名称',
      '项目名称长度不能超过100个字符': '项目名称过长，请控制在100字符以内',
      '项目描述长度不能超过500个字符': '项目描述过长，请控制在500字符以内',
    };

    return errorMap[error] || error;
  }

  // 集成StorageManager保存数据
  async saveWithStorage(projects: Project[]): Promise<{ success: boolean; error?: string }> {
    try {
      // 构建AppData结构
      const appData: AppData = {
        version: '1.0',
        projects: projects,
        settings: {
          theme: 'auto',
          autoSave: true,
          showCompletedProjects: true,
          autoBackup: false,
          backupInterval: 24
        },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          totalProjects: projects.length,
          totalTodos: projects.reduce((total, project) => total + project.todos.length, 0)
        }
      };

      const result = await StorageManager.saveDataToDirectory(appData);
      
      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error?.userFriendlyMessage || result.error?.message || '保存失败'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '保存过程中发生未知错误'
      };
    }
  }

  // 从StorageManager加载数据
  async loadFromStorage(): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    try {
      const result = await StorageManager.loadDataFromDirectory();
      
      if (result.data) {
        return { 
          success: true, 
          projects: result.data.projects || []
        };
      } else {
        return { 
          success: false, 
          error: result.error?.userFriendlyMessage || result.error?.message || '加载失败'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '加载过程中发生未知错误'
      };
    }
  }

  // 更新项目排序
  async updateOrder(projectOrders: {id: string, order: number}[]): Promise<boolean> {
    try {
      if (!projectOrders || projectOrders.length === 0) {
        return false;
      }

      // 验证排序数据
      for (const item of projectOrders) {
        if (!item.id || typeof item.order !== 'number') {
          throw new Error('无效的排序数据');
        }
      }

      return true; // 验证成功，实际更新逻辑由调用方处理
    } catch (error) {
      throw new Error(`更新项目排序失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

export const ProjectManager = new ProjectManagerClass();