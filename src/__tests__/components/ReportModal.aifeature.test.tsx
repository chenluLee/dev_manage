import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReportModal from '@/components/ReportModal';
import { Project, AppSettings } from '@/types';
import { OllamaService } from '@/services/OllamaService';

// Mock OllamaService
vi.mock('@/services/OllamaService');

// Mock download function
vi.mock('@/hooks/useLocalStorage', () => ({
  download: vi.fn(),
}));

describe('ReportModal AI功能', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: '测试项目',
      description: '测试项目描述',
      isCompleted: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      order: 0,
      todos: [
        {
          id: '1',
          text: '已完成的任务',
          isCompleted: true,
          order: 0,
          subtasks: [],
          projectId: '1',
          completedAt: '2024-01-15T10:00:00Z',
        },
      ],
    },
  ];

  const mockSettingsWithAI: AppSettings = {
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

  const mockSettingsWithoutAI: AppSettings = {
    ...mockSettingsWithAI,
    aiReport: undefined
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projects: mockProjects,
    settings: mockSettingsWithAI,
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful AI response by default
    vi.mocked(OllamaService.generateReport).mockResolvedValue({
      success: true,
      content: '这是AI生成的测试报告内容'
    });
    vi.mocked(OllamaService.isConfigComplete).mockReturnValue(true);
  });

  describe('AI配置检查', () => {
    it('AI配置完整时显示AI生成功能', () => {
      render(<ReportModal {...defaultProps} />);
      
      expect(screen.getByText('AI智能生成')).toBeInTheDocument();
      expect(screen.getByText('AI生成报告')).toBeInTheDocument();
    });

    it('AI配置不完整时显示配置提示', () => {
      vi.mocked(OllamaService.isConfigComplete).mockReturnValue(false);
      
      render(<ReportModal {...defaultProps} settings={mockSettingsWithoutAI} />);
      
      expect(screen.queryByText('AI智能生成')).not.toBeInTheDocument();
      expect(screen.getByText('要使用AI生成功能，需要配置Ollama服务器：')).toBeInTheDocument();
    });

    it('配置提示包含具体的缺失项', () => {
      const incompleteSettings = {
        ...mockSettingsWithAI,
        aiReport: {
          ollamaUrl: '',
          modelName: 'llama3.2',
          temperature: 0.7
        }
      };
      vi.mocked(OllamaService.isConfigComplete).mockReturnValue(false);
      
      render(<ReportModal {...defaultProps} settings={incompleteSettings} />);
      
      expect(screen.getByText(/设置Ollama服务器URL/)).toBeInTheDocument();
    });

    it('点击"打开设置"按钮调用回调', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.isConfigComplete).mockReturnValue(false);
      
      render(<ReportModal {...defaultProps} settings={mockSettingsWithoutAI} />);
      
      const openSettingsButton = screen.getByText('打开设置');
      await user.click(openSettingsButton);
      
      expect(defaultProps.onOpenSettings).toHaveBeenCalled();
    });
  });

  describe('提示词模板选择', () => {
    it('显示模板选择器', () => {
      render(<ReportModal {...defaultProps} />);
      
      expect(screen.getByText('报告模板')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('可以切换模板选项', async () => {
      const user = userEvent.setup();
      render(<ReportModal {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // 检查模板选项
      expect(screen.getByText('详细报告')).toBeInTheDocument();
      expect(screen.getByText('简洁总结')).toBeInTheDocument();
      expect(screen.getByText('周报模板')).toBeInTheDocument();
      expect(screen.getByText('月报模板')).toBeInTheDocument();
    });
  });

  describe('AI生成流程', () => {
    it('成功生成AI报告', async () => {
      const user = userEvent.setup();
      render(<ReportModal {...defaultProps} />);
      
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      // 验证loading状态
      expect(screen.getByText(/AI生成中.../)).toBeInTheDocument();
      
      // 等待生成完成
      await waitFor(() => {
        expect(screen.queryByText(/AI生成中.../)).not.toBeInTheDocument();
      });
      
      // 验证内容填充到编辑区域
      const textarea = screen.getByLabelText('报告内容') as HTMLTextAreaElement;
      expect(textarea.value).toContain('这是AI生成的测试报告内容');
      
      expect(OllamaService.generateReport).toHaveBeenCalledWith(
        mockSettingsWithAI.aiReport,
        expect.any(String)
      );
    });

    it('处理AI生成失败', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.generateReport).mockResolvedValue({
        success: false,
        error: '网络连接失败'
      });
      
      render(<ReportModal {...defaultProps} />);
      
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('网络连接失败')).toBeInTheDocument();
      });
      
      // 验证显示重试按钮
      expect(screen.getByText(/重试 \(1\/3\)/)).toBeInTheDocument();
    });

    it('显示友好的错误信息', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.generateReport).mockResolvedValue({
        success: false,
        error: 'fetch failed'
      });
      
      render(<ReportModal {...defaultProps} />);
      
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('网络连接失败，请检查Ollama服务器是否运行')).toBeInTheDocument();
      });
    });

    it('支持重试机制', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.generateReport)
        .mockResolvedValueOnce({
          success: false,
          error: '请求超时'
        })
        .mockResolvedValueOnce({
          success: true,
          content: '重试成功的内容'
        });
      
      render(<ReportModal {...defaultProps} />);
      
      // 第一次生成失败
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/请求超时/)).toBeInTheDocument();
      });
      
      // 点击重试
      const retryButton = screen.getByText(/重试 \(1\/3\)/);
      await user.click(retryButton);
      
      // 等待重试成功
      await waitFor(() => {
        const textarea = screen.getByLabelText('报告内容') as HTMLTextAreaElement;
        expect(textarea.value).toContain('重试成功的内容');
      });
    });

    it('达到最大重试次数后显示提示', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.generateReport).mockResolvedValue({
        success: false,
        error: '持续失败'
      });
      
      render(<ReportModal {...defaultProps} />);
      
      // 模拟3次重试失败
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText(/重试 \(1\/3\)/)).toBeInTheDocument();
      });
      
      // 第一次重试
      await user.click(screen.getByText(/重试 \(1\/3\)/));
      await waitFor(() => {
        expect(screen.getByText(/重试 \(2\/3\)/)).toBeInTheDocument();
      });
      
      // 第二次重试
      await user.click(screen.getByText(/重试 \(2\/3\)/));
      await waitFor(() => {
        expect(screen.getByText(/重试 \(3\/3\)/)).toBeInTheDocument();
      });
      
      // 第三次重试
      await user.click(screen.getByText(/重试 \(3\/3\)/));
      await waitFor(() => {
        expect(screen.getByText(/已达到最大重试次数/)).toBeInTheDocument();
        expect(screen.queryByText(/重试/)).not.toBeInTheDocument();
      });
    });

    it('可以关闭错误提示', async () => {
      const user = userEvent.setup();
      vi.mocked(OllamaService.generateReport).mockResolvedValue({
        success: false,
        error: '测试错误'
      });
      
      render(<ReportModal {...defaultProps} />);
      
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('测试错误')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('关闭');
      await user.click(closeButton);
      
      expect(screen.queryByText('测试错误')).not.toBeInTheDocument();
    });
  });

  describe('与现有功能集成', () => {
    it('AI生成的内容可以手动编辑', async () => {
      const user = userEvent.setup();
      render(<ReportModal {...defaultProps} />);
      
      // 生成AI内容
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText('报告内容') as HTMLTextAreaElement;
        expect(textarea.value).toContain('这是AI生成的测试报告内容');
      });
      
      // 手动编辑内容
      const textarea = screen.getByLabelText('报告内容');
      await user.clear(textarea);
      await user.type(textarea, '手动编辑的内容');
      
      expect((textarea as HTMLTextAreaElement).value).toBe('手动编辑的内容');
    });

    it('AI生成不影响日期选择功能', async () => {
      const user = userEvent.setup();
      render(<ReportModal {...defaultProps} />);
      
      // 点击快捷日期按钮
      const quickButton = screen.getByText('过去7天');
      await user.click(quickButton);
      
      // AI功能仍然可用
      expect(screen.getByText('AI生成报告')).toBeInTheDocument();
      expect(screen.getByText('AI生成报告')).not.toBeDisabled();
    });

    it('导出功能正常工作', async () => {
      const user = userEvent.setup();
      render(<ReportModal {...defaultProps} />);
      
      // 生成AI内容
      const generateButton = screen.getByText('AI生成报告');
      await user.click(generateButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText('报告内容') as HTMLTextAreaElement;
        expect(textarea.value).toContain('这是AI生成的测试报告内容');
      });
      
      // 验证导出按钮可用
      const exportButton = screen.getByText('导出Markdown');
      expect(exportButton).not.toBeDisabled();
    });
  });

  describe('响应式设计', () => {
    it('移动端显示适配的文案', () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      
      render(<ReportModal {...defaultProps} />);
      
      // 在移动端，按钮文案应该更简洁
      expect(screen.getByText('AI生成报告')).toBeInTheDocument();
    });
  });
});