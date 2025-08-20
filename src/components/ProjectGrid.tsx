import ProjectCard from "./ProjectCard";
import { Project, Todo, Subtask, ProjectFilter, getProjectCompletionStatus } from "@/types";
import { 
  DndContext, 
  DragOverlay, 
  DragEndEvent,
  closestCenter,
  DragStartEvent
} from "@dnd-kit/core";
import { 
  SortableContext,
  rectSortingStrategy
} from "@dnd-kit/sortable";
import { useDndSensors, sortProjectsByOrder } from "@/hooks/useDragDrop";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useState } from "react";

interface Props {
  projects: Project[];
  filter: ProjectFilter;
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
  onReorderProjects: (from: number, to: number) => void;
  searchTerm?: string; // 搜索关键词用于高亮
}

export default function ProjectGrid({ 
  projects, 
  filter, 
  onAddTodo, 
  onUpdateProject, 
  onDeleteProject, 
  onUpdateTodo, 
  onDeleteTodo, 
  onReorderTodos, 
  onAddSubtask, 
  onUpdateSubtask, 
  onDeleteSubtask, 
  onReorderSubtasks,
  onReorderProjects,
  searchTerm
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { preferences, toggleProjectCollapse } = useUserPreferences();
  const sensors = useDndSensors();

  // 过滤并排序项目
  const filtered = sortProjectsByOrder(
    projects.filter(p => {
      if (filter === 'all') return true;
      return filter === 'active' ? !getProjectCompletionStatus(p) : getProjectCompletionStatus(p);
    })
  );

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    try {
      if (over && active.id !== over.id) {
        const oldIndex = filtered.findIndex(p => p.id === active.id);
        const newIndex = filtered.findIndex(p => p.id === over.id);
        
        // 边界情况检查
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('拖拽项目未找到:', { activeId: active.id, overId: over.id });
          return;
        }
        
        if (oldIndex < 0 || newIndex < 0 || oldIndex >= filtered.length || newIndex >= filtered.length) {
          console.warn('拖拽索引超出范围:', { oldIndex, newIndex, totalItems: filtered.length });
          return;
        }
        
        onReorderProjects(oldIndex, newIndex);
      }
    } catch (error) {
      console.error('拖拽操作失败:', error);
    } finally {
      setActiveId(null);
    }
  };

  // 获取当前拖拽的项目（用于拖拽预览）
  const activeProject = activeId ? filtered.find(p => p.id === activeId) : null;

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={filtered.map(p => p.id)} 
        strategy={rectSortingStrategy}
      >
        <section aria-label="项目卡片网格" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isDragging={activeId === p.id}
              isCollapsed={preferences.collapsedProjects.includes(p.id)}
              onToggleCollapse={() => toggleProjectCollapse(p.id)}
              highlightedText={searchTerm}
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
      </SortableContext>

      {/* 拖拽预览覆盖层 */}
      <DragOverlay>
        {activeProject ? (
          <div className="transform rotate-2 scale-105">
            <ProjectCard
              project={activeProject}
              isDragging={true}
              isCollapsed={preferences.collapsedProjects.includes(activeProject.id)}
              onToggleCollapse={() => {}}
              highlightedText={searchTerm}
              onUpdateProject={() => {}}
              onDeleteProject={() => {}}
              onAddTodo={() => {}}
              onUpdateTodo={() => {}}
              onDeleteTodo={() => {}}
              onReorderTodos={() => {}}
              onAddSubtask={() => {}}
              onUpdateSubtask={() => {}}
              onDeleteSubtask={() => {}}
              onReorderSubtasks={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
