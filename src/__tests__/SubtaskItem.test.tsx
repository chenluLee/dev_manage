import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import SubtaskItem from '@/components/SubtaskItem';

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(() => 'transform: translate3d(0, 0, 0)'),
    },
  },
}));

describe('SubtaskItem', () => {
  const mockSubtask = {
    id: 'test-subtask-1',
    text: '测试子任务',
    isCompleted: false,
    order: 0,
    todoId: 'test-todo-1',
  };

  const mockCompletedSubtask = {
    id: 'test-subtask-2',
    text: '已完成的子任务',
    isCompleted: true,
    order: 1,
    todoId: 'test-todo-1',
    completedAt: '2025-01-14T15:45:00.000Z',
  };

  const mockProps = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders subtask item correctly', () => {
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
    expect(screen.getByText('测试子任务')).toBeInTheDocument();
    expect(screen.getByLabelText('标记为已完成')).toBeInTheDocument();
  });

  it('displays completion date when subtask is completed and hovered', async () => {
    render(<SubtaskItem subtask={mockCompletedSubtask} {...mockProps} />);
    
    const subtaskElement = screen.getByRole('listitem');
    const expectedDate = format(new Date(mockCompletedSubtask.completedAt!), 'yyyy-MM-dd');
    
    // 初始状态下不应显示完成日期
    expect(screen.queryByText(`完成于 ${expectedDate}`)).not.toBeInTheDocument();
    
    // 模拟鼠标悬停
    fireEvent.mouseEnter(subtaskElement);
    
    // 悬停后应显示完成日期
    await waitFor(() => {
      expect(screen.getByText(`完成于 ${expectedDate}`)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
  });

  it('does not display completion date when subtask is not completed', () => {
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument();
  });

  it('calls onUpdate with completedAt when marking as completed', async () => {
    const user = userEvent.setup();
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
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
    render(<SubtaskItem subtask={mockCompletedSubtask} {...mockProps} />);
    
    const uncompleteButton = screen.getByLabelText('标记为未完成');
    await user.click(uncompleteButton);
    
    expect(mockProps.onUpdate).toHaveBeenCalledWith({
      isCompleted: false,
      completedAt: undefined,
    });
  });

  it('allows editing subtask text on double click', async () => {
    const user = userEvent.setup();
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
    const textElement = screen.getByText('测试子任务');
    await user.dblClick(textElement);
    
    const input = screen.getByDisplayValue('测试子任务');
    expect(input).toBeInTheDocument();
    
    await user.clear(input);
    await user.type(input, '修改后的子任务');
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith({ text: '修改后的子任务' });
    });
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
    // Need to hover to show the delete button
    const subtaskContainer = screen.getByRole('listitem');
    await user.hover(subtaskContainer);
    
    const deleteButton = screen.getByLabelText('删除子任务');
    await user.click(deleteButton);
    
    expect(mockProps.onDelete).toHaveBeenCalled();
  });

  it('applies correct styling for completed subtasks', () => {
    render(<SubtaskItem subtask={mockCompletedSubtask} {...mockProps} />);
    
    const textElement = screen.getByText('已完成的子任务');
    expect(textElement).toHaveClass('line-through', 'text-muted-foreground');
    
    const container = screen.getByRole('listitem');
    expect(container).toHaveClass('opacity-70');
  });

  it('validates completedAt timestamp format', async () => {
    const user = userEvent.setup();
    render(<SubtaskItem subtask={mockSubtask} {...mockProps} />);
    
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

  it('handles subtask without completedAt field gracefully', () => {
    const subtaskWithoutCompletedAt = {
      ...mockSubtask,
      isCompleted: true,
      // No completedAt field
    };
    
    render(<SubtaskItem subtask={subtaskWithoutCompletedAt} {...mockProps} />);
    
    // Should show as completed but without completion date
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
    expect(screen.queryByText(/完成于/)).not.toBeInTheDocument();
  });

  it('handles invalid completedAt date gracefully', () => {
    const subtaskWithInvalidDate = {
      ...mockSubtask,
      isCompleted: true,
      completedAt: 'invalid-date',
    };
    
    // Should not throw error and render properly
    expect(() => {
      render(<SubtaskItem subtask={subtaskWithInvalidDate} {...mockProps} />);
    }).not.toThrow();
    
    expect(screen.getByLabelText('标记为未完成')).toBeInTheDocument();
  });
});