import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';

interface UserPreferences {
  projectOrder: {id: string, order: number}[];
  collapsedProjects: string[];
  searchHistory: string[];
  statusFilter: ('active' | 'completed')[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  projectOrder: [],
  collapsedProjects: [],
  searchHistory: [],
  statusFilter: ['active', 'completed']
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  
  // 从localStorage加载偏好设置
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
    }
  }, []);

  // 保存偏好设置到localStorage
  const savePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    try {
      const updated = { ...preferences, ...newPrefs };
      setPreferences(updated);
      localStorage.setItem('user-preferences', JSON.stringify(updated));
    } catch (error) {
      console.error('保存用户偏好失败:', error);
    }
  }, [preferences]);

  // 更新项目排序偏好
  const updateProjectOrder = useCallback((projectOrder: {id: string, order: number}[]) => {
    try {
      // 验证输入数据
      if (!Array.isArray(projectOrder)) {
        console.error('项目排序数据必须是数组');
        return;
      }
      
      // 验证每个排序项的格式
      const isValid = projectOrder.every(item => 
        item && 
        typeof item.id === 'string' && 
        typeof item.order === 'number' &&
        item.id.length > 0 &&
        item.order >= 0
      );
      
      if (!isValid) {
        console.error('项目排序数据格式无效');
        return;
      }
      
      savePreferences({ projectOrder });
    } catch (error) {
      console.error('更新项目排序偏好失败:', error);
    }
  }, [savePreferences]);

  // 切换项目折叠状态
  const toggleProjectCollapse = useCallback((projectId: string) => {
    const isCollapsed = preferences.collapsedProjects.includes(projectId);
    const updatedCollapsed = isCollapsed
      ? preferences.collapsedProjects.filter(id => id !== projectId)
      : [...preferences.collapsedProjects, projectId];
    
    savePreferences({ collapsedProjects: updatedCollapsed });
  }, [preferences.collapsedProjects, savePreferences]);

  // 批量设置项目折叠状态
  const setAllProjectsCollapsed = useCallback((collapsed: boolean, projectIds: string[]) => {
    const updatedCollapsed = collapsed ? projectIds : [];
    savePreferences({ collapsedProjects: updatedCollapsed });
  }, [savePreferences]);

  // 添加搜索历史
  const addSearchHistory = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    const trimmed = searchTerm.trim();
    setPreferences(prev => {
      const filtered = prev.searchHistory.filter(term => term !== trimmed);
      const updated = { ...prev, searchHistory: [trimmed, ...filtered].slice(0, 5) };
      
      try {
        localStorage.setItem('user-preferences', JSON.stringify(updated));
      } catch (error) {
        console.error('保存用户偏好失败:', error);
      }
      
      return updated;
    });
  }, []);

  // 清空搜索历史
  const clearSearchHistory = useCallback(() => {
    savePreferences({ searchHistory: [] });
  }, [savePreferences]);

  // 更新状态筛选器
  const updateStatusFilter = useCallback((statusFilter: ('active' | 'completed')[]) => {
    savePreferences({ statusFilter });
  }, [savePreferences]);

  // 重置所有偏好设置
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem('user-preferences');
  }, []);

  return {
    preferences,
    updateProjectOrder,
    toggleProjectCollapse,
    setAllProjectsCollapsed,
    addSearchHistory,
    clearSearchHistory,
    updateStatusFilter,
    resetPreferences,
    
    // 便捷访问器
    isProjectCollapsed: (projectId: string) => preferences.collapsedProjects.includes(projectId),
    getProjectOrder: (projectId: string) => preferences.projectOrder.find(p => p.id === projectId)?.order ?? 0
  };
}