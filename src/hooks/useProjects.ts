import { useMemo, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { Project, Todo, Subtask } from "@/types";

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const nowISO = () => new Date().toISOString();

const demoProjects: Project[] = [
  {
    id: uid(),
    name: "示例项目 Alpha",
    description: "项目示例：支持待办与子任务，拖拽排序与就地编辑。",
    isCompleted: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    order: 0,
    todos: [
      {
        id: uid(),
        text: "搭建项目结构",
        isCompleted: true,
        order: 0,
        projectId: "",
        subtasks: [
          { id: uid(), text: "创建基础组件", isCompleted: true, order: 0, todoId: "" },
          { id: uid(), text: "实现本地存储", isCompleted: true, order: 1, todoId: "" },
        ],
      },
      {
        id: uid(),
        text: "实现拖拽排序",
        isCompleted: false,
        order: 1,
        projectId: "",
        subtasks: [
          { id: uid(), text: "Todos 可排序", isCompleted: false, order: 0, todoId: "" },
          { id: uid(), text: "子任务可排序", isCompleted: false, order: 1, todoId: "" },
        ],
      },
    ],
  },
  {
    id: uid(),
    name: "示例项目 Beta",
    description: "双击文本即可编辑，支持导入导出。",
    isCompleted: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    order: 1,
    todos: [],
  },
];

export function useProjects(storageKey: string) {
  const { value: projects, setValue: setProjects, importFromJSON, exportToJSON } = useLocalStorage<Project[]>(storageKey, demoProjects);

  const addProject = useCallback((name: string) => {
    // 验证项目名称
    if (!name || name.trim().length === 0) {
      throw new Error('项目名称不能为空');
    }
    if (name.length > 100) {
      throw new Error('项目名称不能超过100个字符');
    }
    
    // 检查重复名称
    const trimmedName = name.trim();
    const isDuplicate = projects.some(project => 
      project.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error('项目名称已存在');
    }

    const project: Project = {
      id: uid(),
      name: trimmedName,
      description: "",
      isCompleted: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      order: projects.length, // 新项目放在最后
      todos: [],
    };
    setProjects([project, ...projects]);
  }, [projects, setProjects]);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    // 验证更新数据
    if (patch.name !== undefined) {
      if (!patch.name || patch.name.trim().length === 0) {
        throw new Error('项目名称不能为空');
      }
      if (patch.name.length > 100) {
        throw new Error('项目名称不能超过100个字符');
      }
      
      // 检查重复名称（排除当前项目）
      const trimmedName = patch.name.trim();
      const isDuplicate = projects.some(project => 
        project.id !== id && 
        project.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        throw new Error('项目名称已存在');
      }
      patch.name = trimmedName;
    }

    if (patch.description !== undefined && patch.description.length > 500) {
      throw new Error('项目描述不能超过500个字符');
    }

    setProjects(projects.map(p => p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p));
  }, [projects, setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  }, [projects, setProjects]);

  const addTodo = useCallback((projectId: string, text: string) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const order = p.todos.length;
      const todo: Todo = { id: uid(), text, isCompleted: false, order, projectId, subtasks: [] };
      return { ...p, todos: [...p.todos, todo], updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const updateTodo = useCallback((projectId: string, todoId: string, patch: Partial<Todo>) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id === todoId ? { ...t, ...patch } : t),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const deleteTodo = useCallback((projectId: string, todoId: string) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const todos = p.todos.filter(t => t.id !== todoId).map((t, idx) => ({ ...t, order: idx }));
      return { ...p, todos, updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const reorderTodos = useCallback((projectId: string, from: number, to: number) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const copy = p.todos.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      const withOrder = copy.map((t, i) => ({ ...t, order: i }));
      return { ...p, todos: withOrder, updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const addSubtask = useCallback((projectId: string, todoId: string, text: string) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => {
          if (t.id !== todoId) return t;
          const order = t.subtasks.length;
          const sub: Subtask = { id: uid(), text, isCompleted: false, order, todoId };
          return { ...t, subtasks: [...t.subtasks, sub] };
        }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const updateSubtask = useCallback((projectId: string, todoId: string, subtaskId: string, patch: Partial<Subtask>) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id !== todoId ? t : { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, ...patch } : s) }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const deleteSubtask = useCallback((projectId: string, todoId: string, subtaskId: string) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id !== todoId ? t : { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId).map((s, i) => ({ ...s, order: i })) }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const reorderSubtasks = useCallback((projectId: string, todoId: string, from: number, to: number) => {
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => {
          if (t.id !== todoId) return t;
          const copy = t.subtasks.slice();
          const [item] = copy.splice(from, 1);
          copy.splice(to, 0, item);
          const withOrder = copy.map((s, i) => ({ ...s, order: i }));
          return { ...t, subtasks: withOrder };
        }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  // 项目重排序功能
  const reorderProjects = useCallback((from: number, to: number) => {
    const sortedProjects = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));
    const copy = sortedProjects.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    
    // 重新计算order值并更新时间戳
    const reorderedProjects = copy.map((p, index) => ({
      ...p,
      order: index,
      updatedAt: nowISO()
    }));
    
    setProjects(reorderedProjects);
  }, [projects, setProjects]);

  // 更新项目排序（根据项目ID数组）
  const updateProjectOrder = useCallback((projectOrders: {id: string, order: number}[]) => {
    const updatedProjects = projects.map(project => {
      const orderItem = projectOrders.find(p => p.id === project.id);
      return orderItem ? {
        ...project,
        order: orderItem.order,
        updatedAt: nowISO()
      } : project;
    });
    setProjects(updatedProjects);
  }, [projects, setProjects]);

  const computed = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => !p.isCompleted).length,
    completed: projects.filter(p => p.isCompleted).length,
  }), [projects]);

  return {
    projects,
    setProjects,
    addProject,
    updateProject,
    deleteProject,
    addTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    reorderSubtasks,
    reorderProjects,
    updateProjectOrder,
    computed,
    importFromJSON,
    exportToJSON,
  } as const;
}
