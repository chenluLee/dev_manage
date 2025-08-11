import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SubtaskItem from "./SubtaskItem";
import { useDndSensors } from "@/hooks/useDragDrop";

interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  order: number;
  todoId: string;
}

interface Props {
  todo: {
    id: string;
    text: string;
    isCompleted: boolean;
    order: number;
    projectId: string;
    subtasks: Subtask[];
  };
  onUpdate: (patch: Partial<Props["todo"]>) => void;
  onDelete: () => void;
  onAddSubtask: (text: string) => void;
  onUpdateSubtask: (subId: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (subId: string) => void;
  onReorderSubtasks: (from: number, to: number) => void;
}

export default function TodoItem({ todo, onUpdate, onDelete, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks }: Props) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(todo.subtasks.length > 0);
  const [isHovered, setIsHovered] = useState(false);
  const [text, setText] = useState(todo.text);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  const sensors = useDndSensors();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  

  const handleSubtaskDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const sortedSubtasks = todo.subtasks.slice().sort((a,b) => a.order - b.order);
    const oldIndex = sortedSubtasks.findIndex(s => s.id === active.id);
    const newIndex = sortedSubtasks.findIndex(s => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderSubtasks(oldIndex, newIndex);
    }
  };

  const handleReorderSubtasksKeyboard = (e: React.KeyboardEvent, index: number, dir: -1 | 1) => {
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const to = index + (e.key === 'ArrowUp' ? -1 : 1);
      if (to >= 0 && to < todo.subtasks.length) onReorderSubtasks(index, to);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn("rounded-lg border bg-card p-2", isDragging && "ring-2 ring-primary shadow-lg")} 
      role="listitem" 
      aria-checked={todo.isCompleted}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 relative">
        {/* 拖拽按钮 - 悬停时从左侧滑入 */}
        <div className={cn("expand-slide overflow-hidden", isHovered || editing ? "w-8 opacity-100" : "w-0 opacity-0")}>
          <button aria-label="拖拽待办" className="cursor-grab touch-none px-1 text-muted-foreground hover:text-foreground transition-colors duration-200" {...listeners} {...attributes}>
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <button aria-pressed={todo.isCompleted} aria-label={todo.isCompleted ? "标记为未完成" : "标记为已完成"} onClick={() => onUpdate({ isCompleted: !todo.isCompleted })} className="p-1 rounded-md text-success hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring shrink-0 transition-colors duration-200">
          {todo.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>

        {/* 内容区域 - 动态调整宽度 */}
        <div className={cn("flex-1 content-expand", isHovered || editing ? "mr-2" : "mr-0")}>
          {editing ? (
            <input
              ref={inputRef}
              className="w-full bg-transparent outline-none text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => { setEditing(false); if (text !== todo.text) onUpdate({ text }); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
            />
          ) : (
            <span onDoubleClick={() => setEditing(true)} className={cn("block text-sm", todo.isCompleted && "line-through text-muted-foreground")}>{todo.text}</span>
          )}
        </div>

        {/* 子任务完成状态和展开按钮 */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 子任务完成状态指示器 */}
          {todo.subtasks.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
              {todo.subtasks.filter(s => s.isCompleted).length}/{todo.subtasks.length}
            </span>
          )}
          
          {/* 展开/收起按钮 - 仅在有子任务时显示 */}
          {todo.subtasks.length > 0 ? (
            <button 
              aria-label="展开/收起子任务" 
              onClick={() => setExpanded(!expanded)} 
              className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="p-1 opacity-0 pointer-events-none">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
        
        {/* 操作按钮 - 悬停时从右侧滑入 */}
        <div className={cn("expand-slide flex items-center overflow-hidden", isHovered || editing ? "w-8 opacity-100" : "w-0 opacity-0")}>
          <button aria-label="删除待办" onClick={onDelete} className="p-1 text-error hover:text-destructive transition-colors duration-200">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {/* 添加子任务按钮 - 只跟随鼠标悬停，不跟随展开状态 */}
        <div className={cn("expand-slide overflow-hidden", isHovered || editing ? "h-6 opacity-100" : "h-0 opacity-0")}>
          <button
            aria-label="新增子任务"
            disabled={isAddingSubtask}
            onClick={async () => {
              try {
                setIsAddingSubtask(true);
                // 先展开子任务列表，确保新添加的子任务能立即显示
                setExpanded(true);
                await onAddSubtask("新子任务");
              } catch (error) {
                console.error('添加子任务失败:', error);
              } finally {
                setIsAddingSubtask(false);
              }
            }}
            className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> {isAddingSubtask ? '添加中...' : '添加子任务'}
          </button>
        </div>

        {/* 子任务列表 - 跟随展开状态显示 */}
        {expanded && (
          <DndContext sensors={sensors} onDragEnd={handleSubtaskDragEnd}>
            <SortableContext items={todo.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <ul role="list" className="space-y-2">
                {todo.subtasks.sort((a,b) => a.order - b.order).map((s, i) => (
                  <li key={s.id} onKeyDown={(e) => handleReorderSubtasksKeyboard(e, i, 1)}>
                    <SubtaskItem
                      subtask={s}
                      onUpdate={(patch) => onUpdateSubtask(s.id, patch)}
                      onDelete={() => onDeleteSubtask(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
