import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SubtaskItem from "./SubtaskItem";

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
  const [expanded, setExpanded] = useState(true);
  const [text, setText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleReorderSubtasksKeyboard = (e: React.KeyboardEvent, index: number, dir: -1 | 1) => {
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const to = index + (e.key === 'ArrowUp' ? -1 : 1);
      if (to >= 0 && to < todo.subtasks.length) onReorderSubtasks(index, to);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg border bg-card p-2", isDragging && "ring-2 ring-primary shadow-lg")} role="listitem" aria-checked={todo.isCompleted}>
      <div className="flex items-center gap-2">
        <button aria-label="拖拽待办" className="cursor-grab touch-none px-1 text-muted-foreground" {...listeners} {...attributes}>
          <GripVertical className="h-4 w-4" />
        </button>

        <button aria-pressed={todo.isCompleted} aria-label={todo.isCompleted ? "标记为未完成" : "标记为已完成"} onClick={() => onUpdate({ isCompleted: !todo.isCompleted })} className="p-1 rounded-md text-success hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring">
          {todo.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { setEditing(false); if (text !== todo.text) onUpdate({ text }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)} className={cn("flex-1 text-sm", todo.isCompleted && "line-through text-muted-foreground")}>{todo.text}</span>
        )}

        <button aria-label="展开/收起子任务" onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button aria-label="编辑待办" onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
        <button aria-label="删除待办" onClick={onDelete} className="p-1 text-error hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <button
            aria-label="新增子任务"
            onClick={() => onAddSubtask("新子任务")}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> 添加子任务
          </button>

          <ul role="list" className="space-y-2">
            {todo.subtasks.sort((a,b) => a.order - b.order).map((s, i) => (
              <li key={s.id} onKeyDown={(e) => handleReorderSubtasksKeyboard(e, i, 1)}>
                <SubtaskItem
                  subtask={s}
                  onUpdate={(patch) => onUpdateSubtask(s.id, patch)}
                  onDelete={() => onDeleteSubtask(s.id)}
                  dragHandleProps={{
                    role: 'button',
                    tabIndex: 0,
                    onKeyDown: (e) => handleReorderSubtasksKeyboard(e, i, 1),
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
