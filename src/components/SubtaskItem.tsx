import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, GripVertical, Trash2 } from "lucide-react";
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
}

export default function SubtaskItem({ subtask, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [text, setText] = useState(subtask.text);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 px-2 py-1 rounded-md border bg-card hover-scale", subtask.isCompleted && "opacity-70", isDragging && "ring-2 ring-primary shadow-lg")}
      role="listitem"
      aria-checked={subtask.isCompleted}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 拖拽按钮 - 悬停时从左侧滑入 */}
      <div className={cn("expand-slide-fast overflow-hidden", isHovered || editing ? "w-7 opacity-100" : "w-0 opacity-0")}>
        <button
          aria-label="拖拽子任务"
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none px-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <button
        aria-pressed={subtask.isCompleted}
        aria-label={subtask.isCompleted ? "标记为未完成" : "标记为已完成"}
        onClick={() => onUpdate({ isCompleted: !subtask.isCompleted })}
        className="p-1 rounded-md text-success hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring shrink-0 transition-colors duration-200"
      >
        {subtask.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      {/* 内容区域 - 动态调整宽度 */}
      <div className={cn("flex-1 content-expand", isHovered || editing ? "mr-2" : "mr-0")}>
        {editing ? (
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { setEditing(false); if (text !== subtask.text) onUpdate({ text }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={cn("block text-sm", subtask.isCompleted && "line-through text-muted-foreground")}
          >
            {subtask.text}
          </span>
        )}
      </div>

      {/* 操作按钮 - 悬停时从右侧滑入 */}
      <div className={cn("expand-slide-fast flex items-center overflow-hidden", isHovered || editing ? "w-8 opacity-100" : "w-0 opacity-0")}>
        <button aria-label="删除子任务" onClick={onDelete} className="p-1 text-error hover:text-destructive transition-colors duration-200">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
