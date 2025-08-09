import { useState, useRef, useEffect } from "react";
import { CheckCircle2, Circle, GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  subtask: {
    id: string;
    text: string;
    isCompleted: boolean;
    order: number;
    todoId: string;
  };
  onUpdate: (patch: Partial<Props["subtask"]>) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export default function SubtaskItem({ subtask, onUpdate, onDelete, dragHandleProps }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(subtask.text);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md border bg-card hover-scale", subtask.isCompleted && "opacity-70")}
         role="listitem"
         aria-checked={subtask.isCompleted}
    >
      <button
        aria-label="拖拽子任务"
        {...dragHandleProps}
        className="cursor-grab touch-none px-1 text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        aria-pressed={subtask.isCompleted}
        aria-label={subtask.isCompleted ? "标记为未完成" : "标记为已完成"}
        onClick={() => onUpdate({ isCompleted: !subtask.isCompleted })}
        className="p-1 rounded-md text-success hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {subtask.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); if (text !== subtask.text) onUpdate({ text }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={cn("flex-1 text-sm", subtask.isCompleted && "line-through text-muted-foreground")}
        >
          {subtask.text}
        </span>
      )}

      <button aria-label="编辑子任务" onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground">
        <Pencil className="h-4 w-4" />
      </button>
      <button aria-label="删除子任务" onClick={onDelete} className="p-1 text-error hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
