/**
 * useStoragePath Hook 单元测试
 * 测试存储路径状态管理
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoragePath } from '../hooks/useStoragePath';
import { AppSettings } from '../types';

// Mock StorageManager
const mockStorageManager = {
  isFileSystemAccessSupported: jest.fn(() => true),
  validateDirectoryAccess: jest.fn(),
  performHealthCheck: jest.fn()
};

jest.mock('../managers/StorageManager', () => ({
  StorageManager: mockStorageManager
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useStoragePath', () => {
  const mockUpdateSettings = jest.fn();
  const defaultSettings: AppSettings = {
    theme: 'light',
    autoSave: true,
    showCompletedProjects: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageManager.validateDirectoryAccess.mockResolvedValue({ valid: true });
  });

  it('应该返回正确的初始状态', () => {
    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    expect(result.current.storagePath).toBe('');
    expect(result.current.storageError).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isFileSystemSupported).toBe(true);
  });

  it('应该在有存储路径时返回路径', () => {
    const settingsWithPath: AppSettings = {
      ...defaultSettings,
      storagePath: '/test/path'
    };

    const { result } = renderHook(() =>
      useStoragePath(settingsWithPath, mockUpdateSettings)
    );

    expect(result.current.storagePath).toBe('/test/path');
  });

  it('应该更新存储路径', async () => {
    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    act(() => {
      result.current.updateStoragePath('/new/path');
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      ...defaultSettings,
      storagePath: '/new/path'
    });
  });

  it('应该在验证失败时设置错误', async () => {
    const settingsWithPath: AppSettings = {
      ...defaultSettings,
      storagePath: '/test/path'
    };

    mockStorageManager.validateDirectoryAccess.mockResolvedValue({
      valid: false,
      error: {
        type: 'path_not_accessible',
        message: 'Access denied',
        userFriendlyMessage: '路径无法访问'
      }
    });

    const { result } = renderHook(() =>
      useStoragePath(settingsWithPath, mockUpdateSettings)
    );

    await waitFor(() => {
      expect(result.current.storageError).toBe('路径无法访问');
    });
  });

  it('应该在验证成功时清除错误', async () => {
    const settingsWithPath: AppSettings = {
      ...defaultSettings,
      storagePath: '/test/path'
    };

    // 先设置一个错误状态
    mockStorageManager.validateDirectoryAccess
      .mockResolvedValueOnce({
        valid: false,
        error: {
          type: 'path_not_accessible',
          message: 'Access denied',
          userFriendlyMessage: '路径无法访问'
        }
      })
      .mockResolvedValueOnce({ valid: true });

    const { result, rerender } = renderHook(() =>
      useStoragePath(settingsWithPath, mockUpdateSettings)
    );

    // 等待初始验证完成
    await waitFor(() => {
      expect(result.current.storageError).toBe('路径无法访问');
    });

    // 重新验证
    rerender();

    await waitFor(() => {
      expect(result.current.storageError).toBe('');
    });
  });

  it('应该管理默认存储路径', () => {
    mockLocalStorage.getItem.mockReturnValue('/default/path');

    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    const defaultPath = result.current.getDefaultStoragePath();
    expect(defaultPath).toBe('/default/path');
  });

  it('应该设置默认存储路径', () => {
    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    act(() => {
      result.current.setDefaultStoragePath('/new/default/path');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'pmapp:defaultStoragePath',
      '/new/default/path'
    );
  });

  it('应该清除默认存储路径', () => {
    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    act(() => {
      result.current.setDefaultStoragePath('');
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'pmapp:defaultStoragePath'
    );
  });

  it('应该在 API 不支持时返回 false', () => {
    mockStorageManager.isFileSystemAccessSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    expect(result.current.isFileSystemSupported).toBe(false);
  });

  it('应该在没有存储路径或 API 不支持时跳过验证', async () => {
    mockStorageManager.isFileSystemAccessSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    // 等待一小段时间确保没有验证被触发
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockStorageManager.validateDirectoryAccess).not.toHaveBeenCalled();
    expect(result.current.storageError).toBe('');
  });

  it('应该处理验证过程中的错误', async () => {
    const settingsWithPath: AppSettings = {
      ...defaultSettings,
      storagePath: '/test/path'
    };

    mockStorageManager.validateDirectoryAccess.mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useStoragePath(settingsWithPath, mockUpdateSettings)
    );

    await waitFor(() => {
      expect(result.current.storageError).toBe('验证存储路径时发生错误');
    });
  });

  it('应该在路径更新后清除错误', () => {
    const { result } = renderHook(() =>
      useStoragePath(defaultSettings, mockUpdateSettings)
    );

    // 设置一个错误
    act(() => {
      result.current.setStorageError('测试错误');
    });

    expect(result.current.storageError).toBe('测试错误');

    // 更新路径应该清除错误
    act(() => {
      result.current.updateStoragePath('/new/path');
    });

    expect(result.current.storageError).toBe('');
  });
});