import { AppData, Project, Todo, Subtask } from '@/types';

export interface ConversionResult {
  success: boolean;
  data?: AppData;
  error?: string;
  warnings?: string[];
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  parent_id?: string;
  url: string;
}

export interface TodoistTask {
  id: string;
  project_id: string;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  parent_id?: string;
  order: number;
  priority: number;
  due?: {
    date: string;
    datetime?: string;
    string: string;
    timezone?: string;
  };
  url: string;
  comment_count: number;
  created_at: string;
  creator_id: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  lists: TrelloList[];
  cards: TrelloCard[];
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  pos: number;
  due?: string;
  idList: string;
  idBoard: string;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  checklists?: TrelloChecklist[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: Array<{
    id: string;
    name: string;
    state: 'complete' | 'incomplete';
    pos: number;
  }>;
}

export class FormatConverter {
  
  /**
   * 检测文件格式
   */
  static detectFormat(data: unknown): 'pmapp' | 'todoist' | 'trello' | 'unknown' {
    if (!data || typeof data !== 'object') {
      return 'unknown';
    }

    // 检查是否为标准的PMApp格式
    if (data.version && data.projects && data.settings && data.metadata) {
      return 'pmapp';
    }

    // 检查是否为Todoist导出格式
    if (data.projects && data.items && Array.isArray(data.projects) && Array.isArray(data.items)) {
      // Todoist导出格式通常有projects和items（tasks）数组
      return 'todoist';
    }

    // 检查是否为Trello导出格式
    if (data.name && data.lists && data.cards && Array.isArray(data.lists) && Array.isArray(data.cards)) {
      // Trello导出格式通常包含board信息
      return 'trello';
    }

    // 检查是否为单个Trello board
    if (data.id && data.name && data.url && typeof data.url === 'string' && data.url.includes('trello.com')) {
      return 'trello';
    }

    return 'unknown';
  }

  /**
   * 从Todoist格式转换
   */
  static convertFromTodoist(todoistData: unknown): ConversionResult {
    const warnings: string[] = [];
    
    try {
      if (!todoistData.projects || !Array.isArray(todoistData.projects)) {
        return {
          success: false,
          error: 'Todoist数据格式无效：缺少projects数组'
        };
      }

      if (!todoistData.items || !Array.isArray(todoistData.items)) {
        return {
          success: false,
          error: 'Todoist数据格式无效：缺少items数组'
        };
      }

      const projects: Project[] = [];
      const todoistProjects = todoistData.projects as TodoistProject[];
      const todoistTasks = todoistData.items as TodoistTask[];

      for (const todoistProject of todoistProjects) {
        // 跳过收件箱和团队收件箱
        if (todoistProject.is_inbox_project || todoistProject.is_team_inbox) {
          warnings.push(`跳过系统项目: ${todoistProject.name}`);
          continue;
        }

        // 获取该项目的所有任务
        const projectTasks = todoistTasks
          .filter(task => task.project_id === todoistProject.id)
          .sort((a, b) => a.order - b.order);

        const todos: Todo[] = [];
        const taskMap = new Map<string, Todo>();

        // 先创建所有顶级任务
        for (const task of projectTasks.filter(t => !t.parent_id)) {
          const todo: Todo = {
            id: `todo-${task.id}`,
            text: task.content,
            isCompleted: task.is_completed,
            order: task.order,
            subtasks: [],
            projectId: `project-${todoistProject.id}`
          };

          todos.push(todo);
          taskMap.set(task.id, todo);
        }

        // 然后处理子任务
        for (const task of projectTasks.filter(t => t.parent_id)) {
          if (task.parent_id && taskMap.has(task.parent_id)) {
            const parentTodo = taskMap.get(task.parent_id)!;
            const subtask: Subtask = {
              id: `subtask-${task.id}`,
              text: task.content,
              isCompleted: task.is_completed,
              order: task.order,
              todoId: parentTodo.id
            };
            parentTodo.subtasks.push(subtask);
          } else {
            warnings.push(`无法找到任务的父任务: ${task.content}`);
            // 作为顶级任务处理
            const todo: Todo = {
              id: `todo-${task.id}`,
              text: task.content,
              isCompleted: task.is_completed,
              order: task.order,
              subtasks: [],
              projectId: `project-${todoistProject.id}`
            };
            todos.push(todo);
          }
        }

        const project: Project = {
          id: `project-${todoistProject.id}`,
          name: todoistProject.name,
          description: `从Todoist导入的项目`,
          isCompleted: todos.length > 0 && todos.every(t => t.isCompleted),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          todos: todos
        };

        projects.push(project);
      }

      const appData: AppData = {
        version: '1.0.0',
        projects: projects,
        settings: {
          theme: 'auto',
          autoSave: true,
          showCompletedProjects: true
        },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          totalProjects: projects.length,
          totalTodos: projects.reduce((sum, p) => sum + p.todos.length, 0)
        }
      };

      return {
        success: true,
        data: appData,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Todoist数据转换失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 从Trello格式转换
   */
  static convertFromTrello(trelloData: unknown): ConversionResult {
    const warnings: string[] = [];
    
    try {
      let boardData: TrelloBoard;

      // 处理不同的Trello导出格式
      if (trelloData.name && trelloData.lists && trelloData.cards) {
        boardData = trelloData;
      } else if (Array.isArray(trelloData) && trelloData.length > 0) {
        // 可能是多个board的数组
        boardData = trelloData[0];
        if (trelloData.length > 1) {
          warnings.push(`检测到${trelloData.length}个看板，只会导入第一个: ${boardData.name}`);
        }
      } else {
        return {
          success: false,
          error: 'Trello数据格式无效：无法识别看板结构'
        };
      }

      const projects: Project[] = [];
      const lists = boardData.lists || [];
      const cards = boardData.cards || [];

      // 按列表分组创建项目
      for (const list of lists.filter(l => !l.closed)) {
        const listCards = cards
          .filter(card => card.idList === list.id && !card.closed)
          .sort((a, b) => a.pos - b.pos);

        if (listCards.length === 0) {
          warnings.push(`跳过空列表: ${list.name}`);
          continue;
        }

        const todos: Todo[] = [];

        for (const card of listCards) {
          const subtasks: Subtask[] = [];

          // 处理清单项作为子任务
          if (card.checklists && card.checklists.length > 0) {
            for (const checklist of card.checklists) {
              for (const checkItem of checklist.checkItems) {
                subtasks.push({
                  id: `subtask-${checkItem.id}`,
                  text: checkItem.name,
                  isCompleted: checkItem.state === 'complete',
                  order: checkItem.pos,
                  todoId: `todo-${card.id}`
                });
              }
            }
          }

          const todo: Todo = {
            id: `todo-${card.id}`,
            text: card.name,
            isCompleted: false, // Trello卡片没有完成状态，基于位置或列表判断
            order: card.pos,
            subtasks: subtasks,
            projectId: `project-${list.id}`
          };

          todos.push(todo);
        }

        const project: Project = {
          id: `project-${list.id}`,
          name: list.name,
          description: `从Trello看板"${boardData.name}"导入的列表`,
          isCompleted: list.name.toLowerCase().includes('done') || list.name.toLowerCase().includes('完成'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          todos: todos
        };

        projects.push(project);
      }

      if (projects.length === 0) {
        warnings.push('没有找到可导入的内容');
      }

      const appData: AppData = {
        version: '1.0.0',
        projects: projects,
        settings: {
          theme: 'auto',
          autoSave: true,
          showCompletedProjects: true
        },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          totalProjects: projects.length,
          totalTodos: projects.reduce((sum, p) => sum + p.todos.length, 0)
        }
      };

      return {
        success: true,
        data: appData,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Trello数据转换失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 通用转换入口
   */
  static convertToAppData(data: unknown): ConversionResult {
    const format = this.detectFormat(data);

    switch (format) {
      case 'pmapp':
        return {
          success: true,
          data: data as AppData
        };

      case 'todoist':
        return this.convertFromTodoist(data);

      case 'trello':
        return this.convertFromTrello(data);

      default:
        return {
          success: false,
          error: '无法识别的文件格式。支持的格式：PMApp标准格式、Todoist导出、Trello导出'
        };
    }
  }

  /**
   * 获取格式信息
   */
  static getFormatInfo(data: unknown): { format: string; description: string; confidence: number } {
    const format = this.detectFormat(data);
    
    const formatInfo = {
      'pmapp': {
        description: 'PMApp标准格式',
        confidence: 1.0
      },
      'todoist': {
        description: 'Todoist导出格式',
        confidence: 0.9
      },
      'trello': {
        description: 'Trello导出格式',
        confidence: 0.8
      },
      'unknown': {
        description: '未知格式',
        confidence: 0.0
      }
    };

    return {
      format,
      ...formatInfo[format]
    };
  }
}