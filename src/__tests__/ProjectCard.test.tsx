import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCard from '@/components/ProjectCard';
import { Project } from '@/types';
import { DndContext, DragOverlay } from '@dnd-kit/core';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensors: vi.fn(),
  useSensor: vi.fn(),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  rectSortingStrategy: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => 'transform: translate3d(0, 0, 0)'),
    },
    Translate: {
      toString: vi.fn(() => 'transform: translate3d(0, 0, 0)'),
    },
  },
}));

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: '1',
    name: '测试项目',
    description: '测试描述',
    isCompleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    order: 0,
    todos: [
      {
        id: 'todo1',
        text: '测试任务',
        isCompleted: false,
        order: 0,
        projectId: '1',
        subtasks: []
      }
    ]
  };

  const defaultProps = {
    project: mockProject,
    onUpdateProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onAddTodo: vi.fn(),
    onUpdateTodo: vi.fn(),
    onDeleteTodo: vi.fn(),
    onReorderTodos: vi.fn(),
    onAddSubtask: vi.fn(),
    onUpdateSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    onReorderSubtasks: vi.fn(),
  };

  it('应该渲染项目信息', () => {
    render(<ProjectCard {...defaultProps} />);
    
    expect(screen.getByText('测试项目')).toBeInTheDocument();
    expect(screen.getByText('测试描述')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('0/1 已完成')).toBeInTheDocument();
  });

  it('应该显示已完成项目的状态', () => {
    const completedProject = { ...mockProject, isCompleted: true };
    render(<ProjectCard {...defaultProps} project={completedProject} />);
    
    expect(screen.getByText('已结束')).toBeInTheDocument();
  });

  it('应该处理项目名称双击编辑', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const nameElement = screen.getByText('测试项目');
    fireEvent.doubleClick(nameElement);
    
    expect(screen.getByDisplayValue('测试项目')).toBeInTheDocument();
  });

  it('应该处理项目描述双击编辑', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const descElement = screen.getByText('测试描述');
    fireEvent.doubleClick(descElement);
    
    expect(screen.getByDisplayValue('测试描述')).toBeInTheDocument();
  });

  it('应该调用状态切换', () => {
    const onUpdateProject = vi.fn();
    render(<ProjectCard {...defaultProps} onUpdateProject={onUpdateProject} />);
    
    const statusButton = screen.getByLabelText('切换状态');
    fireEvent.click(statusButton);
    
    expect(onUpdateProject).toHaveBeenCalledWith({ isCompleted: true });
  });

  it('应该显示添加待办按钮', () => {
    const onAddTodo = vi.fn();
    render(<ProjectCard {...defaultProps} onAddTodo={onAddTodo} />);
    
    const addButton = screen.getByText('+ 快速添加待办');
    fireEvent.click(addButton);
    
    expect(onAddTodo).toHaveBeenCalledWith('新的待办');
  });

  it('应该支持展开/收起', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const toggleButton = screen.getByText('收起');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('展开')).toBeInTheDocument();
  });

  it('应该显示项目名称验证错误', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const nameElement = screen.getByText('测试项目');
    fireEvent.doubleClick(nameElement);
    
    const input = screen.getByDisplayValue('测试项目') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    
    expect(screen.getByText('项目名称不能为空')).toBeInTheDocument();
  });

  it('应该显示项目描述长度限制', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const descElement = screen.getByText('测试描述');
    fireEvent.doubleClick(descElement);
    
    expect(screen.getByText('4/500')).toBeInTheDocument();
  });

  it('应该显示项目描述验证错误', () => {
    render(<ProjectCard {...defaultProps} />);
    
    const descElement = screen.getByText('测试描述');
    fireEvent.doubleClick(descElement);
    
    const input = screen.getByDisplayValue('测试描述') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a'.repeat(501) } });
    
    expect(screen.getByText('项目描述不能超过500个字符')).toBeInTheDocument();
  });

  describe('拖拽功能', () => {
    it('应该显示拖拽手柄', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const dragHandle = screen.getByLabelText('拖拽项目卡片');
      expect(dragHandle).toBeInTheDocument();
    });

    it('应该在拖拽时应用正确的样式', () => {
      render(<ProjectCard {...defaultProps} isDragging={true} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({ opacity: '0.5' });
    });

    it('应该在编辑时禁用拖拽手柄', () => {
      render(<ProjectCard {...defaultProps} />);
      
      // 进入编辑模式
      const nameElement = screen.getByText('测试项目');
      fireEvent.doubleClick(nameElement);
      
      const dragHandle = screen.getByLabelText('拖拽项目卡片');
      expect(dragHandle).toHaveClass('pointer-events-none');
    });
  });

  describe('搜索高亮功能', () => {
    it('应该高亮匹配的项目名称', () => {
      render(<ProjectCard {...defaultProps} highlightedText="项目" />);
      
      const highlightedElements = screen.getAllByText('项目');
      expect(highlightedElements.length).toBeGreaterThan(0);
      expect(highlightedElements[0].tagName).toBe('MARK');
    });

    it('应该高亮匹配的项目描述', () => {
      render(<ProjectCard {...defaultProps} highlightedText="描述" />);
      
      const highlightedText = screen.getByText('描述');
      expect(highlightedText).toBeInTheDocument();
      expect(highlightedText.tagName).toBe('MARK');
    });

    it('应该处理大小写不敏感的搜索', () => {
      render(<ProjectCard {...defaultProps} highlightedText="项目" />);
      
      const highlightedElements = screen.getAllByText('项目');
      expect(highlightedElements.length).toBeGreaterThan(0);
      expect(highlightedElements[0].tagName).toBe('MARK');
    });
  });

  describe('折叠功能', () => {
    it('应该支持外部控制的折叠状态', () => {
      const onToggleCollapse = vi.fn();
      render(<ProjectCard {...defaultProps} isCollapsed={true} onToggleCollapse={onToggleCollapse} />);
      
      const toggleButton = screen.getByText('展开');
      expect(toggleButton).toBeInTheDocument();
    });

    it('应该在点击折叠按钮时调用回调', () => {
      const onToggleCollapse = vi.fn();
      render(<ProjectCard {...defaultProps} isCollapsed={false} onToggleCollapse={onToggleCollapse} />);
      
      const toggleButton = screen.getByText('收起');
      fireEvent.click(toggleButton);
      
      expect(onToggleCollapse).toHaveBeenCalled();
    });

    it('应该在没有外部控制时使用内部状态', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const toggleButton = screen.getByText('收起');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('展开')).toBeInTheDocument();
    });
  });
});