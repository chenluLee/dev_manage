import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import TodoItem from '@/components/TodoItem';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(() => 'transform: translate3d(0, 0, 0)'),
    },
  },
}));

// Mock useDndSensors hook
vi.mock('@/hooks/useDragDrop', () => ({
  useDndSensors: () => [],
}));

describe('TodoItem', () => {
  const mockTodo = {
    id: 'test-todo-1',
    text: '测试待办事项',
    isCompleted: false,
    order: 0,
    projectId: 'test-project-1',
    subtasks: [],
  };

  const mockCompletedTodo = {
    id: 'test-todo-2',
    text: '已完成的待办事项',
    isCompleted: true,
    order: 1,
    projectId: 'test-project-1',
    subtasks: [],
    completedAt: '2025-01-14T10:30:00.000Z',
  };

  const mockProps = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onAddSubtask: vi.fn(),
    onUpdateSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    onReorderSubtasks: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders todo item correctly', () => {
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    expect(screen.getByText('测试待办事项')).toBeInTheDocument();
    expect(screen.getByLabelText('标记为已完成')).toBeInTheDocument();
  });

  it('displays completion date when todo is completed and hovered', async () => {
    render(<TodoItem todo={mockCompletedTodo} {...mockProps} />);
    
    const todoElement = screen.getByRole('listitem');
    const expectedDate = format(new Date(mockCompletedTodo.completedAt!), 'yyyy-MM-dd');
    
    // 初始状态下不应显示完成日期
    expect(screen.queryByText(`完成于 ${expectedDate}`)).not.toBeInTheDocument();
    
    // 模拟鼠标悬停
    fireEvent.mouseEnter(todoElement);
    
    // 悬停后应显示完成日期
    await waitFor(() => {
      expect(screen.getByText(`完成于 ${expectedDate}`)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
  });

  it('does not display completion date when todo is not completed', () => {
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument();
  });

  it('calls onUpdate with completedAt when marking as completed', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    const completeButton = screen.getByLabelText('标记为已完成');
    await user.click(completeButton);
    
    expect(mockProps.onUpdate).toHaveBeenCalledWith({
      isCompleted: true,
      completedAt: expect.any(String),
    });
    
    const callArgs = mockProps.onUpdate.mock.calls[0][0];
    expect(callArgs.completedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('calls onUpdate with undefined completedAt when marking as uncompleted', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockCompletedTodo} {...mockProps} />);
    
    const uncompleteButton = screen.getByLabelText('标记为未完成');
    await user.click(uncompleteButton);
    
    expect(mockProps.onUpdate).toHaveBeenCalledWith({
      isCompleted: false,
      completedAt: undefined,
    });
  });

  it('allows editing todo text on double click', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    const textElement = screen.getByText('测试待办事项');
    await user.dblClick(textElement);
    
    const input = screen.getByDisplayValue('测试待办事项');
    expect(input).toBeInTheDocument();
    
    await user.clear(input);
    await user.type(input, '修改后的待办事项');
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith({ text: '修改后的待办事项' });
    });
  });

  it('shows subtask count when subtasks exist', () => {
    const todoWithSubtasks = {
      ...mockTodo,
      subtasks: [
        { id: 'sub1', text: '子任务1', isCompleted: true, order: 0, todoId: mockTodo.id },
        { id: 'sub2', text: '子任务2', isCompleted: false, order: 1, todoId: mockTodo.id },
      ],
    };
    
    render(<TodoItem todo={todoWithSubtasks} {...mockProps} />);
    
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('calls onAddSubtask when add subtask button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    // Need to hover to show the add subtask button
    const todoContainer = screen.getByRole('listitem');
    await user.hover(todoContainer);
    
    const addButton = screen.getByLabelText('新增子任务');
    await user.click(addButton);
    
    expect(mockProps.onAddSubtask).toHaveBeenCalledWith('新子任务');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    // Need to hover to show the delete button
    const todoContainer = screen.getByRole('listitem');
    await user.hover(todoContainer);
    
    const deleteButton = screen.getByLabelText('删除待办');
    await user.click(deleteButton);
    
    expect(mockProps.onDelete).toHaveBeenCalled();
  });

  it('applies correct styling for completed todos', () => {
    render(<TodoItem todo={mockCompletedTodo} {...mockProps} />);
    
    const textElement = screen.getByText('已完成的待办事项');
    expect(textElement).toHaveClass('line-through', 'text-muted-foreground');
  });

  it('validates completedAt timestamp format', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={mockTodo} {...mockProps} />);
    
    const completeButton = screen.getByLabelText('标记为已完成');
    await user.click(completeButton);
    
    const callArgs = mockProps.onUpdate.mock.calls[0][0];
    const timestamp = callArgs.completedAt;
    
    // Validate ISO 8601 format
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Validate that it's a valid date
    const date = new Date(timestamp);
    expect(date.getTime()).not.toBeNaN();
    
    // Validate that it's close to current time (within 1 second)
    const now = new Date();
    expect(Math.abs(date.getTime() - now.getTime())).toBeLessThan(1000);
  });

  it('handles todo without completedAt field gracefully', () => {
    const todoWithoutCompletedAt = {
      ...mockTodo,
      isCompleted: true,
      // No completedAt field
    };
    
    render(<TodoItem todo={todoWithoutCompletedAt} {...mockProps} />);
    
    // Should show as completed but without completion date
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument();
  });

  it('handles invalid completedAt date gracefully', () => {
    const todoWithInvalidDate = {
      ...mockTodo,
      isCompleted: true,
      completedAt: 'invalid-date',
    };
    
    // Should not throw error and render properly
    expect(() => {
      render(<TodoItem todo={todoWithInvalidDate} {...mockProps} />);
    }).not.toThrow();
    
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument();
  });
});