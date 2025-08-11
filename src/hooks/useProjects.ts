import { useMemo, useCallback, useState, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { Project, Todo, Subtask, AppData, AppSettings } from "@/types";
import { StorageManager } from "@/managers/StorageManager";

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
  const { value: localProjects, setValue: setLocalProjects, importFromJSON: importLocalJSON, exportToJSON: exportLocalJSON } = useLocalStorage<Project[]>(storageKey, demoProjects);
  
  // 统一的项目状态，优先从文件系统加载
  const [projects, setProjectsState] = useState<Project[]>(localProjects);
  const [isLoading, setIsLoading] = useState(true);
  
  // 从存储中加载数据（优先文件系统，降级到localStorage）
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      // 首先尝试从文件系统加载
      if (StorageManager.isFileSystemAccessSupported() && StorageManager.getSelectedDirectoryName()) {
        const result = await StorageManager.loadDataFromDirectory();
        if (result.data?.projects) {
          setProjectsState(result.data.projects);
          setIsLoading(false);
          return;
        }
      }
      
      // 降级到localStorage
      setProjectsState(localProjects);
    } catch (error) {
      console.warn('加载项目数据失败，使用localStorage数据:', error);
      setProjectsState(localProjects);
    }
    setIsLoading(false);
  }, [localProjects]);
  
  // 保存数据（同时保存到文件系统和localStorage）
  const saveProjects = useCallback(async (newProjects: Project[]) => {
    // 立即更新本地状态
    setProjectsState(newProjects);
    setLocalProjects(newProjects);
    
    // 如果支持文件系统访问，也保存到文件系统
    if (StorageManager.isFileSystemAccessSupported() && StorageManager.getSelectedDirectoryName()) {
      try {
        const appData: AppData = {
          version: '1.0.0',
          projects: newProjects,
          settings: {
            theme: 'auto',
            autoSave: true,
            showCompletedProjects: true,
            storagePath: StorageManager.getSelectedDirectoryName() || ''
          } as AppSettings,
          metadata: {
            createdAt: new Date(),
            lastModified: new Date(),
            totalProjects: newProjects.length,
            totalTodos: newProjects.reduce((acc, p) => acc + p.todos.length, 0)
          }
        };
        
        await StorageManager.saveDataToDirectory(appData);
      } catch (error) {
        console.warn('保存到文件系统失败，仅保存到localStorage:', error);
      }
    }
  }, [setLocalProjects]);
  
  // 组件挂载时加载数据
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  // 包装setProjects函数以使用新的保存逻辑
  const setProjects = useCallback(async (newProjects: Project[]) => {
    await saveProjects(newProjects);
  }, [saveProjects]);

  const addProject = useCallback(async (name: string) => {
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
    await setProjects([project, ...projects]);
  }, [projects, setProjects]);

  const updateProject = useCallback(async (id: string, patch: Partial<Project>) => {
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

    await setProjects(projects.map(p => p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p));
  }, [projects, setProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await setProjects(projects.filter(p => p.id !== id));
  }, [projects, setProjects]);

  const addTodo = useCallback(async (projectId: string, text: string) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const order = p.todos.length;
      const todo: Todo = { id: uid(), text, isCompleted: false, order, projectId, subtasks: [] };
      return { ...p, todos: [...p.todos, todo], updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const updateTodo = useCallback(async (projectId: string, todoId: string, patch: Partial<Todo>) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id === todoId ? { ...t, ...patch } : t),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const deleteTodo = useCallback(async (projectId: string, todoId: string) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const todos = p.todos.filter(t => t.id !== todoId).map((t, idx) => ({ ...t, order: idx }));
      return { ...p, todos, updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const reorderTodos = useCallback(async (projectId: string, from: number, to: number) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const copy = p.todos.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      const withOrder = copy.map((t, i) => ({ ...t, order: i }));
      return { ...p, todos: withOrder, updatedAt: nowISO() };
    }));
  }, [projects, setProjects]);

  const addSubtask = useCallback(async (projectId: string, todoId: string, text: string) => {
    await setProjects(projects.map(p => {
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

  const updateSubtask = useCallback(async (projectId: string, todoId: string, subtaskId: string, patch: Partial<Subtask>) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id !== todoId ? t : { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, ...patch } : s) }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const deleteSubtask = useCallback(async (projectId: string, todoId: string, subtaskId: string) => {
    await setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        todos: p.todos.map(t => t.id !== todoId ? t : { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId).map((s, i) => ({ ...s, order: i })) }),
        updatedAt: nowISO(),
      };
    }));
  }, [projects, setProjects]);

  const reorderSubtasks = useCallback(async (projectId: string, todoId: string, from: number, to: number) => {
    await setProjects(projects.map(p => {
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
  const reorderProjects = useCallback(async (from: number, to: number) => {
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
    
    await setProjects(reorderedProjects);
  }, [projects, setProjects]);

  // 更新项目排序（根据项目ID数组）
  const updateProjectOrder = useCallback(async (projectOrders: {id: string, order: number}[]) => {
    const updatedProjects = projects.map(project => {
      const orderItem = projectOrders.find(p => p.id === project.id);
      return orderItem ? {
        ...project,
        order: orderItem.order,
        updatedAt: nowISO()
      } : project;
    });
    await setProjects(updatedProjects);
  }, [projects, setProjects]);

  const computed = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => !p.isCompleted).length,
    completed: projects.filter(p => p.isCompleted).length,
  }), [projects]);

  // 包装的导入导出函数，支持文件系统存储
  const importFromJSON = useCallback(async (json: string) => {
    const result = importLocalJSON(json);
    if (result.ok && result.data) {
      await setProjects(result.data);
    }
    return result;
  }, [importLocalJSON, setProjects]);

  const exportToJSON = useCallback(() => {
    return exportLocalJSON();
  }, [exportLocalJSON]);

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
    isLoading, // 新增加载状态
    loadProjects, // 新增重新加载函数
  } as const;
}
