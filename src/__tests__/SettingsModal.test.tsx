/**
 * SettingsModal 组件测试
 * 测试存储路径设置UI功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsModal from '../components/SettingsModal';

// Mock StorageManager
const mockStorageManager = {
  isFileSystemAccessSupported: jest.fn(() => true),
  requestDirectoryAccess: jest.fn(),
  getSelectedDirectoryName: jest.fn(),
  clearStoragePath: jest.fn(),
  getDefaultStoragePath: jest.fn(() => '~/Documents/ProjectManager'),
  performHealthCheck: jest.fn()
};

jest.mock('../managers/StorageManager', () => ({
  StorageManager: mockStorageManager
}));

// Mock download function
jest.mock('../hooks/useLocalStorage', () => ({
  download: jest.fn()
}));

describe('SettingsModal', () => {
  const mockProps = {
    open: true,
    onOpenChange: jest.fn(),
    storageKey: 'pmapp:data',
    onStorageKeyChange: jest.fn(),
    storagePath: '',
    onStoragePathChange: jest.fn(),
    onExport: jest.fn(() => JSON.stringify({})),
    onImport: jest.fn(() => ({ ok: true })),
    onClear: jest.fn(),
    stats: { total: 5, active: 3, completed: 2 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: true,
      warnings: [],
      errors: []
    });
  });

  it('应该渲染所有基本元素', () => {
    render(<SettingsModal {...mockProps} />);

    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('数据存储路径')).toBeInTheDocument();
    expect(screen.getByText('选择文件夹')).toBeInTheDocument();
    expect(screen.getByText('数据导入/导出')).toBeInTheDocument();
  });

  it('应该显示未选择状态', () => {
    render(<SettingsModal {...mockProps} />);

    expect(screen.getByText('未选择（使用浏览器本地存储）')).toBeInTheDocument();
  });

  it('应该显示已选择的存储路径', () => {
    const propsWithPath = { ...mockProps, storagePath: '/Users/test/Documents' };
    render(<SettingsModal {...propsWithPath} />);

    expect(screen.getByText('/Users/test/Documents')).toBeInTheDocument();
    expect(screen.getByText('清除')).toBeInTheDocument();
    expect(screen.getByText('健康检查')).toBeInTheDocument();
  });

  it('应该处理文件夹选择', async () => {
    const user = userEvent.setup();
    mockStorageManager.requestDirectoryAccess.mockResolvedValue({ success: true });
    mockStorageManager.getSelectedDirectoryName.mockReturnValue('TestFolder');

    render(<SettingsModal {...mockProps} />);

    const selectButton = screen.getByText('选择文件夹');
    await user.click(selectButton);

    await waitFor(() => {
      expect(mockStorageManager.requestDirectoryAccess).toHaveBeenCalled();
      expect(mockProps.onStoragePathChange).toHaveBeenCalledWith('TestFolder');
    });
  });

  it('应该处理选择文件夹时的错误', async () => {
    const user = userEvent.setup();
    mockStorageManager.requestDirectoryAccess.mockResolvedValue({
      success: false,
      error: {
        type: 'permission_denied',
        message: 'Permission denied',
        userFriendlyMessage: '权限被拒绝'
      }
    });

    render(<SettingsModal {...mockProps} />);

    const selectButton = screen.getByText('选择文件夹');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('权限被拒绝')).toBeInTheDocument();
    });
  });

  it('应该处理用户取消选择', async () => {
    const user = userEvent.setup();
    mockStorageManager.requestDirectoryAccess.mockResolvedValue({
      success: false,
      error: {
        type: 'permission_denied',
        message: 'User cancelled',
        userFriendlyMessage: '用户取消了目录选择',
        suggestion: '请重新选择存储目录'
      }
    });

    render(<SettingsModal {...mockProps} />);

    const selectButton = screen.getByText('选择文件夹');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('用户取消了目录选择')).toBeInTheDocument();
    });
  });

  it('应该在选择过程中显示加载状态', async () => {
    const user = userEvent.setup();
    mockStorageManager.requestDirectoryAccess.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<SettingsModal {...mockProps} />);

    const selectButton = screen.getByText('选择文件夹');
    await user.click(selectButton);

    expect(screen.getByText('选择中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选择中/ })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('选择文件夹')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('应该处理清除存储路径', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.clearStoragePath.mockResolvedValue(undefined);

    render(<SettingsModal {...propsWithPath} />);

    const clearButton = screen.getByText('清除');
    await user.click(clearButton);

    await waitFor(() => {
      expect(mockStorageManager.clearStoragePath).toHaveBeenCalled();
      expect(mockProps.onStoragePathChange).toHaveBeenCalledWith('');
    });
  });

  it('应该处理清除存储路径时的错误', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.clearStoragePath.mockRejectedValue(new Error('Clear failed'));

    render(<SettingsModal {...propsWithPath} />);

    const clearButton = screen.getByText('清除');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('清除存储路径时发生错误')).toBeInTheDocument();
    });
  });

  it('应该显示浏览器不支持的警告', () => {
    mockStorageManager.isFileSystemAccessSupported.mockReturnValue(false);

    render(<SettingsModal {...mockProps} />);

    expect(screen.getByText('您的浏览器不支持文件系统访问功能，仅能使用浏览器本地存储')).toBeInTheDocument();
  });

  it('应该显示默认路径信息', () => {
    render(<SettingsModal {...mockProps} />);

    expect(screen.getByText(/默认路径:/)).toBeInTheDocument();
    expect(screen.getByText('~/Documents/ProjectManager')).toBeInTheDocument();
  });

  it('应该执行健康检查', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: true,
      warnings: [],
      errors: []
    });

    render(<SettingsModal {...propsWithPath} />);

    await waitFor(() => {
      expect(mockStorageManager.performHealthCheck).toHaveBeenCalled();
    });
  });

  it('应该手动触发健康检查', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };

    render(<SettingsModal {...propsWithPath} />);

    const healthCheckButton = screen.getByText('健康检查');
    await user.click(healthCheckButton);

    await waitFor(() => {
      expect(mockStorageManager.performHealthCheck).toHaveBeenCalledTimes(2); // 一次自动，一次手动
    });
  });

  it('应该显示健康检查结果 - 成功状态', async () => {
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: true,
      warnings: [],
      errors: []
    });

    render(<SettingsModal {...propsWithPath} />);

    await waitFor(() => {
      expect(screen.getByText('✓ 存储状态正常')).toBeInTheDocument();
    });
  });

  it('应该显示健康检查结果 - 警告状态', async () => {
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: true,
      warnings: ['存储空间使用超过75%'],
      errors: []
    });

    render(<SettingsModal {...propsWithPath} />);

    await waitFor(() => {
      expect(screen.getByText('存储空间使用超过75%')).toBeInTheDocument();
    });
  });

  it('应该显示健康检查结果 - 错误状态', async () => {
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: false,
      warnings: [],
      errors: [{
        type: 'path_not_accessible',
        message: 'Path error',
        userFriendlyMessage: '路径无法访问',
        suggestion: '请重新选择目录'
      }]
    });

    render(<SettingsModal {...propsWithPath} />);

    await waitFor(() => {
      expect(screen.getByText('路径无法访问')).toBeInTheDocument();
      expect(screen.getByText('建议：请重新选择目录')).toBeInTheDocument();
    });
  });

  it('应该处理健康检查过程中的错误', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockRejectedValue(new Error('Health check failed'));

    render(<SettingsModal {...propsWithPath} />);

    const healthCheckButton = screen.getByText('健康检查');
    await user.click(healthCheckButton);

    await waitFor(() => {
      expect(screen.getByText('健康检查失败')).toBeInTheDocument();
    });
  });

  it('应该在健康检查过程中显示加载状态', async () => {
    const user = userEvent.setup();
    const propsWithPath = { ...mockProps, storagePath: '/test/path' };
    mockStorageManager.performHealthCheck.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        isHealthy: true,
        warnings: [],
        errors: []
      }), 100))
    );

    render(<SettingsModal {...propsWithPath} />);

    const healthCheckButton = screen.getByText('健康检查');
    await user.click(healthCheckButton);

    expect(screen.getByText('检查中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /检查中/ })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('健康检查')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('应该处理统计信息显示', () => {
    render(<SettingsModal {...mockProps} />);

    expect(screen.getByText(/项目总数 5，进行中 3，已结束 2/)).toBeInTheDocument();
  });

  it('应该处理没有统计信息的情况', () => {
    const propsWithoutStats = { ...mockProps, stats: undefined };
    render(<SettingsModal {...propsWithoutStats} />);

    expect(screen.queryByText(/项目总数/)).not.toBeInTheDocument();
  });
});