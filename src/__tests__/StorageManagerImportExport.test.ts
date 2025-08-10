import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageManager } from '@/managers/StorageManager';
import { AppData } from '@/types';

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

global.document = {
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  }
} as unknown as Document;

global.URL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
} as unknown as typeof URL;

describe('StorageManager - Import/Export', () => {
  const mockAppData: AppData = {
    version: '1.0.0',
    projects: [
      {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        todos: [
          {
            id: 'todo-1',
            text: 'Test Todo',
            isCompleted: false,
            order: 0,
            subtasks: [],
            projectId: 'project-1'
          }
        ]
      }
    ],
    settings: {
      theme: 'auto',
      autoSave: true,
      showCompletedProjects: true
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-01'),
      totalProjects: 1,
      totalTodos: 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({
      click: mockClick,
      href: '',
      download: ''
    });
  });

  describe('exportData', () => {
    it('should successfully export data as JSON blob', async () => {
      const result = await StorageManager.exportData(mockAppData);
      
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob?.type).toBe('application/json');
    });

    it('should handle export errors', async () => {
      // Mock JSON.stringify to throw error
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn(() => {
        throw new Error('Stringify error');
      });

      const result = await StorageManager.exportData(mockAppData);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.userFriendlyMessage).toBe('数据序列化失败');

      // Restore original
      JSON.stringify = originalStringify;
    });
  });

  describe('downloadExportedData', () => {
    it('should create download link and trigger download', async () => {
      const result = await StorageManager.downloadExportedData(mockAppData, 'test-export.json');
      
      expect(result.success).toBe(true);
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should use default filename if none provided', async () => {
      const mockElement = {
        click: mockClick,
        href: '',
        download: ''
      };
      mockCreateElement.mockReturnValue(mockElement);

      const result = await StorageManager.downloadExportedData(mockAppData);
      
      expect(result.success).toBe(true);
      expect(mockElement.download).toMatch(/project-data-export-\d{4}-\d{2}-\d{2}\.json/);
    });
  });

  describe('importDataFromFile', () => {
    it('should successfully import valid JSON file', async () => {
      const mockFile = {
        type: 'application/json',
        name: 'test.json',
        text: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
      } as unknown as File;

      const result = await StorageManager.importDataFromFile(mockFile);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAppData);
    });

    it('should reject non-JSON files', async () => {
      const mockFile = {
        type: 'text/plain',
        name: 'test.txt',
        text: vi.fn().mockResolvedValue('plain text')
      } as unknown as File;

      const result = await StorageManager.importDataFromFile(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.userFriendlyMessage).toBe('文件格式无效，请选择JSON文件');
    });

    it('should handle JSON parsing errors', async () => {
      const mockFile = {
        type: 'application/json',
        name: 'test.json',
        text: vi.fn().mockResolvedValue('invalid json{')
      } as unknown as File;

      const result = await StorageManager.importDataFromFile(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.userFriendlyMessage).toBe('解析导入文件失败');
    });

    it('should validate imported data structure', async () => {
      const invalidData = {
        version: '1.0.0',
        // Missing projects array
        settings: {},
        metadata: {}
      };

      const mockFile = {
        type: 'application/json',
        name: 'test.json',
        text: vi.fn().mockResolvedValue(JSON.stringify(invalidData))
      } as unknown as File;

      const result = await StorageManager.importDataFromFile(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.userFriendlyMessage).toBe('数据结构验证失败');
    });

    it('should accept .json file extension when MIME type is missing', async () => {
      const mockFile = {
        type: '',
        name: 'test.json',
        text: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
      } as unknown as File;

      const result = await StorageManager.importDataFromFile(mockFile);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAppData);
    });
  });

  describe('getDetailedValidationResult', () => {
    it('should return validation result for valid data', () => {
      const result = StorageManager.getDetailedValidationResult(mockAppData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid data', () => {
      const invalidData = {
        version: '',  // Invalid version
        projects: 'not an array',  // Invalid projects
        settings: null,  // Invalid settings
        metadata: 'invalid'  // Invalid metadata
      };

      const result = StorageManager.getDetailedValidationResult(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('saveImportedDataToDirectory', () => {
    it('should fail when no directory is selected', async () => {
      // Ensure no directory handle is set
      await StorageManager.clearStoragePath();
      
      const result = await StorageManager.saveImportedDataToDirectory(mockAppData);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('path_not_accessible');
      expect(result.error?.message).toBe('未选择存储目录，无法保存导入的数据');
    });
  });
});