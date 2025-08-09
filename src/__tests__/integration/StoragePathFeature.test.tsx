/**
 * 存储路径功能集成测试
 * 测试完整的用户交互流程
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsModal from '../../components/SettingsModal';
import { StorageManager } from '../../managers/StorageManager';

// 真实的 StorageManager 实例，但是 mock 外部 API
jest.mock('../../managers/StorageManager', () => {
  const actual = jest.requireActual('../../managers/StorageManager');
  return {
    ...actual,
    StorageManager: {
      ...actual.StorageManager,
      isFileSystemAccessSupported: jest.fn(() => true),
      requestDirectoryAccess: jest.fn(),
      getSelectedDirectoryName: jest.fn(),
      clearStoragePath: jest.fn(),
      getDefaultStoragePath: jest.fn(() => '~/Documents/ProjectManager'),
      performHealthCheck: jest.fn(),
      validateDirectoryAccess: jest.fn(),
    }
  };
});

const MockedStorageManager = StorageManager as jest.Mocked<typeof StorageManager>;

describe('存储路径功能集成测试', () => {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedStorageManager.performHealthCheck.mockResolvedValue({
      isHealthy: true,
      warnings: [],
      errors: []
    });
  });

  describe('完整的存储路径设置流程', () => {
    it('用户应该能够完成整个存储路径设置流程', async () => {
      const user = userEvent.setup();

      // 模拟成功的目录选择
      MockedStorageManager.requestDirectoryAccess.mockResolvedValue({ success: true });
      MockedStorageManager.getSelectedDirectoryName.mockReturnValue('ProjectData');
      MockedStorageManager.performHealthCheck.mockResolvedValue({
        isHealthy: true,
        warnings: [],
        errors: []
      });

      render(<SettingsModal {...mockProps} />);

      // 1. 用户看到初始状态
      expect(screen.getByText('未选择（使用浏览器本地存储）')).toBeInTheDocument();
      expect(screen.getByText('选择文件夹')).toBeInTheDocument();

      // 2. 用户点击选择文件夹
      const selectButton = screen.getByText('选择文件夹');
      await user.click(selectButton);

      // 3. 系统调用文件选择API
      await waitFor(() => {
        expect(MockedStorageManager.requestDirectoryAccess).toHaveBeenCalled();
      });

      // 4. 用户路径更新回调被调用
      expect(mockProps.onStoragePathChange).toHaveBeenCalledWith('ProjectData');

      // 5. 验证UI状态更新（需要重新渲染以模拟props更新）
      const updatedProps = { ...mockProps, storagePath: 'ProjectData' };
      const { rerender } = render(<SettingsModal {...updatedProps} />);

      // 6. 验证新的UI状态
      expect(screen.getByText('ProjectData')).toBeInTheDocument();
      expect(screen.getByText('清除')).toBeInTheDocument();
      expect(screen.getByText('健康检查')).toBeInTheDocument();

      // 7. 健康检查自动运行
      await waitFor(() => {
        expect(MockedStorageManager.performHealthCheck).toHaveBeenCalled();
      });

      // 8. 显示健康状态
      await waitFor(() => {
        expect(screen.getByText('✓ 存储状态正常')).toBeInTheDocument();
      });
    });

    it('用户应该能够处理选择失败的情况', async () => {
      const user = userEvent.setup();

      // 模拟用户取消选择
      MockedStorageManager.requestDirectoryAccess.mockResolvedValue({
        success: false,
        error: {
          type: 'permission_denied',
          message: 'User cancelled',
          userFriendlyMessage: '用户取消了目录选择',
          suggestion: '请重新选择存储目录以启用文件系统存储功能'
        }
      });

      render(<SettingsModal {...mockProps} />);

      // 1. 用户点击选择文件夹
      const selectButton = screen.getByText('选择文件夹');
      await user.click(selectButton);

      // 2. 显示错误信息和建议
      await waitFor(() => {
        expect(screen.getByText('用户取消了目录选择')).toBeInTheDocument();
      });

      // 3. 路径保持未选择状态
      expect(mockProps.onStoragePathChange).not.toHaveBeenCalled();
      expect(screen.getByText('未选择（使用浏览器本地存储）')).toBeInTheDocument();
    });

    it('用户应该能够清除已设置的存储路径', async () => {
      const user = userEvent.setup();
      const propsWithPath = { ...mockProps, storagePath: 'ProjectData' };

      MockedStorageManager.clearStoragePath.mockResolvedValue(undefined);

      render(<SettingsModal {...propsWithPath} />);

      // 1. 验证当前状态
      expect(screen.getByText('ProjectData')).toBeInTheDocument();
      expect(screen.getByText('清除')).toBeInTheDocument();

      // 2. 用户点击清除按钮
      const clearButton = screen.getByText('清除');
      await user.click(clearButton);

      // 3. 系统清除存储路径
      await waitFor(() => {
        expect(MockedStorageManager.clearStoragePath).toHaveBeenCalled();
      });

      // 4. 路径被重置
      expect(mockProps.onStoragePathChange).toHaveBeenCalledWith('');
    });
  });

  describe('健康检查流程', () => {
    it('应该在有存储路径时自动执行健康检查', async () => {
      const propsWithPath = { ...mockProps, storagePath: '/test/path' };
      
      MockedStorageManager.performHealthCheck.mockResolvedValue({
        isHealthy: true,
        warnings: ['存储空间使用超过75%'],
        errors: []
      });

      render(<SettingsModal {...propsWithPath} />);

      // 自动健康检查被触发
      await waitFor(() => {
        expect(MockedStorageManager.performHealthCheck).toHaveBeenCalled();
      });

      // 显示警告信息
      await waitFor(() => {
        expect(screen.getByText('存储空间使用超过75%')).toBeInTheDocument();
      });
    });

    it('应该处理健康检查中的错误情况', async () => {
      const propsWithPath = { ...mockProps, storagePath: '/test/path' };
      
      MockedStorageManager.performHealthCheck.mockResolvedValue({
        isHealthy: false,
        warnings: [],
        errors: [{
          type: 'path_not_accessible',
          message: 'Path not accessible',
          userFriendlyMessage: '存储路径无法访问',
          suggestion: '请检查网络连接或重新选择目录'
        }]
      });

      render(<SettingsModal {...propsWithPath} />);

      // 等待健康检查完成
      await waitFor(() => {
        expect(screen.getByText('存储路径无法访问')).toBeInTheDocument();
        expect(screen.getByText('建议：请检查网络连接或重新选择目录')).toBeInTheDocument();
      });
    });

    it('用户应该能够手动触发健康检查', async () => {
      const user = userEvent.setup();
      const propsWithPath = { ...mockProps, storagePath: '/test/path' };

      // 重置 mock 以便准确计数
      MockedStorageManager.performHealthCheck.mockClear();
      MockedStorageManager.performHealthCheck.mockResolvedValue({
        isHealthy: true,
        warnings: [],
        errors: []
      });

      render(<SettingsModal {...propsWithPath} />);

      // 等待自动健康检查完成
      await waitFor(() => {
        expect(MockedStorageManager.performHealthCheck).toHaveBeenCalledTimes(1);
      });

      // 用户手动触发健康检查
      const healthCheckButton = screen.getByText('健康检查');
      await user.click(healthCheckButton);

      await waitFor(() => {
        expect(MockedStorageManager.performHealthCheck).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('浏览器兼容性处理', () => {
    it('应该在不支持File System Access API时显示适当的信息', () => {
      MockedStorageManager.isFileSystemAccessSupported.mockReturnValue(false);

      render(<SettingsModal {...mockProps} />);

      expect(screen.getByText('您的浏览器不支持文件系统访问功能，仅能使用浏览器本地存储')).toBeInTheDocument();
    });

    it('应该在API不支持时隐藏相关功能按钮', () => {
      MockedStorageManager.isFileSystemAccessSupported.mockReturnValue(false);

      render(<SettingsModal {...mockProps} />);

      // 选择文件夹按钮仍然存在，但功能受限
      expect(screen.getByText('选择文件夹')).toBeInTheDocument();
      
      // 没有存储路径时不应该显示清除和健康检查按钮
      expect(screen.queryByText('清除')).not.toBeInTheDocument();
      expect(screen.queryByText('健康检查')).not.toBeInTheDocument();
    });
  });

  describe('错误恢复流程', () => {
    it('用户应该能够从错误状态中恢复', async () => {
      const user = userEvent.setup();

      // 第一次选择失败
      MockedStorageManager.requestDirectoryAccess
        .mockResolvedValueOnce({
          success: false,
          error: {
            type: 'permission_denied',
            message: 'Permission denied',
            userFriendlyMessage: '权限被拒绝'
          }
        })
        .mockResolvedValueOnce({ success: true });
      
      MockedStorageManager.getSelectedDirectoryName.mockReturnValue('RecoveredFolder');

      render(<SettingsModal {...mockProps} />);

      // 1. 第一次尝试失败
      const selectButton = screen.getByText('选择文件夹');
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('权限被拒绝')).toBeInTheDocument();
      });

      // 2. 用户重试
      await user.click(selectButton);

      // 3. 第二次尝试成功
      await waitFor(() => {
        expect(mockProps.onStoragePathChange).toHaveBeenCalledWith('RecoveredFolder');
      });

      // 4. 错误消息应该被清除（需要通过重新渲染模拟）
      const updatedProps = { ...mockProps, storagePath: 'RecoveredFolder' };
      render(<SettingsModal {...updatedProps} />);
      
      expect(screen.queryByText('权限被拒绝')).not.toBeInTheDocument();
    });
  });
});