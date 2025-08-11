import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useUserPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('应该返回默认偏好设置', () => {
    const { result } = renderHook(() => useUserPreferences());
    
    expect(result.current.preferences).toEqual({
      projectOrder: [],
      collapsedProjects: [],
      searchHistory: [],
      statusFilter: ['active', 'completed']
    });
  });

  it('应该从localStorage加载已保存的偏好设置', () => {
    const savedPreferences = {
      projectOrder: [{ id: 'project1', order: 0 }],
      collapsedProjects: ['project2'],
      searchHistory: ['搜索词'],
      statusFilter: ['active']
    };

    localStorage.setItem('user-preferences', JSON.stringify(savedPreferences));

    const { result } = renderHook(() => useUserPreferences());
    
    expect(result.current.preferences.projectOrder).toEqual([{ id: 'project1', order: 0 }]);
    expect(result.current.preferences.collapsedProjects).toEqual(['project2']);
    expect(result.current.preferences.searchHistory).toEqual(['搜索词']);
    expect(result.current.preferences.statusFilter).toEqual(['active']);
  });

  describe('updateProjectOrder', () => {
    it('应该更新项目排序偏好', () => {
      const { result } = renderHook(() => useUserPreferences());
      const newOrder = [
        { id: 'project1', order: 0 },
        { id: 'project2', order: 1 }
      ];

      act(() => {
        result.current.updateProjectOrder(newOrder);
      });

      expect(result.current.preferences.projectOrder).toEqual(newOrder);
      
      // 检查localStorage
      const stored = JSON.parse(localStorage.getItem('user-preferences') || '{}');
      expect(stored.projectOrder).toEqual(newOrder);
    });

    it('应该验证无效的排序数据', () => {
      const { result } = renderHook(() => useUserPreferences());
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.updateProjectOrder('invalid' as unknown as { id: string; order: number }[]);
      });

      expect(consoleSpy).toHaveBeenCalledWith('项目排序数据必须是数组');
      expect(result.current.preferences.projectOrder).toEqual([]);
    });

    it('应该验证排序项的格式', () => {
      const { result } = renderHook(() => useUserPreferences());
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.updateProjectOrder([{ id: '', order: -1 }]);
      });

      expect(consoleSpy).toHaveBeenCalledWith('项目排序数据格式无效');
    });
  });

  describe('toggleProjectCollapse', () => {
    it('应该切换项目的折叠状态', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.toggleProjectCollapse('project1');
      });

      expect(result.current.preferences.collapsedProjects).toContain('project1');

      act(() => {
        result.current.toggleProjectCollapse('project1');
      });

      expect(result.current.preferences.collapsedProjects).not.toContain('project1');
    });
  });

  describe('setAllProjectsCollapsed', () => {
    it('应该设置所有项目为折叠状态', () => {
      const { result } = renderHook(() => useUserPreferences());
      const projectIds = ['project1', 'project2', 'project3'];

      act(() => {
        result.current.setAllProjectsCollapsed(true, projectIds);
      });

      expect(result.current.preferences.collapsedProjects).toEqual(projectIds);
    });

    it('应该设置所有项目为展开状态', () => {
      const { result } = renderHook(() => useUserPreferences());
      
      // 先设置一些项目为折叠状态
      act(() => {
        result.current.toggleProjectCollapse('project1');
        result.current.toggleProjectCollapse('project2');
      });

      const projectIds = ['project1', 'project2', 'project3'];

      act(() => {
        result.current.setAllProjectsCollapsed(false, projectIds);
      });

      expect(result.current.preferences.collapsedProjects).toEqual([]);
    });
  });

  describe('addSearchHistory', () => {
    it('应该添加搜索历史', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.addSearchHistory('搜索词1');
      });

      expect(result.current.preferences.searchHistory).toContain('搜索词1');
    });

    it('应该去重搜索历史并保持最新的在前', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.addSearchHistory('搜索词1');
        result.current.addSearchHistory('搜索词2');
        result.current.addSearchHistory('搜索词1'); // 重复添加
      });

      expect(result.current.preferences.searchHistory).toEqual(['搜索词1', '搜索词2']);
    });

    it('应该限制搜索历史最多5条', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        for (let i = 1; i <= 7; i++) {
          result.current.addSearchHistory(`搜索词${i}`);
        }
      });

      expect(result.current.preferences.searchHistory).toHaveLength(5);
      expect(result.current.preferences.searchHistory).toEqual([
        '搜索词7', '搜索词6', '搜索词5', '搜索词4', '搜索词3'
      ]);
    });

    it('应该忽略空白搜索词', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.addSearchHistory('  ');
        result.current.addSearchHistory('');
      });

      expect(result.current.preferences.searchHistory).toEqual([]);
    });
  });

  describe('clearSearchHistory', () => {
    it('应该清空搜索历史', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.addSearchHistory('搜索词1');
        result.current.clearSearchHistory();
      });

      expect(result.current.preferences.searchHistory).toEqual([]);
    });
  });

  describe('updateStatusFilter', () => {
    it('应该更新状态筛选器', () => {
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.updateStatusFilter(['active']);
      });

      expect(result.current.preferences.statusFilter).toEqual(['active']);
    });
  });

  describe('resetPreferences', () => {
    it('应该重置所有偏好设置', () => {
      const { result } = renderHook(() => useUserPreferences());

      // 先设置一些偏好
      act(() => {
        result.current.updateProjectOrder([{ id: 'project1', order: 0 }]);
        result.current.toggleProjectCollapse('project1');
        result.current.addSearchHistory('搜索词');
      });

      // 重置
      act(() => {
        result.current.resetPreferences();
      });

      expect(result.current.preferences).toEqual({
        projectOrder: [],
        collapsedProjects: [],
        searchHistory: [],
        statusFilter: ['active', 'completed']
      });

      expect(localStorage.getItem('user-preferences')).toBeNull();
    });
  });

  describe('便捷访问器', () => {
    it('isProjectCollapsed 应该正确判断项目是否折叠', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.isProjectCollapsed('project1')).toBe(false);

      act(() => {
        result.current.toggleProjectCollapse('project1');
      });

      expect(result.current.isProjectCollapsed('project1')).toBe(true);
    });

    it('getProjectOrder 应该返回项目的排序值', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.getProjectOrder('project1')).toBe(0);

      act(() => {
        result.current.updateProjectOrder([{ id: 'project1', order: 5 }]);
      });

      expect(result.current.getProjectOrder('project1')).toBe(5);
    });
  });

  describe('错误处理', () => {
    it('应该处理localStorage读取错误', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useUserPreferences());

      expect(consoleSpy).toHaveBeenCalledWith('加载用户偏好失败:', expect.any(Error));
    });

    it('应该处理localStorage写入错误', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useUserPreferences());

      act(() => {
        result.current.updateProjectOrder([{ id: 'project1', order: 0 }]);
      });

      expect(consoleSpy).toHaveBeenCalledWith('保存用户偏好失败:', expect.any(Error));
    });
  });
});