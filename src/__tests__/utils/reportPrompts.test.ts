import { describe, it, expect } from 'vitest';
import { 
  generateReportPrompt, 
  generateSimplePrompt, 
  generateCustomPrompt,
  PROMPT_TEMPLATES 
} from '@/utils/reportPrompts';
import { ReportData } from '@/types';

describe('reportPrompts', () => {
  const mockReportData: ReportData = {
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-07'
    },
    completedItems: [
      {
        projectName: '项目管理系统',
        todos: [
          {
            content: '实现用户登录功能',
            completedAt: '2024-01-02T10:00:00Z',
            subtasks: [
              {
                content: '设计登录界面',
                completedAt: '2024-01-01T15:00:00Z'
              },
              {
                content: '实现后端验证',
                completedAt: '2024-01-02T09:00:00Z'
              }
            ]
          },
          {
            content: '优化数据库查询',
            completedAt: '2024-01-03T14:00:00Z',
            subtasks: []
          }
        ]
      },
      {
        projectName: 'AI报告系统',
        todos: [
          {
            content: '集成Ollama API',
            completedAt: '2024-01-05T11:00:00Z',
            subtasks: [
              {
                content: '配置API连接',
                completedAt: '2024-01-04T16:00:00Z'
              }
            ]
          }
        ]
      }
    ],
    statistics: {
      totalProjects: 2,
      totalTodos: 3,
      totalSubtasks: 3
    }
  };

  describe('generateReportPrompt', () => {
    it('生成完整的报告提示词', () => {
      const prompt = generateReportPrompt(mockReportData);

      expect(prompt).toContain('专业的工作报告撰写助手');
      expect(prompt).toContain('2024年01月01日 至 2024年01月07日');
      expect(prompt).toContain('项目：2个');
      expect(prompt).toContain('任务：3个');
      expect(prompt).toContain('子任务：3个');
      expect(prompt).toContain('项目管理系统');
      expect(prompt).toContain('AI报告系统');
      expect(prompt).toContain('实现用户登录功能');
      expect(prompt).toContain('设计登录界面');
      expect(prompt).toContain('## 报告结构要求');
      expect(prompt).toContain('### 1. 工作概览');
      expect(prompt).toContain('### 2. 完成统计');
    });

    it('包含正确的数据摘要', () => {
      const prompt = generateReportPrompt(mockReportData);

      expect(prompt).toContain('平均每项目任务数：1.5个');
      expect(prompt).toContain('平均每任务细分：1.0个子任务');
      expect(prompt).toContain('项目管理系统、AI报告系统');
    });

    it('包含格式化的详细内容', () => {
      const prompt = generateReportPrompt(mockReportData);

      expect(prompt).toContain('**项目 1：项目管理系统**');
      expect(prompt).toContain('**项目 2：AI报告系统**');
      expect(prompt).toContain('01月02日');
      expect(prompt).toContain('01月01日');
    });
  });

  describe('generateSimplePrompt', () => {
    it('生成简洁的提示词', () => {
      const prompt = generateSimplePrompt(mockReportData);

      expect(prompt).toContain('简洁的工作总结');
      expect(prompt).toContain('2024年01月01日 - 2024年01月07日');
      expect(prompt).toContain('项目：2个');
      expect(prompt).toContain('任务：3个');
      expect(prompt).toContain('子任务：3个');
      expect(prompt).toContain('200-300字');
      expect(prompt).toContain('Markdown格式');
    });

    it('内容比完整提示词更简洁', () => {
      const simplePrompt = generateSimplePrompt(mockReportData);
      const fullPrompt = generateReportPrompt(mockReportData);

      expect(simplePrompt.length).toBeLessThan(fullPrompt.length);
      expect(simplePrompt).not.toContain('## 报告结构要求');
    });
  });

  describe('generateCustomPrompt', () => {
    it('正确替换占位符', () => {
      const template = `
报告期间：{startDate} - {endDate}
完成项目：{totalProjects}个
完成任务：{totalTodos}个
完成子任务：{totalSubtasks}个
项目列表：{projectList}
数据摘要：{dataSummary}
详细内容：{detailedContent}
      `.trim();

      const prompt = generateCustomPrompt(mockReportData, template);

      expect(prompt).toContain('2024年01月01日 - 2024年01月07日');
      expect(prompt).toContain('完成项目：2个');
      expect(prompt).toContain('完成任务：3个');
      expect(prompt).toContain('完成子任务：3个');
      expect(prompt).toContain('项目管理系统、AI报告系统');
      expect(prompt).toContain('平均每项目任务数：1.5个');
      expect(prompt).toContain('**项目 1：项目管理系统**');
    });

    it('处理部分占位符', () => {
      const template = '项目数量：{totalProjects}，其他信息：{nonExistentPlaceholder}';
      const prompt = generateCustomPrompt(mockReportData, template);

      expect(prompt).toContain('项目数量：2');
      expect(prompt).toContain('{nonExistentPlaceholder}'); // 未知占位符保持原样
    });
  });

  describe('PROMPT_TEMPLATES', () => {
    it('包含所有预定义模板', () => {
      expect(PROMPT_TEMPLATES).toHaveProperty('comprehensive');
      expect(PROMPT_TEMPLATES).toHaveProperty('simple');
      expect(PROMPT_TEMPLATES).toHaveProperty('weekly');
      expect(PROMPT_TEMPLATES).toHaveProperty('monthly');
    });

    it('每个模板都有正确的结构', () => {
      Object.entries(PROMPT_TEMPLATES).forEach(([key, template]) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('generator');
        expect(typeof template.generator).toBe('function');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
      });
    });

    it('模板生成器能正常工作', () => {
      Object.entries(PROMPT_TEMPLATES).forEach(([key, template]) => {
        const prompt = template.generator(mockReportData);
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('comprehensive模板生成详细提示词', () => {
      const prompt = PROMPT_TEMPLATES.comprehensive.generator(mockReportData);
      
      expect(prompt).toContain('专业的工作报告撰写助手');
      expect(prompt).toContain('## 报告结构要求');
      expect(prompt).toContain('### 1. 工作概览');
    });

    it('simple模板生成简洁提示词', () => {
      const prompt = PROMPT_TEMPLATES.simple.generator(mockReportData);
      
      expect(prompt).toContain('简洁的工作总结');
      expect(prompt).toContain('200-300字');
      expect(prompt).not.toContain('## 报告结构要求');
    });

    it('weekly模板包含周报特有内容', () => {
      const prompt = PROMPT_TEMPLATES.weekly.generator(mockReportData);
      
      expect(prompt).toContain('周报');
      expect(prompt).toContain('## 本周工作完成情况');
      expect(prompt).toContain('## 下周计划');
    });

    it('monthly模板包含月报特有内容', () => {
      const prompt = PROMPT_TEMPLATES.monthly.generator(mockReportData);
      
      expect(prompt).toContain('月度工作报告');
      expect(prompt).toContain('## 月度工作概览');
      expect(prompt).toContain('## 下月重点');
    });
  });

  describe('边界情况', () => {
    it('处理空数据', () => {
      const emptyData: ReportData = {
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        completedItems: [],
        statistics: { totalProjects: 0, totalTodos: 0, totalSubtasks: 0 }
      };

      const prompt = generateReportPrompt(emptyData);
      
      expect(prompt).toContain('在指定时间范围内暂无完成的项目和任务');
      expect(prompt).toContain('项目：0个');
      expect(prompt).toContain('任务：0个');
    });

    it('处理没有子任务的数据', () => {
      const dataWithoutSubtasks: ReportData = {
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        completedItems: [
          {
            projectName: '简单项目',
            todos: [
              {
                content: '简单任务',
                completedAt: '2024-01-02T10:00:00Z',
                subtasks: []
              }
            ]
          }
        ],
        statistics: { totalProjects: 1, totalTodos: 1, totalSubtasks: 0 }
      };

      const prompt = generateReportPrompt(dataWithoutSubtasks);
      
      expect(prompt).toContain('简单项目');
      expect(prompt).toContain('简单任务');
      expect(prompt).toContain('子任务：0个');
    });

    it('处理特殊字符和长文本', () => {
      const dataWithSpecialChars: ReportData = {
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        completedItems: [
          {
            projectName: '包含特殊字符的项目 & < > "',
            todos: [
              {
                content: '这是一个非常长的任务描述，包含多种特殊字符：@#$%^&*()_+-=[]{}|;:,.<>?/~`',
                completedAt: '2024-01-02T10:00:00Z',
                subtasks: []
              }
            ]
          }
        ],
        statistics: { totalProjects: 1, totalTodos: 1, totalSubtasks: 0 }
      };

      const prompt = generateReportPrompt(dataWithSpecialChars);
      
      expect(prompt).toContain('包含特殊字符的项目 & < > "');
      expect(prompt).toContain('这是一个非常长的任务描述');
    });
  });
});