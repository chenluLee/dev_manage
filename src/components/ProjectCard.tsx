import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { CheckCircle2, ChevronDown, ChevronUp, Edit3, MoreVertical, Trash2 } from "lucide-react";
import TodoList from "./TodoList";
import { cn } from "@/lib/utils";

interface Subtask { id: string; text: string; isCompleted: boolean; order: number; todoId: string; }
interface Todo { id: string; text: string; isCompleted: boolean; order: number; projectId: string; subtasks: Subtask[]; }

interface Project {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  todos: Todo[];
}

interface Props {
  project: Project;
  onUpdateProject: (patch: Partial<Project>) => void;
  onDeleteProject: () => void;
  onAddTodo: (text: string) => void;
  onUpdateTodo: (todoId: string, patch: Partial<Todo>) => void;
  onDeleteTodo: (todoId: string) => void;
  onReorderTodos: (from: number, to: number) => void;
  onAddSubtask: (todoId: string, text: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onReorderSubtasks: (todoId: string, from: number, to: number) => void;
}

export default function ProjectCard(props: Props) {
  const { project } = props;
  const [expanded, setExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const completed = project.todos.filter(t => t.isCompleted).length;

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (editingName) nameRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingDesc) descRef.current?.focus(); }, [editingDesc]);

  // 验证项目名称
  const validateName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return '项目名称不能为空';
    }
    if (name.length > 100) {
      return '项目名称不能超过100个字符';
    }
    return null;
  };

  // 验证项目描述
  const validateDescription = (desc: string): string | null => {
    if (desc && desc.length > 500) {
      return '项目描述不能超过500个字符';
    }
    return null;
  };

  return (
    <article 
      className={cn("transition-shadow", "animate-enter")} 
      aria-label={`项目 ${project.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn("bg-card/80 backdrop-blur-sm border-border hover:shadow-lg", "hover:shadow-[var(--shadow-elegant)]")}>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            {editingName ? (
              <div className="space-y-1">
                <input
                  ref={nameRef}
                  className={cn(
                    "w-full bg-transparent outline-none text-lg font-semibold",
                    nameError && "text-destructive"
                  )}
                  defaultValue={project.name}
                  maxLength={100}
                  onChange={(e) => {
                    const error = validateName(e.target.value);
                    setNameError(error);
                  }}
                  onBlur={(e) => { 
                    const v = e.target.value.trim(); 
                    const error = validateName(v);
                    setNameError(error);
                    setEditingName(false); 
                    if (!error && v && v !== project.name) {
                      props.onUpdateProject({ name: v }); 
                    }
                  }}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); 
                    if (e.key === 'Escape') { 
                      setNameError(null); 
                      setEditingName(false); 
                    }
                  }}
                />
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>
            ) : (
              <CardTitle
                className="truncate text-lg cursor-text"
                title={project.name}
                onDoubleClick={() => setEditingName(true)}
              >
                {project.name}
              </CardTitle>
            )}

            {editingDesc ? (
              <div className="space-y-1">
                <input
                  ref={descRef}
                  className={cn(
                    "w-full bg-transparent outline-none text-sm text-muted-foreground",
                    descError && "text-destructive"
                  )}
                  defaultValue={project.description}
                  maxLength={500}
                  onChange={(e) => {
                    const error = validateDescription(e.target.value);
                    setDescError(error);
                  }}
                  onBlur={(e) => { 
                    const v = e.target.value;
                    const error = validateDescription(v);
                    setDescError(error);
                    setEditingDesc(false); 
                    if (!error && v !== project.description) {
                      props.onUpdateProject({ description: v }); 
                    }
                  }}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); 
                    if (e.key === 'Escape') { 
                      setDescError(null); 
                      setEditingDesc(false); 
                    }
                  }}
                />
                {descError && (
                  <p className="text-xs text-destructive">{descError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {project.description?.length || 0}/500
                </p>
              </div>
            ) : (
              <p
                className="text-sm text-muted-foreground line-clamp-2 cursor-text"
                title={project.description}
                onDoubleClick={() => setEditingDesc(true)}
              >
                {project.description || "双击添加描述"}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Badge variant="secondary" className={cn(project.isCompleted && "bg-success/15 text-success border-success/30")}>{project.isCompleted ? "已结束" : "进行中"}</Badge>
              <Badge variant="outline">{completed}/{project.todos.length} 已完成</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="切换状态" onClick={() => props.onUpdateProject({ isCompleted: !project.isCompleted })}>
                  <CheckCircle2 className={cn("h-4 w-4", project.isCompleted ? "text-success" : "text-muted-foreground")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>切换项目状态</TooltipContent>
            </Tooltip>
            
            {/* 操作按钮 - 悬停时从右侧滑入 */}
            <div className={cn("expand-slide flex items-center gap-1 overflow-hidden", isHovered || editingName || editingDesc ? "w-20 opacity-100" : "w-0 opacity-0")}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="删除项目" className="transition-colors duration-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>删除项目</TooltipContent>
                  </Tooltip>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除项目</AlertDialogTitle>
                    <AlertDialogDescription>
                      你确定要删除项目「{project.name}」吗？此操作将删除项目下的所有任务，且无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={props.onDeleteProject}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" aria-label="更多" className="transition-colors duration-200">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between pb-2">
            <button
              className="text-sm text-primary hover:underline story-link"
              onClick={() => props.onAddTodo("新的待办")}
              aria-label="快速添加一个待办"
            >
              + 快速添加待办
            </button>

            <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={`todos-${project.id}`}>
              {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {expanded ? "收起" : "展开"}
            </Button>
          </div>

          <div id={`todos-${project.id}`} className={cn("transition-all", expanded ? "animate-accordion-down" : "animate-accordion-up")} style={{ willChange: 'height' }}>
            {expanded && (
              <TodoList
                projectId={project.id}
                todos={project.todos}
                onAddTodo={(text) => props.onAddTodo(text)}
                onUpdateTodo={(todoId, patch) => props.onUpdateTodo(todoId, patch)}
                onDeleteTodo={(todoId) => props.onDeleteTodo(todoId)}
                onReorderTodos={props.onReorderTodos}
                onAddSubtask={(todoId, text) => props.onAddSubtask(todoId, text)}
                onUpdateSubtask={(todoId, subId, patch) => props.onUpdateSubtask(todoId, subId, patch)}
                onDeleteSubtask={(todoId, subId) => props.onDeleteSubtask(todoId, subId)}
                onReorderSubtasks={(todoId, from, to) => props.onReorderSubtasks(todoId, from, to)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
