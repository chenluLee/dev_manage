import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectManager } from '@/managers/ProjectManager';
import { StorageManager } from '@/managers/StorageManager';
import type { Project } from '@/types';

// Mock StorageManager
vi.mock('@/managers/StorageManager', () => ({
  StorageManager: {
    saveDataToDirectory: vi.fn(),
    loadDataFromDirectory: vi.fn()
  }
}));

describe('ProjectManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建一个有效的项目', async () => {
      const projectData = {
        name: '测试项目',
        description: '这是一个测试项目'
      };

      const project = await ProjectManager.create(projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('测试项目');
      expect(project.description).toBe('这是一个测试项目');
      expect(project.isCompleted).toBe(false);
      expect(project.todos).toEqual([]);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('应该使用默认值创建项目', async () => {
      const projectData = {
        name: '最小项目'
      };

      const project = await ProjectManager.create(projectData);

      expect(project.name).toBe('最小项目');
      expect(project.description).toBe('');
      expect(project.isCompleted).toBe(false);
    });

    it('应该处理completed状态', async () => {
      const projectData = {
        name: '已完成项目',
        status: 'completed' as const
      };

      const project = await ProjectManager.create(projectData);

      expect(project.isCompleted).toBe(true);
    });

    it('项目名称为空时应该抛出错误', async () => {
      const projectData = {
        name: ''
      };

      await expect(ProjectManager.create(projectData)).rejects.toThrow('项目名称不能为空');
    });

    it('项目名称超过100字符时应该抛出错误', async () => {
      const projectData = {
        name: 'a'.repeat(101)
      };

      await expect(ProjectManager.create(projectData)).rejects.toThrow('项目名称长度不能超过100个字符');
    });

    it('项目描述超过500字符时应该抛出错误', async () => {
      const projectData = {
        name: '测试项目',
        description: 'a'.repeat(501)
      };

      await expect(ProjectManager.create(projectData)).rejects.toThrow('项目描述长度不能超过500个字符');
    });
  });

  describe('update', () => {
    it('应该返回更新后的项目数据', async () => {
      const updates = {
        name: '更新的项目名'
      };

      const result = await ProjectManager.update('test-id', updates);

      expect(result.name).toBe('更新的项目名');
      expect(result.updatedAt).toBeDefined();
    });

    it('项目ID为空时应该抛出错误', async () => {
      await expect(ProjectManager.update('', { name: '测试' })).rejects.toThrow('项目ID不能为空');
    });

    it('更新的项目名称为空时应该抛出错误', async () => {
      await expect(ProjectManager.update('test-id', { name: '' })).rejects.toThrow('项目名称不能为空');
    });

    it('更新的项目名称超过100字符时应该抛出错误', async () => {
      await expect(ProjectManager.update('test-id', { name: 'a'.repeat(101) }))
        .rejects.toThrow('项目名称长度不能超过100个字符');
    });

    it('更新的项目描述超过500字符时应该抛出错误', async () => {
      await expect(ProjectManager.update('test-id', { description: 'a'.repeat(501) }))
        .rejects.toThrow('项目描述长度不能超过500个字符');
    });

    it('应该排除不允许更新的字段', async () => {
      const updates = {
        name: '新名称',
        id: 'new-id',
        createdAt: new Date().toISOString()
      };

      const result = await ProjectManager.update('test-id', updates);

      expect(result.name).toBe('新名称');
      expect(result.id).toBeUndefined();
      expect(result.createdAt).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('项目ID有效时应该返回true', async () => {
      const result = await ProjectManager.delete('valid-id');
      expect(result).toBe(true);
    });

    it('项目ID为空时应该抛出错误', async () => {
      await expect(ProjectManager.delete('')).rejects.toThrow('项目ID不能为空');
    });
  });

  describe('validateProjectData', () => {
    it('应该验证有效的项目数据', () => {
      const projectData = {
        name: '有效项目',
        description: '有效描述'
      };

      const result = ProjectManager.validateProjectData(projectData);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该返回名称验证错误', () => {
      const projectData = {
        name: '',
        description: '描述'
      };

      const result = ProjectManager.validateProjectData(projectData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('项目名称不能为空');
    });

    it('应该返回描述验证错误', () => {
      const projectData = {
        name: '项目名',
        description: 'a'.repeat(501)
      };

      const result = ProjectManager.validateProjectData(projectData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('项目描述长度不能超过500个字符');
    });

    it('应该返回多个验证错误', () => {
      const projectData = {
        name: '',
        description: 'a'.repeat(501)
      };

      const result = ProjectManager.validateProjectData(projectData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain('项目名称不能为空');
      expect(result.errors).toContain('项目描述长度不能超过500个字符');
    });
  });

  describe('checkDuplicateName', () => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: '现有项目',
        description: '',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        todos: []
      },
      {
        id: '2',
        name: '另一个项目',
        description: '',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        todos: []
      }
    ];

    it('应该检测到重复的名称', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('现有项目', mockProjects);
      expect(isDuplicate).toBe(true);
    });

    it('应该检测到重复的名称（忽略大小写）', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('现有项目', mockProjects);
      expect(isDuplicate).toBe(true);
    });

    it('不应该检测到重复的名称', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('新项目', mockProjects);
      expect(isDuplicate).toBe(false);
    });

    it('应该排除指定ID的项目', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('现有项目', mockProjects, '1');
      expect(isDuplicate).toBe(false);
    });

    it('空名称应该返回false', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('', mockProjects);
      expect(isDuplicate).toBe(false);
    });

    it('空项目列表应该返回false', async () => {
      const isDuplicate = await ProjectManager.checkDuplicateName('项目', []);
      expect(isDuplicate).toBe(false);
    });
  });

  describe('getUserFriendlyValidationError', () => {
    it('应该返回用户友好的错误信息', () => {
      const friendlyError = ProjectManager.getUserFriendlyValidationError('项目名称不能为空');
      expect(friendlyError).toBe('请输入项目名称');
    });

    it('未知错误应该返回原始错误信息', () => {
      const originalError = '未知错误';
      const friendlyError = ProjectManager.getUserFriendlyValidationError(originalError);
      expect(friendlyError).toBe(originalError);
    });
  });

  describe('saveWithStorage', () => {
    it('应该成功保存项目数据', async () => {
      const mockProjects: Project[] = [{
        id: '1',
        name: '测试项目',
        description: '',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        todos: []
      }];

      (StorageManager.saveDataToDirectory as any).mockResolvedValue({ success: true });

      const result = await ProjectManager.saveWithStorage(mockProjects);

      expect(result.success).toBe(true);
      expect(StorageManager.saveDataToDirectory).toHaveBeenCalled();
    });

    it('应该处理保存失败', async () => {
      const mockProjects: Project[] = [];
      const mockError = { 
        userFriendlyMessage: '保存失败',
        message: 'Save failed'
      };

      (StorageManager.saveDataToDirectory as any).mockResolvedValue({ 
        success: false, 
        error: mockError 
      });

      const result = await ProjectManager.saveWithStorage(mockProjects);

      expect(result.success).toBe(false);
      expect(result.error).toBe('保存失败');
    });
  });

  describe('loadFromStorage', () => {
    it('应该成功加载项目数据', async () => {
      const mockData = {
        version: '1.0',
        projects: [{
          id: '1',
          name: '测试项目',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          todos: []
        }],
        settings: {},
        metadata: {}
      };

      (StorageManager.loadDataFromDirectory as any).mockResolvedValue({ data: mockData });

      const result = await ProjectManager.loadFromStorage();

      expect(result.success).toBe(true);
      expect(result.projects).toEqual(mockData.projects);
    });

    it('应该处理加载失败', async () => {
      const mockError = {
        userFriendlyMessage: '加载失败',
        message: 'Load failed'
      };

      (StorageManager.loadDataFromDirectory as any).mockResolvedValue({ 
        data: null, 
        error: mockError 
      });

      const result = await ProjectManager.loadFromStorage();

      expect(result.success).toBe(false);
      expect(result.error).toBe('加载失败');
    });
  });
});