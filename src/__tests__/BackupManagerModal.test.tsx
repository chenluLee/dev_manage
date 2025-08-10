import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BackupManagerModal } from '@/components/BackupManagerModal';
import { StorageManager } from '@/managers/StorageManager';
import { AppData, AppSettings, BackupMetadata } from '@/types';

// Mock StorageManager
vi.mock('@/managers/StorageManager', () => ({
  StorageManager: {
    getBackupList: vi.fn(),
    createBackup: vi.fn(),
    deleteBackup: vi.fn(),
    restoreFromBackup: vi.fn()
  }
}));

const mockStorageManager = StorageManager as typeof StorageManager & {
  getBackupList: ReturnType<typeof vi.fn>;
  createBackup: ReturnType<typeof vi.fn>;
  deleteBackup: ReturnType<typeof vi.fn>;
  restoreFromBackup: ReturnType<typeof vi.fn>;
};

describe('BackupManagerModal', () => {
  const mockCurrentData: AppData = {
    version: '1.0',
    projects: [{
      id: '1',
      name: 'Test Project',
      description: 'Test Description',
      isCompleted: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      todos: []
    }],
    settings: {
      theme: 'light',
      autoSave: true,
      showCompletedProjects: true,
      autoBackup: true,
      backupInterval: 24
    },
    metadata: {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      lastModified: new Date('2024-01-01T00:00:00.000Z'),
      totalProjects: 1,
      totalTodos: 0
    }
  };

  const mockSettings: AppSettings = {
    theme: 'light',
    autoSave: true,
    showCompletedProjects: true,
    autoBackup: true,
    backupInterval: 24,
    lastBackupTime: '2024-01-01T12:00:00.000Z'
  };

  const mockBackups: BackupMetadata[] = [
    {
      filename: 'backup_2024-01-02_10-00-00.json',
      createdAt: new Date('2024-01-02T10:00:00.000Z'),
      size: 1024,
      compressed: false,
      version: '1.0'
    },
    {
      filename: 'backup_2024-01-01_10-00-00.json',
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      size: 512,
      compressed: false,
      version: '1.0'
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentData: mockCurrentData,
    settings: mockSettings,
    onSettingsUpdate: vi.fn(),
    onDataRestore: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageManager.getBackupList.mockResolvedValue({
      success: true,
      backups: mockBackups
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render backup manager modal', async () => {
    await act(async () => {
      await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });
    });

    expect(screen.getByText('备份管理')).toBeInTheDocument();
    expect(screen.getByText('创建备份')).toBeInTheDocument();
    expect(screen.getByText('刷新')).toBeInTheDocument();
  });

  it('should load and display backup list on open', async () => {
    await act(async () => {
      await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });
    });

    await waitFor(() => {
      expect(mockStorageManager.getBackupList).toHaveBeenCalled();
    });

    // Should display backup files
    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
      expect(screen.getByText('backup_2024-01-01_10-00-00.json')).toBeInTheDocument();
    });

    // Should display file sizes
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
  });

  it('should handle empty backup list', async () => {
    mockStorageManager.getBackupList.mockResolvedValue({
      success: true,
      backups: []
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('暂无备份文件')).toBeInTheDocument();
    });
  });

  it('should handle backup list loading error', async () => {
    mockStorageManager.getBackupList.mockResolvedValue({
      success: false,
      error: {
        type: 'path_not_accessible',
        message: 'Failed to access backups',
        userFriendlyMessage: '无法访问备份目录'
      }
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('无法访问备份目录')).toBeInTheDocument();
    });
  });

  it('should create backup successfully', async () => {
    mockStorageManager.createBackup.mockResolvedValue({
      success: true,
      filename: 'backup_2024-01-03_10-00-00.json'
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    const createButton = screen.getByText('创建备份');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockStorageManager.createBackup).toHaveBeenCalledWith(mockCurrentData);
    });

    await waitFor(() => {
      expect(screen.getByText(/备份创建成功/)).toBeInTheDocument();
    });

    expect(defaultProps.onSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockSettings,
        lastBackupTime: expect.any(String)
      })
    );
  });

  it('should handle backup creation error', async () => {
    mockStorageManager.createBackup.mockResolvedValue({
      success: false,
      error: {
        type: 'network_error',
        message: 'Failed to create backup',
        userFriendlyMessage: '创建备份失败'
      }
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    const createButton = screen.getByText('创建备份');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('创建备份失败')).toBeInTheDocument();
    });
  });

  it('should delete backup with confirmation', async () => {
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    
    mockStorageManager.deleteBackup.mockResolvedValue({ success: true });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('backup_2024-01-02_10-00-00.json')
    );

    await waitFor(() => {
      expect(mockStorageManager.deleteBackup).toHaveBeenCalledWith('backup_2024-01-02_10-00-00.json');
    });
  });

  it('should not delete backup if not confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    
    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockStorageManager.deleteBackup).not.toHaveBeenCalled();
  });

  it('should restore from backup with confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    
    const restoredData = { ...mockCurrentData, version: '1.1' };
    mockStorageManager.restoreFromBackup.mockResolvedValue({
      success: true,
      data: restoredData
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('恢复');
    fireEvent.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('backup_2024-01-02_10-00-00.json')
    );

    await waitFor(() => {
      expect(mockStorageManager.restoreFromBackup).toHaveBeenCalledWith('backup_2024-01-02_10-00-00.json');
    });

    expect(defaultProps.onDataRestore).toHaveBeenCalledWith(restoredData);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should not restore backup if not confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    
    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('恢复');
    fireEvent.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockStorageManager.restoreFromBackup).not.toHaveBeenCalled();
  });

  it('should handle restore error', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    
    mockStorageManager.restoreFromBackup.mockResolvedValue({
      success: false,
      error: {
        type: 'network_error',
        message: 'Failed to restore',
        userFriendlyMessage: '恢复数据失败'
      }
    });

    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_2024-01-02_10-00-00.json')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('恢复');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('恢复数据失败')).toBeInTheDocument();
    });
  });

  it('should refresh backup list', async () => {
    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockStorageManager.getBackupList).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    });
  });

  it('should display backup settings information', async () => {
    await act(async () => {
      render(<BackupManagerModal {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('自动备份：')).toBeInTheDocument();
      expect(screen.getByText('已启用 (每 24 小时)')).toBeInTheDocument();
      expect(screen.getByText('上次备份：')).toBeInTheDocument();
    });
  });

  it('should display disabled auto backup status', async () => {
    const propsWithDisabledBackup = {
      ...defaultProps,
      settings: { ...mockSettings, autoBackup: false }
    };

    render(<BackupManagerModal {...propsWithDisabledBackup} />);

    await waitFor(() => {
      expect(screen.getByText('已禁用')).toBeInTheDocument();
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });
});