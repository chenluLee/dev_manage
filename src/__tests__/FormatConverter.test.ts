import { describe, it, expect } from 'vitest';
import { FormatConverter } from '@/utils/formatConverters';
import { AppData } from '@/types';

describe('FormatConverter', () => {
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
            subtasks: [],
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

  const todoistData = {
    projects: [
      {
        id: '123',
        name: 'My Project',
        comment_count: 0,
        order: 1,
        color: 'blue',
        is_shared: false,
        is_favorite: false,
        is_inbox_project: false,
        is_team_inbox: false,
        url: 'https://todoist.com/project/123'
      }
    ],
    items: [
      {
        id: '456',
        project_id: '123',
        content: 'Buy groceries',
        description: '',
        is_completed: false,
        labels: [],
        order: 1,
        priority: 1,
        url: 'https://todoist.com/task/456',
        comment_count: 0,
        created_at: '2024-01-01T00:00:00.000Z',
        creator_id: 'user123'
      },
      {
        id: '789',
        project_id: '123',
        content: 'Buy milk',
        description: '',
        is_completed: false,
        labels: [],
        parent_id: '456', // Subtask of 'Buy groceries'
        order: 1,
        priority: 1,
        url: 'https://todoist.com/task/789',
        comment_count: 0,
        created_at: '2024-01-01T00:00:00.000Z',
        creator_id: 'user123'
      }
    ]
  };

  const trelloData = {
    id: 'board123',
    name: 'My Trello Board',
    desc: 'A test board',
    closed: false,
    url: 'https://trello.com/b/board123',
    lists: [
      {
        id: 'list123',
        name: 'To Do',
        closed: false,
        pos: 1,
        idBoard: 'board123'
      },
      {
        id: 'list456',
        name: 'Done',
        closed: false,
        pos: 2,
        idBoard: 'board123'
      }
    ],
    cards: [
      {
        id: 'card123',
        name: 'Task 1',
        desc: 'First task',
        closed: false,
        pos: 1,
        idList: 'list123',
        idBoard: 'board123',
        labels: [],
        checklists: [
          {
            id: 'checklist123',
            name: 'Subtasks',
            checkItems: [
              {
                id: 'checkitem123',
                name: 'Subtask 1',
                state: 'incomplete' as const,
                pos: 1
              },
              {
                id: 'checkitem456',
                name: 'Subtask 2',
                state: 'complete' as const,
                pos: 2
              }
            ]
          }
        ]
      },
      {
        id: 'card456',
        name: 'Task 2',
        desc: 'Second task',
        closed: false,
        pos: 2,
        idList: 'list456',
        idBoard: 'board123',
        labels: []
      }
    ]
  };

  describe('detectFormat', () => {
    it('should detect PMApp format', () => {
      const format = FormatConverter.detectFormat(validAppData);
      expect(format).toBe('pmapp');
    });

    it('should detect Todoist format', () => {
      const format = FormatConverter.detectFormat(todoistData);
      expect(format).toBe('todoist');
    });

    it('should detect Trello format', () => {
      const format = FormatConverter.detectFormat(trelloData);
      expect(format).toBe('trello');
    });

    it('should return unknown for invalid data', () => {
      const format1 = FormatConverter.detectFormat(null);
      const format2 = FormatConverter.detectFormat({ invalid: 'data' });
      const format3 = FormatConverter.detectFormat('string');
      
      expect(format1).toBe('unknown');
      expect(format2).toBe('unknown');
      expect(format3).toBe('unknown');
    });
  });

  describe('convertFromTodoist', () => {
    it('should successfully convert Todoist data', () => {
      const result = FormatConverter.convertFromTodoist(todoistData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.projects).toHaveLength(1);
      expect(result.data?.projects[0].name).toBe('My Project');
      expect(result.data?.projects[0].todos).toHaveLength(1);
      expect(result.data?.projects[0].todos[0].text).toBe('Buy groceries');
      expect(result.data?.projects[0].todos[0].subtasks).toHaveLength(1);
      expect(result.data?.projects[0].todos[0].subtasks[0].text).toBe('Buy milk');
    });

    it('should skip inbox projects', () => {
      const dataWithInbox = {
        ...todoistData,
        projects: [
          ...todoistData.projects,
          {
            id: 'inbox',
            name: 'Inbox',
            is_inbox_project: true,
            is_team_inbox: false,
            comment_count: 0,
            order: 0,
            color: 'grey',
            is_shared: false,
            is_favorite: false,
            url: 'https://todoist.com/project/inbox'
          }
        ]
      };
      
      const result = FormatConverter.convertFromTodoist(dataWithInbox);
      
      expect(result.success).toBe(true);
      expect(result.data?.projects).toHaveLength(1); // Only non-inbox project
      expect(result.warnings).toContain('跳过系统项目: Inbox');
    });

    it('should handle missing projects array', () => {
      const invalidData = { items: [] };
      
      const result = FormatConverter.convertFromTodoist(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Todoist数据格式无效：缺少projects数组');
    });

    it('should handle missing items array', () => {
      const invalidData = { projects: [] };
      
      const result = FormatConverter.convertFromTodoist(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Todoist数据格式无效：缺少items数组');
    });
  });

  describe('convertFromTrello', () => {
    it('should successfully convert Trello data', () => {
      const result = FormatConverter.convertFromTrello(trelloData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.projects).toHaveLength(2); // Two lists
      expect(result.data?.projects[0].name).toBe('To Do');
      expect(result.data?.projects[0].todos).toHaveLength(1);
      expect(result.data?.projects[0].todos[0].text).toBe('Task 1');
      expect(result.data?.projects[0].todos[0].subtasks).toHaveLength(2);
      expect(result.data?.projects[1].name).toBe('Done');
      expect(result.data?.projects[1].isCompleted).toBe(true); // "Done" implies completion
    });

    it('should handle board array format', () => {
      const boardArray = [trelloData];
      
      const result = FormatConverter.convertFromTrello(boardArray);
      
      expect(result.success).toBe(true);
      expect(result.data?.projects).toHaveLength(2);
    });

    it('should warn about multiple boards', () => {
      const multipleBoards = [trelloData, { ...trelloData, name: 'Second Board' }];
      
      const result = FormatConverter.convertFromTrello(multipleBoards);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('检测到2个看板，只会导入第一个: My Trello Board');
    });

    it('should skip empty lists', () => {
      const dataWithEmptyList = {
        ...trelloData,
        lists: [
          ...trelloData.lists,
          {
            id: 'empty-list',
            name: 'Empty List',
            closed: false,
            pos: 3,
            idBoard: 'board123'
          }
        ]
      };
      
      const result = FormatConverter.convertFromTrello(dataWithEmptyList);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('跳过空列表: Empty List');
    });

    it('should handle invalid Trello format', () => {
      const invalidData = { invalid: 'data' };
      
      const result = FormatConverter.convertFromTrello(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trello数据格式无效');
    });
  });

  describe('convertToAppData', () => {
    it('should convert PMApp format directly', () => {
      const result = FormatConverter.convertToAppData(validAppData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validAppData);
    });

    it('should convert Todoist format', () => {
      const result = FormatConverter.convertToAppData(todoistData);
      
      expect(result.success).toBe(true);
      expect(result.data?.projects).toBeDefined();
    });

    it('should convert Trello format', () => {
      const result = FormatConverter.convertToAppData(trelloData);
      
      expect(result.success).toBe(true);
      expect(result.data?.projects).toBeDefined();
    });

    it('should reject unknown format', () => {
      const result = FormatConverter.convertToAppData({ unknown: 'format' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('无法识别的文件格式');
    });
  });

  describe('getFormatInfo', () => {
    it('should return format info for PMApp', () => {
      const info = FormatConverter.getFormatInfo(validAppData);
      
      expect(info.format).toBe('pmapp');
      expect(info.description).toBe('PMApp标准格式');
      expect(info.confidence).toBe(1.0);
    });

    it('should return format info for Todoist', () => {
      const info = FormatConverter.getFormatInfo(todoistData);
      
      expect(info.format).toBe('todoist');
      expect(info.description).toBe('Todoist导出格式');
      expect(info.confidence).toBe(0.9);
    });

    it('should return format info for Trello', () => {
      const info = FormatConverter.getFormatInfo(trelloData);
      
      expect(info.format).toBe('trello');
      expect(info.description).toBe('Trello导出格式');
      expect(info.confidence).toBe(0.8);
    });

    it('should return unknown format info', () => {
      const info = FormatConverter.getFormatInfo({ invalid: 'data' });
      
      expect(info.format).toBe('unknown');
      expect(info.description).toBe('未知格式');
      expect(info.confidence).toBe(0.0);
    });
  });
});