import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { arrayMove, moveProject, sortProjectsByOrder } from '@/hooks/useDragDrop';
import { Project } from '@/types';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  useSensors: vi.fn(),
  useSensor: vi.fn(),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

describe('useDragDrop utilities', () => {
  describe('arrayMove', () => {
    it('应该正确移动数组元素', () => {
      const array = ['a', 'b', 'c', 'd'];
      const result = arrayMove(array, 1, 3);
      
      expect(result).toEqual(['a', 'c', 'd', 'b']);
    });

    it('应该处理向前移动', () => {
      const array = ['a', 'b', 'c', 'd'];
      const result = arrayMove(array, 3, 1);
      
      expect(result).toEqual(['a', 'd', 'b', 'c']);
    });

    it('应该不修改原数组', () => {
      const array = ['a', 'b', 'c', 'd'];
      const original = [...array];
      arrayMove(array, 1, 3);
      
      expect(array).toEqual(original);
    });
  });

  describe('moveProject', () => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: '项目1',
        description: '描述1',
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        order: 0,
        todos: []
      },
      {
        id: '2',
        name: '项目2',
        description: '描述2',
        isCompleted: false,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        order: 1,
        todos: []
      },
      {
        id: '3',
        name: '项目3',
        description: '描述3',
        isCompleted: false,
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        order: 2,
        todos: []
      }
    ];

    it('应该正确移动项目并更新order', () => {
      const result = moveProject(mockProjects, 0, 2);
      
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('2'); // 原来的第二个项目
      expect(result[1].id).toBe('3'); // 原来的第三个项目
      expect(result[2].id).toBe('1'); // 原来的第一个项目移动到最后
      
      // 检查order重新编号
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });

    it('应该更新所有项目的updatedAt时间戳', () => {
      const result = moveProject(mockProjects, 0, 2);
      
      result.forEach(project => {
        const originalProject = mockProjects.find(p => p.id === project.id);
        expect(new Date(project.updatedAt).getTime()).toBeGreaterThan(
          new Date(originalProject!.updatedAt).getTime()
        );
      });
    });
  });

  describe('sortProjectsByOrder', () => {
    it('应该根据order字段排序项目', () => {
      const projects: Project[] = [
        {
          id: '1',
          name: '项目1',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 2,
          todos: []
        },
        {
          id: '2',
          name: '项目2',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 0,
          todos: []
        },
        {
          id: '3',
          name: '项目3',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 1,
          todos: []
        }
      ];

      const result = sortProjectsByOrder(projects);
      
      expect(result[0].id).toBe('2'); // order: 0
      expect(result[1].id).toBe('3'); // order: 1
      expect(result[2].id).toBe('1'); // order: 2
    });

    it('应该处理缺少order字段的项目', () => {
      const projects: Project[] = [
        {
          id: '1',
          name: '项目1',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 1,
          todos: []
        },
        {
          id: '2',
          name: '项目2',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 0, // undefined会被当作0处理
          todos: []
        }
      ];

      const result = sortProjectsByOrder(projects);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // order: 0 (treated as 0)
      expect(result[1].id).toBe('1'); // order: 1
    });

    it('应该不修改原数组', () => {
      const projects: Project[] = [
        {
          id: '1',
          name: '项目1',
          description: '',
          isCompleted: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          order: 1,
          todos: []
        }
      ];

      const original = [...projects];
      sortProjectsByOrder(projects);
      
      expect(projects).toEqual(original);
    });
  });
});