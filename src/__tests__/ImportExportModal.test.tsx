import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportExportModal from '@/components/ImportExportModal';
import { AppData } from '@/types';

// Mock StorageManager
vi.mock('@/managers/StorageManager', () => ({
  StorageManager: {
    downloadExportedData: vi.fn(),
    importDataFromFile: vi.fn()
  }
}));

// Mock format converter and validator
vi.mock('@/utils/formatConverters', () => ({
  FormatConverter: {
    getFormatInfo: vi.fn(() => ({
      format: 'pmapp',
      description: 'PMApp标准格式',
      confidence: 1.0
    })),
    convertToAppData: vi.fn(() => ({
      success: true,
      data: mockAppData
    }))
  }
}));

vi.mock('@/utils/dataValidation', () => ({
  DataValidator: {
    validateAppData: vi.fn(() => ({
      valid: true,
      errors: [],
      warnings: []
    })),
    sanitizeAppData: vi.fn((data) => data)
  }
}));

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

describe('ImportExportModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImportComplete = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    currentData: mockAppData,
    onImportComplete: mockOnImportComplete
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with current data statistics', () => {
    render(<ImportExportModal {...defaultProps} />);
    
    expect(screen.getByText('数据导入导出')).toBeInTheDocument();
    expect(screen.getByText('当前数据统计')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Projects count
  });

  it('should display export functionality', () => {
    render(<ImportExportModal {...defaultProps} />);
    
    expect(screen.getByText('导出数据')).toBeInTheDocument();
    expect(screen.getByText('导出为JSON文件')).toBeInTheDocument();
  });

  it('should display import functionality', () => {
    render(<ImportExportModal {...defaultProps} />);
    
    expect(screen.getByText('导入数据')).toBeInTheDocument();
    expect(screen.getByText('选择JSON文件')).toBeInTheDocument();
  });

  it('should handle export button click', async () => {
    const { StorageManager } = await import('@/managers/StorageManager');
    const { act } = await import('@testing-library/react');
    (StorageManager.downloadExportedData as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(<ImportExportModal {...defaultProps} />);
    
    const exportButton = screen.getByText('导出为JSON文件');
    
    await act(async () => {
      fireEvent.click(exportButton);
    });

    expect(StorageManager.downloadExportedData).toHaveBeenCalledWith(
      mockAppData,
      expect.stringMatching(/project-data-export-\d{4}-\d{2}-\d{2}\.json/)
    );
  });

  it('should show success message after successful export', async () => {
    const { StorageManager } = await import('@/managers/StorageManager');
    (StorageManager.downloadExportedData as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(<ImportExportModal {...defaultProps} />);
    
    const exportButton = screen.getByText('导出为JSON文件');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('数据导出成功')).toBeInTheDocument();
    });
  });

  it('should show error message when export fails', async () => {
    const { StorageManager } = await import('@/managers/StorageManager');
    (StorageManager.downloadExportedData as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: { userFriendlyMessage: '导出失败' }
    });

    render(<ImportExportModal {...defaultProps} />);
    
    const exportButton = screen.getByText('导出为JSON文件');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('导出失败')).toBeInTheDocument();
    });
  });

  it('should handle file selection for import', async () => {
    const mockFile = new File(['{"test": "data"}'], 'test.json', {
      type: 'application/json',
    });

    // Mock file text method
    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue('{"test": "data"}')
    });

    render(<ImportExportModal {...defaultProps} />);
    
    const fileInput = screen.getByRole('button', { name: /选择JSON文件/i });
    const hiddenInput = screen.getByRole('button', { name: /选择JSON文件/i }).previousElementSibling as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('导入预览')).toBeInTheDocument();
    });
  });

  it('should show format information in import preview', async () => {
    const mockFile = new File(['{"test": "data"}'], 'test.json', {
      type: 'application/json',
    });

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
    });

    render(<ImportExportModal {...defaultProps} />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('文件格式')).toBeInTheDocument();
      expect(screen.getByText('PMApp标准格式 (pmapp)')).toBeInTheDocument();
    });
  });

  it('should handle import confirmation', async () => {
    const mockFile = new File(['{"test": "data"}'], 'test.json', {
      type: 'application/json',
    });

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
    });

    render(<ImportExportModal {...defaultProps} />);
    
    // Simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('确认导入（覆盖现有数据）')).toBeInTheDocument();
    });

    // Click confirm import
    const confirmButton = screen.getByText('确认导入（覆盖现有数据）');
    fireEvent.click(confirmButton);

    expect(mockOnImportComplete).toHaveBeenCalledWith(mockAppData);
  });

  it('should handle import cancellation', async () => {
    const mockFile = new File(['{"test": "data"}'], 'test.json', {
      type: 'application/json',
    });

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
    });

    render(<ImportExportModal {...defaultProps} />);
    
    // Simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('取消导入')).toBeInTheDocument();
    });

    // Click cancel import
    const cancelButton = screen.getByText('取消导入');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('导入预览')).not.toBeInTheDocument();
    });
  });

  it('should show supported formats information', () => {
    render(<ImportExportModal {...defaultProps} />);
    
    expect(screen.getByText('支持的格式：')).toBeInTheDocument();
    expect(screen.getByText('PMApp 标准格式 - 完全支持')).toBeInTheDocument();
    expect(screen.getByText('Todoist 导出文件 - 自动转换项目和任务')).toBeInTheDocument();
    expect(screen.getByText('Trello 导出文件 - 列表转为项目，卡片转为任务')).toBeInTheDocument();
  });

  it('should handle JSON parsing errors', async () => {
    const mockFile = new File(['invalid json{'], 'test.json', {
      type: 'application/json',
    });

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue('invalid json{')
    });

    render(<ImportExportModal {...defaultProps} />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('文件不是有效的JSON格式')).toBeInTheDocument();
    });
  });

  it('should show validation warnings in import preview', async () => {
    const { DataValidator } = await import('@/utils/dataValidation');
    (DataValidator.validateAppData as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      errors: [],
      warnings: ['测试警告']
    });

    const mockFile = new File(['{"test": "data"}'], 'test.json', {
      type: 'application/json',
    });

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(mockAppData))
    });

    render(<ImportExportModal {...defaultProps} />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile]
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText('数据质量提醒:')).toBeInTheDocument();
      expect(screen.getByText('测试警告')).toBeInTheDocument();
    });
  });

  it('should not show modal when open is false', () => {
    render(<ImportExportModal {...defaultProps} open={false} />);
    
    expect(screen.queryByText('数据导入导出')).not.toBeInTheDocument();
  });
});