import { AppData, AppSettings, BackupMetadata, BackupFile } from '@/types';
import { DataValidator, ValidationResult } from '@/utils/dataValidation';

export interface StorageError {
  type: 'permission_denied' | 'path_not_accessible' | 'insufficient_space' | 'network_error' | 'api_not_supported' | 'path_not_found' | 'quota_exceeded';
  message: string;
  userFriendlyMessage: string;
  suggestion?: string;
  originalError?: Error;
}

export interface StorageHealthCheck {
  isHealthy: boolean;
  warnings: string[];
  errors: StorageError[];
  diskSpace?: {
    available: number;
    total: number;
    used: number;
  };
}

class StorageManagerClass {
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private isAPISupported = false;
  private readonly STORAGE_HANDLE_KEY = 'pmapp:directoryHandle';
  private readonly DEFAULT_PATH_KEY = 'pmapp:defaultStoragePath';

  constructor() {
    this.isAPISupported = 'showDirectoryPicker' in window;
    this.loadPersistedDirectoryHandle();
  }

  private async loadPersistedDirectoryHandle(): Promise<void> {
    if (!this.isAPISupported || !('indexedDB' in window)) {
      return;
    }

    try {
      const db = await this.openHandleDB();
      const transaction = db.transaction(['handles'], 'readonly');
      const store = transaction.objectStore('handles');
      const request = store.get(this.STORAGE_HANDLE_KEY);

      request.onsuccess = () => {
        if (request.result) {
          this.directoryHandle = request.result.handle;
        }
      };
    } catch (error) {
      console.warn('Failed to load persisted directory handle:', error);
    }
  }

  private async openHandleDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pmapp-handles', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
    });
  }

  private async persistDirectoryHandle(): Promise<void> {
    if (!this.directoryHandle || !this.isAPISupported || !('indexedDB' in window)) {
      return;
    }

    try {
      const db = await this.openHandleDB();
      const transaction = db.transaction(['handles'], 'readwrite');
      const store = transaction.objectStore('handles');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ handle: this.directoryHandle }, this.STORAGE_HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to persist directory handle:', error);
    }
  }

  async clearPersistedDirectoryHandle(): Promise<void> {
    if (!this.isAPISupported || !('indexedDB' in window)) {
      return;
    }

    try {
      const db = await this.openHandleDB();
      const transaction = db.transaction(['handles'], 'readwrite');
      const store = transaction.objectStore('handles');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(this.STORAGE_HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to clear persisted directory handle:', error);
    }
  }

  isFileSystemAccessSupported(): boolean {
    return this.isAPISupported;
  }

  async requestDirectoryAccess(): Promise<{ success: boolean; error?: StorageError }> {
    if (!this.isAPISupported) {
      return {
        success: false,
        error: {
          type: 'api_not_supported',
          message: 'File System Access API not supported',
          userFriendlyMessage: '您的浏览器不支持文件系统访问功能',
          suggestion: '请使用Chrome 86+、Edge 86+或Firefox 108+浏览器以获得完整功能'
        }
      };
    }

    try {
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'project-storage-directory'
      });
      
      this.directoryHandle = directoryHandle;
      await this.persistDirectoryHandle();
      return { success: true };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: {
            type: 'permission_denied',
            message: 'User cancelled directory selection',
            userFriendlyMessage: '用户取消了目录选择',
            suggestion: '请重新选择存储目录以启用文件系统存储功能'
          }
        };
      }

      return {
        success: false,
        error: {
          type: 'permission_denied',
          message: 'Directory access failed',
          userFriendlyMessage: '无法访问所选目录',
          suggestion: '请检查目录权限，或尝试选择其他目录',
          originalError: error as Error
        }
      };
    }
  }

  async validateDirectoryAccess(): Promise<{ valid: boolean; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        valid: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const testFileName = `.test-${Date.now()}.tmp`;
      const testFileHandle = await this.directoryHandle.getFileHandle(testFileName, { create: true });
      const writable = await testFileHandle.createWritable();
      await writable.write('test');
      await writable.close();
      
      await this.directoryHandle.removeEntry(testFileName);
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          type: 'path_not_accessible',
          message: '无法在所选目录中创建文件，请检查写入权限',
          originalError: error as Error
        }
      };
    }
  }

  getSelectedDirectoryName(): string | null {
    return this.directoryHandle?.name || null;
  }

  getSelectedDirectoryPath(): string {
    if (!this.directoryHandle) {
      return '';
    }
    return this.directoryHandle.name;
  }

  async saveDataToDirectory(data: AppData): Promise<{ success: boolean; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const fileName = 'project-data.json';
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '保存数据到文件系统失败',
          originalError: error as Error
        }
      };
    }
  }

  async loadDataFromDirectory(): Promise<{ data?: AppData; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const fileName = 'project-data.json';
      const fileHandle = await this.directoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = JSON.parse(content) as AppData;
      
      return { data };
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        return {
          error: {
            type: 'path_not_accessible',
            message: '数据文件不存在'
          }
        };
      }
      
      return {
        error: {
          type: 'path_not_accessible',
          message: '读取数据文件失败',
          originalError: error as Error
        }
      };
    }
  }

  async clearStoragePath(): Promise<void> {
    this.directoryHandle = null;
    await this.clearPersistedDirectoryHandle();
  }

  getDefaultStoragePath(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(this.DEFAULT_PATH_KEY) || this.getBrowserDefaultPath();
    }
    return this.getBrowserDefaultPath();
  }

  setDefaultStoragePath(path: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (path) {
        window.localStorage.setItem(this.DEFAULT_PATH_KEY, path);
      } else {
        window.localStorage.removeItem(this.DEFAULT_PATH_KEY);
      }
    }
  }

  private getBrowserDefaultPath(): string {
    if (!this.isAPISupported) {
      return 'LocalStorage (浏览器本地存储)';
    }
    return '~/Documents/ProjectManager';
  }

  useDefaultStorageIfNoneSelected(currentPath?: string): string {
    if (!currentPath || currentPath.trim() === '') {
      const defaultPath = this.getDefaultStoragePath();
      this.setDefaultStoragePath(defaultPath);
      return defaultPath;
    }
    return currentPath;
  }

  async performHealthCheck(): Promise<StorageHealthCheck> {
    const result: StorageHealthCheck = {
      isHealthy: true,
      warnings: [],
      errors: []
    };

    if (!this.isAPISupported) {
      result.warnings.push('文件系统访问API不可用，仅能使用浏览器本地存储');
    }

    if (this.directoryHandle) {
      try {
        const validation = await this.validateDirectoryAccess();
        if (!validation.valid && validation.error) {
          result.errors.push(validation.error);
          result.isHealthy = false;
        }

        const storageResult = await this.checkStorageQuota();
        if (storageResult.warnings.length > 0) {
          result.warnings.push(...storageResult.warnings);
        }
        if (storageResult.errors.length > 0) {
          result.errors.push(...storageResult.errors);
          result.isHealthy = false;
        }
      } catch (error) {
        result.errors.push({
          type: 'path_not_accessible',
          message: 'Health check failed',
          userFriendlyMessage: '存储健康检查失败',
          suggestion: '请重新选择存储目录',
          originalError: error as Error
        });
        result.isHealthy = false;
      }
    }

    return result;
  }

  private async checkStorageQuota(): Promise<{ warnings: string[]; errors: StorageError[] }> {
    const warnings: string[] = [];
    const errors: StorageError[] = [];

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage) {
          const usagePercent = (estimate.usage / estimate.quota) * 100;
          
          if (usagePercent > 90) {
            errors.push({
              type: 'insufficient_space',
              message: 'Storage quota nearly full',
              userFriendlyMessage: '存储空间不足',
              suggestion: '请清理浏览器数据或选择其他存储位置'
            });
          } else if (usagePercent > 75) {
            warnings.push('存储空间使用超过75%，建议清理数据');
          }
        }
      } catch (error) {
        warnings.push('无法检查存储配额');
      }
    }

    return { warnings, errors };
  }

  restoreDirectoryHandle(handle: FileSystemDirectoryHandle): void {
    this.directoryHandle = handle;
  }

  // 导出数据为JSON格式
  async exportData(data: AppData): Promise<{ success: boolean; blob?: Blob; error?: StorageError }> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      return { success: true, blob };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'network_error',
          message: 'Failed to serialize data',
          userFriendlyMessage: '数据序列化失败',
          originalError: error as Error
        }
      };
    }
  }

  // 下载导出的JSON文件
  async downloadExportedData(data: AppData, filename?: string): Promise<{ success: boolean; error?: StorageError }> {
    try {
      const exportResult = await this.exportData(data);
      if (!exportResult.success || !exportResult.blob) {
        return { success: false, error: exportResult.error };
      }

      const url = URL.createObjectURL(exportResult.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `project-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'network_error',
          message: 'Failed to download export file',
          userFriendlyMessage: '下载导出文件失败',
          originalError: error as Error
        }
      };
    }
  }

  // 导入数据文件验证
  async importDataFromFile(file: File): Promise<{ success: boolean; data?: AppData; error?: StorageError }> {
    try {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Invalid file format',
            userFriendlyMessage: '文件格式无效，请选择JSON文件',
            suggestion: '支持的文件格式：.json'
          }
        };
      }

      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent) as AppData;

      // 基本数据结构验证
      const validationResult = this.validateImportedData(importedData);
      if (!validationResult.valid) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Invalid data structure',
            userFriendlyMessage: '数据结构验证失败',
            suggestion: validationResult.error || '请检查文件内容格式'
          }
        };
      }

      return { success: true, data: importedData };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'network_error',
          message: 'Failed to parse import file',
          userFriendlyMessage: '解析导入文件失败',
          suggestion: '请检查文件内容是否为有效的JSON格式',
          originalError: error as Error
        }
      };
    }
  }

  // 验证导入数据的完整性
  private validateImportedData(data: unknown): { valid: boolean; error?: string; validationResult?: ValidationResult } {
    try {
      const validationResult = DataValidator.validateAppData(data, { 
        checkIds: true, 
        allowPartialData: false, 
        strictMode: true 
      });

      if (!validationResult.valid) {
        const firstError = validationResult.errors[0] || '数据验证失败';
        return { 
          valid: false, 
          error: firstError,
          validationResult 
        };
      }

      return { valid: true, validationResult };
    } catch (error) {
      return { 
        valid: false, 
        error: '数据验证过程中发生错误'
      };
    }
  }

  // 获取完整的验证结果
  getDetailedValidationResult(data: unknown): ValidationResult {
    return DataValidator.validateAppData(data, { 
      checkIds: true, 
      allowPartialData: false, 
      strictMode: false // 使用宽松模式获取所有警告
    });
  }

  // 保存导入的数据到选定目录
  async saveImportedDataToDirectory(data: AppData, overwrite: boolean = false): Promise<{ success: boolean; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录，无法保存导入的数据'
        }
      };
    }

    if (!overwrite) {
      // 检查现有数据
      const existingDataResult = await this.loadDataFromDirectory();
      if (existingDataResult.data) {
        return {
          success: false,
          error: {
            type: 'path_not_accessible',
            message: '存储目录中已存在数据',
            userFriendlyMessage: '目标位置已有数据，请选择是否覆盖或合并',
            suggestion: '使用覆盖模式或选择其他存储目录'
          }
        };
      }
    }

    return await this.saveDataToDirectory(data);
  }

  // 备份功能

  // 检查是否需要自动备份
  async isAutoBackupDue(settings: AppSettings): Promise<boolean> {
    if (!settings.autoBackup) {
      return false;
    }

    if (!settings.lastBackupTime) {
      return true; // 从未备份，需要立即备份
    }

    const lastBackup = new Date(settings.lastBackupTime);
    const now = new Date();
    const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastBackup >= settings.backupInterval;
  }

  // 创建备份
  async createBackup(data: AppData): Promise<{ success: boolean; filename?: string; error?: StorageError }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const dateStr = timestamp[0];
      const timeStr = timestamp[1].split('Z')[0];
      const filename = `backup_${dateStr}_${timeStr}.json`;

      if (this.directoryHandle) {
        // 创建backups子目录
        let backupsDir: FileSystemDirectoryHandle;
        try {
          backupsDir = await this.directoryHandle.getDirectoryHandle('backups', { create: true });
        } catch (error) {
          return {
            success: false,
            error: {
              type: 'path_not_accessible',
              message: 'Failed to create backups directory',
              userFriendlyMessage: '无法创建备份目录',
              originalError: error as Error
            }
          };
        }

        // 创建备份文件
        const fileHandle = await backupsDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        return { success: true, filename };
      } else {
        // 降级到下载方式
        return await this.downloadExportedData(data, filename);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'network_error',
          message: 'Failed to create backup',
          userFriendlyMessage: '创建备份失败',
          originalError: error as Error
        }
      };
    }
  }

  // 获取备份列表
  async getBackupList(): Promise<{ success: boolean; backups?: BackupMetadata[]; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const backupsDir = await this.directoryHandle.getDirectoryHandle('backups');
      const backups: BackupMetadata[] = [];

      for await (const [filename, handle] of backupsDir.entries()) {
        if (handle.kind === 'file' && filename.endsWith('.json')) {
          const file = await handle.getFile();
          backups.push({
            filename,
            createdAt: new Date(file.lastModified),
            size: file.size,
            compressed: false, // 暂时不支持压缩
            version: '1.0'
          });
        }
      }

      // 按创建时间倒序排序
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return { success: true, backups };
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        return { success: true, backups: [] }; // 备份目录不存在，返回空列表
      }

      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: 'Failed to access backups directory',
          userFriendlyMessage: '无法访问备份目录',
          originalError: error as Error
        }
      };
    }
  }

  // 从备份恢复数据
  async restoreFromBackup(filename: string): Promise<{ success: boolean; data?: AppData; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const backupsDir = await this.directoryHandle.getDirectoryHandle('backups');
      const fileHandle = await backupsDir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = JSON.parse(content) as AppData;

      // 验证备份数据
      const validationResult = this.validateImportedData(data);
      if (!validationResult.valid) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Invalid backup data',
            userFriendlyMessage: '备份数据验证失败',
            suggestion: validationResult.error || '备份文件可能已损坏'
          }
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: 'Failed to restore from backup',
          userFriendlyMessage: '从备份恢复数据失败',
          originalError: error as Error
        }
      };
    }
  }

  // 删除备份文件
  async deleteBackup(filename: string): Promise<{ success: boolean; error?: StorageError }> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: '未选择存储目录'
        }
      };
    }

    try {
      const backupsDir = await this.directoryHandle.getDirectoryHandle('backups');
      await backupsDir.removeEntry(filename);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'path_not_accessible',
          message: 'Failed to delete backup',
          userFriendlyMessage: '删除备份文件失败',
          originalError: error as Error
        }
      };
    }
  }

  // 启动时自动备份检查
  async performStartupBackupCheck(data: AppData, settings: AppSettings): Promise<{ 
    success: boolean; 
    backupCreated?: boolean; 
    filename?: string; 
    error?: StorageError 
  }> {
    try {
      const needsBackup = await this.isAutoBackupDue(settings);
      
      if (!needsBackup) {
        return { success: true, backupCreated: false };
      }

      const backupResult = await this.createBackup(data);
      
      if (backupResult.success) {
        return { 
          success: true, 
          backupCreated: true, 
          filename: backupResult.filename 
        };
      } else {
        return { 
          success: false, 
          backupCreated: false, 
          error: backupResult.error 
        };
      }
    } catch (error) {
      return {
        success: false,
        backupCreated: false,
        error: {
          type: 'network_error',
          message: 'Startup backup check failed',
          userFriendlyMessage: '启动时备份检查失败',
          originalError: error as Error
        }
      };
    }
  }
}

export const StorageManager = new StorageManagerClass();