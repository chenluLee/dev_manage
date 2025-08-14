import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsModal from '../../components/SettingsModal';
import { AppSettings, AppData } from '../../types';

// Mock fetch
global.fetch = vi.fn();

const mockSettings: AppSettings = {
  theme: 'light',
  autoSave: true,
  showCompletedProjects: true,
  autoBackup: false,
  backupInterval: 24,
  projectOrder: [],
  collapsedProjects: [],
  searchHistory: [],
  statusFilter: ['active']
};

const mockAppData: AppData = {
  version: '1.0.0',
  projects: [],
  settings: mockSettings,
  metadata: {
    createdAt: new Date(),
    lastModified: new Date(),
    totalProjects: 0,
    totalTodos: 0
  }
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  storageKey: 'test-key',
  onStorageKeyChange: vi.fn(),
  onStoragePathChange: vi.fn(),
  onExport: vi.fn(() => '{}'),
  onImport: vi.fn(() => Promise.resolve({ ok: true })),
  onClear: vi.fn(),
  settings: mockSettings,
  onSettingsUpdate: vi.fn(),
  currentData: mockAppData
};

describe('SettingsModal - AI配置', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染AI配置区块', () => {
    render(<SettingsModal {...defaultProps} />);
    
    expect(screen.getByText('AI报告生成')).toBeInTheDocument();
    expect(screen.getByLabelText('Ollama服务器URL')).toBeInTheDocument();
    expect(screen.getByLabelText('AI模型名称')).toBeInTheDocument();
    expect(screen.getByLabelText('温度参数')).toBeInTheDocument();
  });

  it('应该显示默认值', () => {
    render(<SettingsModal {...defaultProps} />);
    
    expect(screen.getByDisplayValue('http://localhost:11434')).toBeInTheDocument();
    expect(screen.getByDisplayValue('llama3.2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
  });

  it('应该显示现有配置值', () => {
    const settingsWithAi = {
      ...mockSettings,
      aiReport: {
        ollamaUrl: 'https://custom.ollama.com:8080',
        modelName: 'mistral',
        temperature: 1.2
      }
    };

    render(<SettingsModal {...defaultProps} settings={settingsWithAi} />);
    
    expect(screen.getByDisplayValue('https://custom.ollama.com:8080')).toBeInTheDocument();
    expect(screen.getByDisplayValue('mistral')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.2')).toBeInTheDocument();
  });

  it('应该在输入时调用onSettingsUpdate', async () => {
    const user = userEvent.setup();
    const onSettingsUpdate = vi.fn();
    
    render(<SettingsModal {...defaultProps} onSettingsUpdate={onSettingsUpdate} />);
    
    const urlInput = screen.getByLabelText('Ollama服务器URL');
    await user.clear(urlInput);
    await user.type(urlInput, 'http://newhost:8080');
    
    expect(onSettingsUpdate).toHaveBeenLastCalledWith({
      ...mockSettings,
      aiReport: {
        ollamaUrl: 'http://newhost:8080',
        modelName: 'llama3.2',
        temperature: 0.7
      }
    });
  });

  it('应该显示URL格式验证错误', async () => {
    const user = userEvent.setup();
    
    render(<SettingsModal {...defaultProps} />);
    
    const urlInput = screen.getByLabelText('Ollama服务器URL');
    await user.clear(urlInput);
    await user.type(urlInput, 'invalid-url');
    
    await waitFor(() => {
      expect(screen.getByText('无效的URL格式')).toBeInTheDocument();
    });
  });

  it('应该显示模型名称验证错误', async () => {
    const user = userEvent.setup();
    
    render(<SettingsModal {...defaultProps} />);
    
    const modelInput = screen.getByLabelText('AI模型名称');
    await user.clear(modelInput);
    await user.type(modelInput, 'invalid@model');
    
    await waitFor(() => {
      expect(screen.getByText('模型名称只能包含字母、数字、点号、下划线和连字符')).toBeInTheDocument();
    });
  });

  it('应该显示温度参数验证错误', async () => {
    const user = userEvent.setup();
    
    render(<SettingsModal {...defaultProps} />);
    
    const tempInput = screen.getByLabelText('温度参数');
    await user.clear(tempInput);
    await user.type(tempInput, '3');
    
    await waitFor(() => {
      expect(screen.getByText('温度参数不能大于2')).toBeInTheDocument();
    });
  });

  it('应该渲染测试连接按钮', () => {
    render(<SettingsModal {...defaultProps} />);
    
    expect(screen.getByText('测试连接')).toBeInTheDocument();
  });

  it('应该在URL无效时禁用测试连接按钮', async () => {
    const user = userEvent.setup();
    
    render(<SettingsModal {...defaultProps} />);
    
    const urlInput = screen.getByLabelText('Ollama服务器URL');
    await user.clear(urlInput);
    await user.type(urlInput, 'invalid-url');
    
    await waitFor(() => {
      expect(screen.getByText('测试连接')).toBeDisabled();
    });
  });

  it('应该成功测试连接', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200
    } as Response);
    
    render(<SettingsModal {...defaultProps} />);
    
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('连接成功！Ollama服务正常运行')).toBeInTheDocument();
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('应该处理连接失败', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<SettingsModal {...defaultProps} />);
    
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('连接失败：无法连接到Ollama服务')).toBeInTheDocument();
    });
  });

  it('应该处理连接超时', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    const timeoutError = new DOMException('Timeout', 'TimeoutError');
    mockFetch.mockRejectedValueOnce(timeoutError);
    
    render(<SettingsModal {...defaultProps} />);
    
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('连接超时：请检查Ollama服务是否启动')).toBeInTheDocument();
    });
  });

  it('应该在测试过程中显示加载状态', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    
    // 创建一个永不resolve的Promise来模拟长时间加载
    let resolvePromise: () => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = () => resolve({ ok: true } as Response);
    });
    mockFetch.mockReturnValueOnce(pendingPromise);
    
    render(<SettingsModal {...defaultProps} />);
    
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    expect(screen.getByText('测试中...')).toBeInTheDocument();
    expect(testButton).toBeDisabled();
    
    // 清理：resolve promise
    resolvePromise!();
    await waitFor(() => {
      expect(screen.getByText('测试连接')).toBeInTheDocument();
    });
  });

  it('应该处理HTTP错误状态', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response);
    
    render(<SettingsModal {...defaultProps} />);
    
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('连接失败：HTTP 404')).toBeInTheDocument();
    });
  });

  it('应该在配置更改时清除连接测试结果', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);
    
    render(<SettingsModal {...defaultProps} />);
    
    // 先进行连接测试
    const testButton = screen.getByText('测试连接');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('连接成功！Ollama服务正常运行')).toBeInTheDocument();
    });
    
    // 修改URL
    const urlInput = screen.getByLabelText('Ollama服务器URL');
    await user.type(urlInput, '1');
    
    // 连接测试结果应该被清除
    expect(screen.queryByText('连接成功！Ollama服务正常运行')).not.toBeInTheDocument();
  });
});