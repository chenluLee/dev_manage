import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReportModal from '@/components/ReportModal';
import { Project, AppSettings } from '@/types';

// Mock the download function
vi.mock('@/hooks/useLocalStorage', () => ({
  download: vi.fn(),
}));

// Mock date-fns functions to avoid locale issues
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2024-01-01'),
  subDays: vi.fn(() => new Date('2024-01-01')),
  isAfter: vi.fn(() => true),
  isBefore: vi.fn(() => true),
  isEqual: vi.fn(() => false),
  parseISO: vi.fn(() => new Date('2024-01-01')),
}));

// Mock date-fns/locale to avoid import issues
vi.mock('date-fns/locale', () => ({
  zhCN: {
    preprocessor: () => {},
  },
}));

const mockProjects: Project[] = [
  {
    id: '1',
    name: '测试项目1',
    description: '测试项目描述',
    isCompleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    order: 0,
    todos: [
      {
        id: 'todo1',
        text: '已完成的任务1',
        isCompleted: true,
        order: 0,
        projectId: '1',
        completedAt: '2024-01-10T10:00:00Z',
        subtasks: [
          {
            id: 'sub1',
            text: '已完成的子任务1',
            isCompleted: true,
            order: 0,
            todoId: 'todo1',
            completedAt: '2024-01-09T09:00:00Z',
          },
          {
            id: 'sub2',
            text: '未完成的子任务',
            isCompleted: false,
            order: 1,
            todoId: 'todo1',
          },
        ],
      },
      {
        id: 'todo2',
        text: '未完成的任务',
        isCompleted: false,
        order: 1,
        projectId: '1',
        subtasks: [],
      },
    ],
  },
  {
    id: '2',
    name: '测试项目2',
    description: '另一个测试项目',
    isCompleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    order: 1,
    todos: [
      {
        id: 'todo3',
        text: '最近完成的任务',
        isCompleted: true,
        order: 0,
        projectId: '2',
        completedAt: '2024-01-12T15:30:00Z',
        subtasks: [],
      },
    ],
  },
];

const mockSettings: AppSettings = {
  theme: 'auto',
  autoSave: true,
  showCompletedProjects: true,
  autoBackup: false,
  backupInterval: 24,
  projectOrder: [],
  collapsedProjects: [],
  searchHistory: [],
  statusFilter: ['active', 'completed'],
  aiReport: {
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3.2',
    temperature: 0.7
  }
};

describe('ReportModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projects: mockProjects,
    settings: mockSettings,
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染报告模态框', () => {
    render(<ReportModal {...defaultProps} />);
    
    expect(screen.getByText('生成工作报告')).toBeInTheDocument();
    expect(screen.getByText('选择时间范围并生成工作完成情况报告')).toBeInTheDocument();
  });

  it('显示快捷日期选择按钮', () => {
    render(<ReportModal {...defaultProps} />);
    
    expect(screen.getByText('过去7天')).toBeInTheDocument();
    expect(screen.getByText('过去30天')).toBeInTheDocument();
    expect(screen.getByText('过去90天')).toBeInTheDocument();
  });

  it('显示完成事项统计信息', async () => {
    render(<ReportModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/项目：/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/任务：/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/子任务：/).length).toBeGreaterThan(0);
    });
  });

  it('显示报告内容编辑区域', () => {
    render(<ReportModal {...defaultProps} />);
    
    expect(screen.getByLabelText('报告内容')).toBeInTheDocument();
  });

  it('显示导出按钮', () => {
    render(<ReportModal {...defaultProps} />);
    
    expect(screen.getByText('导出Markdown')).toBeInTheDocument();
  });

  it('点击快捷日期按钮更新日期范围', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const quickButton = screen.getByText('过去7天');
    await user.click(quickButton);
    
    // 验证内容是否更新
    await waitFor(() => {
      const textarea = screen.getByLabelText('报告内容') as HTMLTextAreaElement;
      expect(textarea.value).toContain('工作报告');
    }, { timeout: 3000 });
  });

  it('正确过滤完成事项数据', async () => {
    render(<ReportModal {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByLabelText('报告内容');
      const content = (textarea as HTMLTextAreaElement).value;
      
      // 应该包含已完成的任务
      expect(content).toContain('已完成的任务1');
      expect(content).toContain('最近完成的任务');
      
      // 应该包含已完成的子任务
      expect(content).toContain('已完成的子任务1');
      
      // 不应该包含未完成的任务
      expect(content).not.toContain('未完成的任务');
      expect(content).not.toContain('未完成的子任务');
    });
  });

  it('处理空数据状态', async () => {
    const emptyProps = {
      ...defaultProps,
      projects: [],
    };
    
    render(<ReportModal {...emptyProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByLabelText('报告内容');
      const content = (textarea as HTMLTextAreaElement).value;
      
      expect(content).toContain('在选定的时间范围内暂无完成的任务');
    });
  });

  it('允许编辑报告内容', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const textarea = screen.getByLabelText('报告内容');
    
    await user.clear(textarea);
    await user.type(textarea, '自定义报告内容');
    
    expect(textarea).toHaveValue('自定义报告内容');
  });

  it('关闭模态框时调用回调函数', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const closeButton = screen.getByText('取消');
    await user.click(closeButton);
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('生成的报告包含正确的元数据', async () => {
    render(<ReportModal {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByLabelText('报告内容');
      const content = (textarea as HTMLTextAreaElement).value;
      
      // 检查报告格式
      expect(content).toContain('# 工作报告');
      expect(content).toContain('## 完成统计');
      expect(content).toContain('## 详细内容');
      expect(content).toContain('*报告生成时间：');
    });
  });
});