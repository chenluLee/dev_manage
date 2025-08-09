import ProjectCard from "./ProjectCard";
import { Project, Todo, Subtask } from "@/types";

interface Props {
  projects: Project[];
  filter: "active" | "completed";
  onAddTodo: (projectId: string, text: string) => void;
  onUpdateProject: (projectId: string, patch: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateTodo: (projectId: string, todoId: string, patch: Partial<Todo>) => void;
  onDeleteTodo: (projectId: string, todoId: string) => void;
  onReorderTodos: (projectId: string, from: number, to: number) => void;
  onAddSubtask: (projectId: string, todoId: string, text: string) => void;
  onUpdateSubtask: (projectId: string, todoId: string, subId: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (projectId: string, todoId: string, subId: string) => void;
  onReorderSubtasks: (projectId: string, todoId: string, from: number, to: number) => void;
}

export default function ProjectGrid({ projects, filter, onAddTodo, onUpdateProject, onDeleteProject, onUpdateTodo, onDeleteTodo, onReorderTodos, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks }: Props) {
  const filtered = projects.filter(p => filter === 'active' ? !p.isCompleted : p.isCompleted);

  return (
    <section aria-label="项目卡片网格" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
      {filtered.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          onUpdateProject={(patch) => onUpdateProject(p.id, patch)}
          onDeleteProject={() => onDeleteProject(p.id)}
          onAddTodo={(text) => onAddTodo(p.id, text)}
          onUpdateTodo={(todoId, patch) => onUpdateTodo(p.id, todoId, patch)}
          onDeleteTodo={(todoId) => onDeleteTodo(p.id, todoId)}
          onReorderTodos={(from, to) => onReorderTodos(p.id, from, to)}
          onAddSubtask={(todoId, text) => onAddSubtask(p.id, todoId, text)}
          onUpdateSubtask={(todoId, subId, patch) => onUpdateSubtask(p.id, todoId, subId, patch)}
          onDeleteSubtask={(todoId, subId) => onDeleteSubtask(p.id, todoId, subId)}
          onReorderSubtasks={(todoId, from, to) => onReorderSubtasks(p.id, todoId, from, to)}
        />
      ))}
    </section>
  );
}
