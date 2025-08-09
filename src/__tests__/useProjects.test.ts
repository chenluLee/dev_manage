import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjects } from '@/hooks/useProjects';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Mock useLocalStorage
const mockSetValue = vi.fn();
const mockImportFromJSON = vi.fn();
const mockExportToJSON = vi.fn();

vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(() => ({
    value: [],
    setValue: mockSetValue,
    importFromJSON: mockImportFromJSON,
    exportToJSON: mockExportToJSON
  }))
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetValue.mockClear();
  });

  describe('addProject', () => {
    it('应该添加有效项目', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      act(() => {
        result.current.addProject('新项目');
      });

      expect(mockSetValue).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: '新项目',
            description: '',
            isCompleted: false,
            todos: []
          })
        ])
      );
    });

    it('项目名称为空时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.addProject('');
        });
      }).toThrow('项目名称不能为空');
    });

    it('项目名称超过100字符时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.addProject('a'.repeat(101));
        });
      }).toThrow('项目名称不能超过100个字符');
    });
  });

  describe('addProject with existing projects', () => {
    beforeEach(() => {
      // Mock existing projects
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [
          {
            id: '1',
            name: '现有项目',
            description: '',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          }
        ],
        setValue: mockSetValue,
        importFromJSON: mockImportFromJSON,
        exportToJSON: mockExportToJSON
      });
    });

    it('重复项目名称时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.addProject('现有项目');
        });
      }).toThrow('项目名称已存在');
    });

    it('重复项目名称（忽略大小写）时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.addProject('现有项目');
        });
      }).toThrow('项目名称已存在');
    });
  });

  describe('updateProject', () => {
    beforeEach(() => {
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [
          {
            id: '1',
            name: '项目1',
            description: '描述1',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          },
          {
            id: '2',
            name: '项目2',
            description: '描述2',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          }
        ],
        setValue: mockSetValue,
        importFromJSON: mockImportFromJSON,
        exportToJSON: mockExportToJSON
      });
    });

    it('应该更新项目', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      act(() => {
        result.current.updateProject('1', { name: '更新的项目1' });
      });

      expect(mockSetValue).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: '更新的项目1',
            updatedAt: expect.any(String)
          }),
          expect.objectContaining({
            id: '2',
            name: '项目2'
          })
        ])
      );
    });

    it('更新的项目名称为空时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.updateProject('1', { name: '' });
        });
      }).toThrow('项目名称不能为空');
    });

    it('更新的项目名称超过100字符时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.updateProject('1', { name: 'a'.repeat(101) });
        });
      }).toThrow('项目名称不能超过100个字符');
    });

    it('更新的项目描述超过500字符时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.updateProject('1', { description: 'a'.repeat(501) });
        });
      }).toThrow('项目描述不能超过500个字符');
    });

    it('更新项目名称与其他项目重复时应该抛出错误', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(() => {
        act(() => {
          result.current.updateProject('1', { name: '项目2' });
        });
      }).toThrow('项目名称已存在');
    });
  });

  describe('deleteProject', () => {
    beforeEach(() => {
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [
          {
            id: '1',
            name: '项目1',
            description: '描述1',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          },
          {
            id: '2',
            name: '项目2',
            description: '描述2',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          }
        ],
        setValue: mockSetValue,
        importFromJSON: mockImportFromJSON,
        exportToJSON: mockExportToJSON
      });
    });

    it('应该删除指定项目', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      act(() => {
        result.current.deleteProject('1');
      });

      expect(mockSetValue).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '2',
          name: '项目2'
        })
      ]);
    });
  });

  describe('addTodo', () => {
    beforeEach(() => {
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [
          {
            id: '1',
            name: '项目1',
            description: '描述1',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          }
        ],
        setValue: mockSetValue,
        importFromJSON: mockImportFromJSON,
        exportToJSON: mockExportToJSON
      });
    });

    it('应该在指定项目中添加待办', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      act(() => {
        result.current.addTodo('1', '新待办');
      });

      expect(mockSetValue).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '1',
          todos: [
            expect.objectContaining({
              text: '新待办',
              isCompleted: false,
              order: 0,
              projectId: '1',
              subtasks: []
            })
          ],
          updatedAt: expect.any(String)
        })
      ]);
    });
  });

  describe('computed values', () => {
    beforeEach(() => {
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [
          {
            id: '1',
            name: '进行中项目',
            description: '',
            isCompleted: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          },
          {
            id: '2',
            name: '已完成项目',
            description: '',
            isCompleted: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            todos: []
          }
        ],
        setValue: mockSetValue,
        importFromJSON: mockImportFromJSON,
        exportToJSON: mockExportToJSON
      });
    });

    it('应该正确计算项目统计信息', () => {
      const { result } = renderHook(() => useProjects('test-key'));

      expect(result.current.computed.total).toBe(2);
      expect(result.current.computed.active).toBe(1);
      expect(result.current.computed.completed).toBe(1);
    });
  });
});