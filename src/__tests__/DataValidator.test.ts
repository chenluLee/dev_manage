import { describe, it, expect } from 'vitest';
import { DataValidator } from '@/utils/dataValidation';
import { AppData } from '@/types';

describe('DataValidator', () => {
  const validAppData: AppData = {
    version: '1.0.0',
    projects: [
      {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        todos: [
          {
            id: 'todo-1',
            text: 'Test Todo',
            isCompleted: false,
            order: 0,
            subtasks: [
              {
                id: 'subtask-1',
                text: 'Test Subtask',
                isCompleted: false,
                order: 0,
                todoId: 'todo-1'
              }
            ],
            projectId: 'project-1'
          }
        ]
      }
    ],
    settings: {
      theme: 'auto',
      autoSave: true,
      showCompletedProjects: true
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-01'),
      totalProjects: 1,
      totalTodos: 1
    }
  };

  describe('validateAppData', () => {
    it('should validate correct AppData structure', () => {
      const result = DataValidator.validateAppData(validAppData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined data', () => {
      const result1 = DataValidator.validateAppData(null);
      const result2 = DataValidator.validateAppData(undefined);
      
      expect(result1.valid).toBe(false);
      expect(result1.errors[0]).toContain('数据必须是一个有效对象');
      expect(result2.valid).toBe(false);
      expect(result2.errors[0]).toContain('数据必须是一个有效对象');
    });

    it('should reject data without version field', () => {
      const invalidData = { ...validAppData };
      delete (invalidData as Partial<AppData>).version;
      
      const result = DataValidator.validateAppData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('缺少版本字段或版本格式无效');
    });

    it('should reject data without projects array', () => {
      const invalidData = { ...validAppData };
      delete (invalidData as Partial<AppData>).projects;
      
      const result = DataValidator.validateAppData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('缺少项目列表或项目列表格式无效');
    });

    it('should reject data without settings object', () => {
      const invalidData = { ...validAppData };
      delete (invalidData as Partial<AppData>).settings;
      
      const result = DataValidator.validateAppData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('缺少设置对象或设置格式无效');
    });

    it('should reject data without metadata object', () => {
      const invalidData = { ...validAppData };
      delete (invalidData as Partial<AppData>).metadata;
      
      const result = DataValidator.validateAppData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('缺少元数据对象或元数据格式无效');
    });
  });

  describe('validateProjects', () => {
    it('should validate valid projects array', () => {
      const result = DataValidator.validateProjects(validAppData.projects, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate project IDs', () => {
      const duplicateProjects = [
        validAppData.projects[0],
        { ...validAppData.projects[0], name: 'Different name' }
      ];
      
      const result = DataValidator.validateProjects(duplicateProjects, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('项目ID重复');
    });

    it('should handle projects without required fields', () => {
      const invalidProjects = [{
        // Missing id and name
        description: 'Test',
        isCompleted: false,
        todos: []
      }];
      
      const result = DataValidator.validateProjects(invalidProjects, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('缺少ID字段或ID格式无效');
    });
  });

  describe('validateTodos', () => {
    it('should validate valid todos array', () => {
      const result = DataValidator.validateTodos(validAppData.projects[0].todos, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate todo IDs', () => {
      const duplicateTodos = [
        validAppData.projects[0].todos[0],
        { ...validAppData.projects[0].todos[0], text: 'Different text' }
      ];
      
      const result = DataValidator.validateTodos(duplicateTodos, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('任务ID重复');
    });
  });

  describe('validateSubtasks', () => {
    it('should validate valid subtasks array', () => {
      const result = DataValidator.validateSubtasks(validAppData.projects[0].todos[0].subtasks, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate subtask IDs', () => {
      const subtasks = validAppData.projects[0].todos[0].subtasks;
      const duplicateSubtasks = [
        subtasks[0],
        { ...subtasks[0], text: 'Different text' }
      ];
      
      const result = DataValidator.validateSubtasks(duplicateSubtasks, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('子任务ID重复');
    });
  });

  describe('validateAppSettings', () => {
    it('should validate correct settings', () => {
      const result = DataValidator.validateAppSettings(validAppData.settings, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid theme values', () => {
      const invalidSettings = {
        ...validAppData.settings,
        theme: 'invalid-theme'
      };
      
      const result = DataValidator.validateAppSettings(invalidSettings, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('主题设置值无效');
    });

    it('should reject non-boolean values for boolean settings', () => {
      const invalidSettings = {
        ...validAppData.settings,
        autoSave: 'true' // String instead of boolean
      };
      
      const result = DataValidator.validateAppSettings(invalidSettings, {
        checkIds: true,
        allowPartialData: false,
        strictMode: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('自动保存设置格式无效');
    });
  });

  describe('sanitizeAppData', () => {
    it('should clean and normalize valid data', () => {
      const result = DataValidator.sanitizeAppData(validAppData);
      
      expect(result.version).toBe(validAppData.version);
      expect(result.projects).toHaveLength(1);
      expect(result.settings).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should add missing version field', () => {
      const dataWithoutVersion = { ...validAppData };
      delete (dataWithoutVersion as Partial<AppData>).version;
      
      const result = DataValidator.sanitizeAppData(dataWithoutVersion);
      
      expect(result.version).toBe('1.0.0');
    });

    it('should handle empty or null data', () => {
      const result = DataValidator.sanitizeAppData({});
      
      expect(result.version).toBe('1.0.0');
      expect(result.projects).toEqual([]);
      expect(result.settings).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should filter out invalid projects', () => {
      const dataWithInvalidProject = {
        ...validAppData,
        projects: [
          validAppData.projects[0],
          null, // Invalid project
          undefined, // Invalid project
          { name: 'Valid but incomplete' } // Missing required fields but will be sanitized
        ]
      };
      
      const result = DataValidator.sanitizeAppData(dataWithInvalidProject);
      
      expect(result.projects).toHaveLength(2); // Original valid project + sanitized incomplete project
      expect(result.projects[1].id).toBeDefined();
      expect(result.projects[1].name).toBe('Valid but incomplete');
    });

    it('should generate missing IDs', () => {
      const dataWithoutIds = {
        version: '1.0.0',
        projects: [{
          name: 'Project without ID',
          todos: [{
            text: 'Todo without ID',
            subtasks: [{
              text: 'Subtask without ID'
            }]
          }]
        }],
        settings: {},
        metadata: {}
      };
      
      const result = DataValidator.sanitizeAppData(dataWithoutIds);
      
      expect(result.projects[0].id).toBeDefined();
      expect(result.projects[0].todos[0].id).toBeDefined();
      expect(result.projects[0].todos[0].subtasks[0].id).toBeDefined();
    });
  });
});