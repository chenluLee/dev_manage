/**
 * StorageManager 单元测试
 * 测试存储路径管理功能
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

// Mock 全局 API
const mockShowDirectoryPicker = vi.fn();
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

// 模拟浏览器环境
global.window = {
  showDirectoryPicker: mockShowDirectoryPicker,
  indexedDB: mockIndexedDB,
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
} as Window & typeof globalThis;

global.navigator = {
  storage: {
    estimate: vi.fn()
  }
} as Navigator;

import { StorageManager } from '../managers/StorageManager';

describe('StorageManager', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    
    // 清除目录句柄状态
    (StorageManager as unknown as { directoryHandle: FileSystemDirectoryHandle | null }).directoryHandle = null;
    
    // 默认设置 API 支持
    (window as Window & { showDirectoryPicker?: typeof mockShowDirectoryPicker }).showDirectoryPicker = mockShowDirectoryPicker;
    
    // 设置 navigator.storage.estimate 默认返回值
    (navigator.storage.estimate as MockedFunction<any>).mockResolvedValue({
      quota: 1000,
      usage: 100 // 10% 使用率，健康状态
    });
  });

  describe('isFileSystemAccessSupported', () => {
    it('应该在支持 File System Access API 时返回 true', () => {
      expect(StorageManager.isFileSystemAccessSupported()).toBe(true);
    });

    it('应该在不支持 File System Access API 时返回 false', () => {
      delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
      // 需要重新创建实例来测试
      const testManager = new (StorageManager.constructor as new () => typeof StorageManager)();
      expect(testManager.isFileSystemAccessSupported()).toBe(false);
    });
  });

  describe('requestDirectoryAccess', () => {
    it('应该在 API 不支持时返回错误', async () => {
      delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
      const testManager = new (StorageManager.constructor as new () => typeof StorageManager)();
      
      const result = await testManager.requestDirectoryAccess();
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('api_not_supported');
      expect(result.error?.userFriendlyMessage).toContain('不支持文件系统访问功能');
    });

    it('应该在用户取消选择时返回错误', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      mockShowDirectoryPicker.mockRejectedValueOnce(abortError);

      const result = await StorageManager.requestDirectoryAccess();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('permission_denied');
      expect(result.error?.userFriendlyMessage).toContain('用户取消了目录选择');
    });

    it('应该在成功选择目录时返回成功', async () => {
      const mockDirectoryHandle = {
        name: 'TestFolder',
        getFileHandle: vi.fn(),
        removeEntry: vi.fn()
      } as FileSystemDirectoryHandle;
      
      mockShowDirectoryPicker.mockResolvedValueOnce(mockDirectoryHandle);

      const result = await StorageManager.requestDirectoryAccess();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该在权限被拒绝时返回错误', async () => {
      const permissionError = new Error('Permission denied');
      mockShowDirectoryPicker.mockRejectedValueOnce(permissionError);

      const result = await StorageManager.requestDirectoryAccess();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('permission_denied');
      expect(result.error?.userFriendlyMessage).toContain('无法访问所选目录');
    });
  });

  describe('validateDirectoryAccess', () => {
    it('应该在没有目录句柄时返回无效', async () => {
      const result = await StorageManager.validateDirectoryAccess();

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });

    it('应该在目录可写时返回有效', async () => {
      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          close: vi.fn()
        })
      };
      
      const mockDirectoryHandle = {
        name: 'TestFolder',
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        removeEntry: vi.fn()
      };

      StorageManager.restoreDirectoryHandle(mockDirectoryHandle as FileSystemDirectoryHandle);

      const result = await StorageManager.validateDirectoryAccess();

      expect(result.valid).toBe(true);
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalled();
      expect(mockDirectoryHandle.removeEntry).toHaveBeenCalled();
    });
  });

  describe('默认路径管理', () => {
    it('应该返回正确的默认路径', () => {
      const mockGetItem = vi.fn().mockReturnValue(null);
      (window.localStorage.getItem as MockedFunction<any>) = mockGetItem;

      const defaultPath = StorageManager.getDefaultStoragePath();

      expect(defaultPath).toContain('Documents');
    });

    it('应该保存和恢复默认路径', () => {
      const testPath = '/test/path';
      
      StorageManager.setDefaultStoragePath(testPath);
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'pmapp:defaultStoragePath',
        testPath
      );
    });

    it('应该清除默认路径', () => {
      StorageManager.setDefaultStoragePath('');
      
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(
        'pmapp:defaultStoragePath'
      );
    });

    it('应该在没有路径时使用默认路径', () => {
      const result = StorageManager.useDefaultStorageIfNoneSelected('');
      
      expect(result).toBeTruthy();
      expect(result).not.toBe('');
    });

    it('应该保持现有路径不变', () => {
      const existingPath = '/existing/path';
      const result = StorageManager.useDefaultStorageIfNoneSelected(existingPath);
      
      expect(result).toBe(existingPath);
    });
  });

  describe('健康检查', () => {
    it('应该在 API 不支持时返回警告', async () => {
      delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
      const testManager = new (StorageManager.constructor as new () => typeof StorageManager)();
      
      const result = await testManager.performHealthCheck();
      
      expect(result.isHealthy).toBe(true);
      expect(result.warnings).toContain('文件系统访问API不可用，仅能使用浏览器本地存储');
    });

    it('应该在存储配额不足时返回错误', async () => {
      (navigator.storage.estimate as MockedFunction<any>).mockResolvedValue({
        quota: 1000,
        usage: 950 // 95% 使用率
      });

      const result = await StorageManager.performHealthCheck();
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('insufficient_space');
    });

    it('应该在存储配额警告阈值时返回警告', async () => {
      (navigator.storage.estimate as MockedFunction<any>).mockResolvedValue({
        quota: 1000,
        usage: 800 // 80% 使用率
      });

      const result = await StorageManager.performHealthCheck();
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('存储空间使用超过75%');
    });
  });

  describe('数据保存和加载', () => {
    it('应该在没有目录句柄时返回错误', async () => {
      const testData = {
        version: '1.0',
        projects: [],
        settings: { theme: 'light' as const, autoSave: true, showCompletedProjects: false },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          totalProjects: 0,
          totalTodos: 0
        }
      };

      const result = await StorageManager.saveDataToDirectory(testData);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });

    it('应该在目录句柄存在时尝试保存数据', async () => {
      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          close: vi.fn()
        })
      };
      
      const mockDirectoryHandle = {
        name: 'TestFolder',
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle)
      };

      StorageManager.restoreDirectoryHandle(mockDirectoryHandle as FileSystemDirectoryHandle);

      const testData = {
        version: '1.0',
        projects: [],
        settings: { theme: 'light' as const, autoSave: true, showCompletedProjects: false },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          totalProjects: 0,
          totalTodos: 0
        }
      };

      const result = await StorageManager.saveDataToDirectory(testData);

      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('project-data.json', { create: true });
    });

    it('应该在文件不存在时返回错误', async () => {
      const notFoundError = new Error('File not found');
      notFoundError.name = 'NotFoundError';
      
      const mockDirectoryHandle = {
        name: 'TestFolder',
        getFileHandle: vi.fn().mockRejectedValue(notFoundError)
      };

      StorageManager.restoreDirectoryHandle(mockDirectoryHandle as FileSystemDirectoryHandle);

      const result = await StorageManager.loadDataFromDirectory();

      expect(result.error?.type).toBe('path_not_accessible');
      expect(result.error?.message).toContain('数据文件不存在');
    });
  });

  describe('清理功能', () => {
    it('应该清除存储路径和持久化数据', async () => {
      await StorageManager.clearStoragePath();
      
      // 验证内部状态被清除（通过后续操作验证）
      const result = await StorageManager.validateDirectoryAccess();
      expect(result.valid).toBe(false);
    });
  });
});