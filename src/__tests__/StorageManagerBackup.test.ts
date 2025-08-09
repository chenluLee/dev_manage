import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StorageManager } from '@/managers/StorageManager';
import { AppData, AppSettings } from '@/types';

// Mock FileSystem Access API
const createMockDirectoryHandle = () => {
  const files = new Map();
  
  return {
    name: 'test-directory',
    kind: 'directory' as const,
    getFileHandle: vi.fn().mockImplementation(async (filename: string, options?: { create?: boolean }) => {
      if (options?.create || files.has(filename)) {
        const mockFile = files.get(filename) || { content: '', size: 0, lastModified: Date.now() };
        files.set(filename, mockFile);
        
        return {
          name: filename,
          kind: 'file' as const,
          getFile: vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue(mockFile.content),
            size: mockFile.size,
            lastModified: mockFile.lastModified
          }),
          createWritable: vi.fn().mockResolvedValue({
            write: vi.fn().mockImplementation((content: string) => {
              mockFile.content = content;
              mockFile.size = content.length;
            }),
            close: vi.fn().mockResolvedValue(undefined)
          })
        };
      }
      throw new Error('NotFoundError');
    }),
    getDirectoryHandle: vi.fn().mockImplementation(async (dirname: string, options?: { create?: boolean }) => {
      if (dirname === 'backups') {
        const backupFiles = new Map();
        
        // Add some test backup files
        backupFiles.set('backup_2024-01-01_10-00-00.json', {
          content: JSON.stringify({ version: '1.0', projects: [], settings: {}, metadata: {} }),
          size: 100,
          lastModified: new Date('2024-01-01T10:00:00Z').getTime()
        });
        
        return {
          name: 'backups',
          kind: 'directory' as const,
          entries: vi.fn().mockImplementation(async function* () {
            for (const [filename, fileData] of backupFiles.entries()) {
              yield [filename, {
                name: filename,
                kind: 'file' as const,
                getFile: vi.fn().mockResolvedValue({
                  text: vi.fn().mockResolvedValue(fileData.content),
                  size: fileData.size,
                  lastModified: fileData.lastModified
                })
              }];
            }
          }),
          getFileHandle: vi.fn().mockImplementation(async (filename: string) => {
            if (backupFiles.has(filename)) {
              const fileData = backupFiles.get(filename);
              return {
                name: filename,
                kind: 'file' as const,
                getFile: vi.fn().mockResolvedValue({
                  text: vi.fn().mockResolvedValue(fileData.content),
                  size: fileData.size,
                  lastModified: fileData.lastModified
                })
              };
            }
            throw new Error('NotFoundError');
          }),
          removeEntry: vi.fn().mockImplementation(async (filename: string) => {
            if (backupFiles.has(filename)) {
              backupFiles.delete(filename);
            } else {
              throw new Error('NotFoundError');
            }
          })
        };
      }
      
      if (options?.create) {
        return createMockDirectoryHandle();
      }
      throw new Error('NotFoundError');
    }),
    removeEntry: vi.fn().mockResolvedValue(undefined)
  };
};

describe('StorageManager Backup Functionality', () => {
  let mockData: AppData;
  let mockSettings: AppSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockData = {
      version: '1.0',
      projects: [
        {
          id: '1',
          name: 'Test Project',
          description: 'Test Description',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          todos: []
        }
      ],
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

    mockSettings = {
      theme: 'light',
      autoSave: true,
      showCompletedProjects: true,
      autoBackup: true,
      backupInterval: 24,
      lastBackupTime: undefined
    };

    // Mock directory handle
    const mockDirectoryHandle = createMockDirectoryHandle();
    (StorageManager as any).directoryHandle = mockDirectoryHandle;
  });

  afterEach(() => {
    // Clean up
    (StorageManager as any).directoryHandle = null;
  });

  describe('isAutoBackupDue', () => {
    it('should return false when autoBackup is disabled', async () => {
      const settings = { ...mockSettings, autoBackup: false };
      const result = await StorageManager.isAutoBackupDue(settings);
      expect(result).toBe(false);
    });

    it('should return true when no previous backup exists', async () => {
      const settings = { ...mockSettings, lastBackupTime: undefined };
      const result = await StorageManager.isAutoBackupDue(settings);
      expect(result).toBe(true);
    });

    it('should return true when backup interval has passed', async () => {
      const lastBackup = new Date();
      lastBackup.setHours(lastBackup.getHours() - 25); // 25 hours ago
      
      const settings = { 
        ...mockSettings, 
        lastBackupTime: lastBackup.toISOString(),
        backupInterval: 24
      };
      
      const result = await StorageManager.isAutoBackupDue(settings);
      expect(result).toBe(true);
    });

    it('should return false when backup interval has not passed', async () => {
      const lastBackup = new Date();
      lastBackup.setHours(lastBackup.getHours() - 12); // 12 hours ago
      
      const settings = { 
        ...mockSettings, 
        lastBackupTime: lastBackup.toISOString(),
        backupInterval: 24
      };
      
      const result = await StorageManager.isAutoBackupDue(settings);
      expect(result).toBe(false);
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      const result = await StorageManager.createBackup(mockData);
      
      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.filename).toMatch(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should handle backup creation error', async () => {
      // Make getDirectoryHandle fail
      const mockDirectoryHandle = createMockDirectoryHandle();
      mockDirectoryHandle.getDirectoryHandle = vi.fn().mockRejectedValue(new Error('Permission denied'));
      (StorageManager as any).directoryHandle = mockDirectoryHandle;
      
      const result = await StorageManager.createBackup(mockData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('path_not_accessible');
    });

    it('should fall back to download when no directory handle', async () => {
      (StorageManager as any).directoryHandle = null;
      
      // Mock downloadExportedData
      vi.spyOn(StorageManager, 'downloadExportedData').mockResolvedValue({ success: true });
      
      const result = await StorageManager.createBackup(mockData);
      
      expect(result.success).toBe(true);
      expect(StorageManager.downloadExportedData).toHaveBeenCalled();
    });
  });

  describe('getBackupList', () => {
    it('should return backup list successfully', async () => {
      const result = await StorageManager.getBackupList();
      
      expect(result.success).toBe(true);
      expect(result.backups).toBeDefined();
      expect(Array.isArray(result.backups)).toBe(true);
      expect(result.backups.length).toBeGreaterThan(0);
      
      // Check first backup
      const firstBackup = result.backups[0];
      expect(firstBackup.filename).toBe('backup_2024-01-01_10-00-00.json');
      expect(firstBackup.size).toBe(100);
      expect(firstBackup.compressed).toBe(false);
    });

    it('should return empty list when no backups directory', async () => {
      const mockDirectoryHandle = createMockDirectoryHandle();
      mockDirectoryHandle.getDirectoryHandle = vi.fn().mockRejectedValue(new Error('NotFoundError'));
      (StorageManager as any).directoryHandle = mockDirectoryHandle;
      
      const result = await StorageManager.getBackupList();
      
      expect(result.success).toBe(true);
      expect(result.backups).toEqual([]);
    });

    it('should handle error when no directory handle', async () => {
      (StorageManager as any).directoryHandle = null;
      
      const result = await StorageManager.getBackupList();
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore from backup successfully', async () => {
      const result = await StorageManager.restoreFromBackup('backup_2024-01-01_10-00-00.json');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle backup file not found', async () => {
      const result = await StorageManager.restoreFromBackup('non-existent-backup.json');
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });

    it('should handle corrupted backup data', async () => {
      // Mock corrupted backup file
      const mockDirectoryHandle = createMockDirectoryHandle();
      const backupsDir = await mockDirectoryHandle.getDirectoryHandle('backups');
      backupsDir.getFileHandle = vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('invalid json content')
        })
      });
      
      const result = await StorageManager.restoreFromBackup('corrupted-backup.json');
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      const result = await StorageManager.deleteBackup('backup_2024-01-01_10-00-00.json');
      
      expect(result.success).toBe(true);
    });

    it('should handle backup file not found', async () => {
      const result = await StorageManager.deleteBackup('non-existent-backup.json');
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
    });
  });

  describe('performStartupBackupCheck', () => {
    it('should create backup when due', async () => {
      const settings = { ...mockSettings, lastBackupTime: undefined };
      
      const result = await StorageManager.performStartupBackupCheck(mockData, settings);
      
      expect(result.success).toBe(true);
      expect(result.backupCreated).toBe(true);
      expect(result.filename).toBeDefined();
    });

    it('should not create backup when not due', async () => {
      const recentBackup = new Date();
      recentBackup.setHours(recentBackup.getHours() - 1); // 1 hour ago
      
      const settings = { 
        ...mockSettings, 
        lastBackupTime: recentBackup.toISOString(),
        backupInterval: 24
      };
      
      const result = await StorageManager.performStartupBackupCheck(mockData, settings);
      
      expect(result.success).toBe(true);
      expect(result.backupCreated).toBe(false);
    });

    it('should handle backup creation failure', async () => {
      const mockDirectoryHandle = createMockDirectoryHandle();
      mockDirectoryHandle.getDirectoryHandle = vi.fn().mockRejectedValue(new Error('Permission denied'));
      (StorageManager as any).directoryHandle = mockDirectoryHandle;
      
      const settings = { ...mockSettings, lastBackupTime: undefined };
      
      const result = await StorageManager.performStartupBackupCheck(mockData, settings);
      
      expect(result.success).toBe(false);
      expect(result.backupCreated).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});