import { useMemo, useRef } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove as arrayMoveSortable } from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import TodoItem from "./TodoItem";
import { useDndSensors } from "@/hooks/useDragDrop";

interface Subtask { id: string; text: string; isCompleted: boolean; order: number; todoId: string; }
interface Todo { id: string; text: string; isCompleted: boolean; order: number; projectId: string; subtasks: Subtask[]; }

interface Props {
  projectId: string;
  todos: Todo[];
  onAddTodo: (text: string) => void;
  onUpdateTodo: (todoId: string, patch: Partial<Todo>) => void;
  onDeleteTodo: (todoId: string) => void;
  onReorderTodos: (from: number, to: number) => void;
  onAddSubtask: (todoId: string, text: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onReorderSubtasks: (todoId: string, from: number, to: number) => void;
}

export default function TodoList({ projectId, todos, onAddTodo, onUpdateTodo, onDeleteTodo, onReorderTodos, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks }: Props) {
  const sensors = useDndSensors();
  const sorted = useMemo(() => todos.slice().sort((a,b) => a.order - b.order), [todos]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const useVirtual = sorted.length > 100;

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 6,
  });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex(t => t.id === active.id);
    const newIndex = sorted.findIndex(t => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderTodos(oldIndex, newIndex);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          aria-label="新增待办"
          placeholder="添加新的待办并回车"
          className="flex-1 rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            const target = e.target as HTMLInputElement;
            if (e.key === 'Enter' && target.value.trim()) {
              onAddTodo(target.value.trim());
              target.value = '';
            }
          }}
        />
      </div>

      <div ref={parentRef} className={useVirtual ? "max-h-96 overflow-auto" : undefined}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {useVirtual ? (
              <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map(vRow => {
                  const todo = sorted[vRow.index];
                  return (
                    <div key={todo.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)` }}>
                      <TodoItem
                        todo={todo}
                        onUpdate={(patch) => onUpdateTodo(todo.id, patch)}
                        onDelete={() => onDeleteTodo(todo.id)}
                        onAddSubtask={(text) => onAddSubtask(todo.id, text)}
                        onUpdateSubtask={(subId, patch) => onUpdateSubtask(todo.id, subId, patch)}
                        onDeleteSubtask={(subId) => onDeleteSubtask(todo.id, subId)}
                        onReorderSubtasks={(from, to) => onReorderSubtasks(todo.id, from, to)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul role="list" className="space-y-2">
                {sorted.map((todo) => (
                  <li key={todo.id}>
                    <TodoItem
                      todo={todo}
                      onUpdate={(patch) => onUpdateTodo(todo.id, patch)}
                      onDelete={() => onDeleteTodo(todo.id)}
                      onAddSubtask={(text) => onAddSubtask(todo.id, text)}
                      onUpdateSubtask={(subId, patch) => onUpdateSubtask(todo.id, subId, patch)}
                      onDeleteSubtask={(subId) => onDeleteSubtask(todo.id, subId)}
                      onReorderSubtasks={(from, to) => onReorderSubtasks(todo.id, from, to)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
