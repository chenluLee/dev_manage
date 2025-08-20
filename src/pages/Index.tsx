import { useMemo, useState, useEffect } from "react";
import StatusToggle from "@/components/StatusToggle";
import SettingsModal from "@/components/SettingsModal";
import ReportModal from "@/components/ReportModal";
import ProjectGrid from "@/components/ProjectGrid";
import { useProjects } from "@/hooks/useProjects";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { ProjectFilter, AppSettings, AppData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Plus, FileText } from "lucide-react";
import { StorageManager } from "@/managers/StorageManager";

const Index = () => {
  console.log("Index component rendering...");
  
  const [storageKey, setStorageKey] = useState<string>("pmapp:data");
  const {
    projects,
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
    setProjects,
    loadProjects,
  } = useProjects(storageKey);
  
  const { updateProjectOrder: updateUserPreferenceOrder } = useUserPreferences();

  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  // 应用设置状态
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'auto',
    autoSave: true,
    showCompletedProjects: true,
    autoBackup: false,
    backupInterval: 24,
    storagePath: '',
    // 新增用户偏好字段
    projectOrder: [],
    collapsedProjects: [],
    searchHistory: [],
    statusFilter: ['active', 'completed']
  });
  
  // 存储路径状态 - 从StorageManager初始化
  const [storagePath, setStoragePath] = useState<string>('');
  
  // 组件挂载时初始化存储路径状态
  useEffect(() => {
    const initializeStoragePath = () => {
      const currentPath = StorageManager.getSelectedDirectoryName();
      if (currentPath) {
        setStoragePath(currentPath);
        setSettings(prev => ({ ...prev, storagePath: currentPath }));
      }
    };
    
    initializeStoragePath();
  }, []);

  const stats = useMemo(() => computed, [computed]);
  
  // 当前应用数据
  const currentData: AppData = useMemo(() => ({
    version: '1.0.0',
    projects: projects,
    settings: settings,
    metadata: {
      createdAt: new Date(),
      lastModified: new Date(),
      totalProjects: projects.length,
      totalTodos: projects.reduce((acc, p) => acc + p.todos.length, 0)
    }
  }), [projects, settings]);
  
  // 更新设置的函数
  const handleSettingsUpdate = (newSettings: AppSettings) => {
    setSettings(newSettings);
    // 这里可以添加保存到localStorage的逻辑
  };
  
  // 存储路径变化处理
  const handleStoragePathChange = async (path: string) => {
    setStoragePath(path);
    setSettings(prev => ({ ...prev, storagePath: path }));
    
    // 如果选择了新的存储路径，重新加载数据
    if (path && loadProjects) {
      try {
        await loadProjects();
      } catch (error) {
        console.error('重新加载项目数据失败:', error);
      }
    }
  };
  
  // 数据恢复函数（可选）
  const handleDataRestore = (data: AppData) => {
    setProjects(data.projects);
    setSettings(data.settings);
  };
  
  // 处理项目重排序，同时更新用户偏好
  const handleProjectReorder = async (from: number, to: number) => {
    try {
      // 边界情况检查
      if (from === to) return; // 如果位置相同，无需操作
      if (from < 0 || to < 0) return; // 索引不能为负
      if (from >= projects.length || to >= projects.length) return; // 索引不能超出范围
      if (!projects || projects.length === 0) return; // 项目列表为空
      
      // 重排序项目
      await reorderProjects(from, to);
      
      // 更新用户偏好中的项目排序
      const sortedProjects = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));
      const copy = sortedProjects.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      
      const reorderedProjectOrders = copy.map((project, index) => ({
        id: project.id,
        order: index
      }));
      updateUserPreferenceOrder(reorderedProjectOrders);
    } catch (error) {
      console.error('项目重排序失败:', error);
      // 可以在这里添加用户友好的错误提示
    }
  };

  console.log("Projects loaded:", projects?.length || 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold">项目管理应用</h1>
            <p className="text-sm text-muted-foreground">项目卡片网格、待办/子任务、拖拽排序、导入导出、就地编辑</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusToggle value={filter} onChange={setFilter} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="生成报告" onClick={() => setReportOpen(true)}>
                  <FileText className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>生成报告</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="系统设置" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>系统设置</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 space-y-6">
        {/* 添加项目输入区域 */}
        <section className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="输入项目名称后回车或点击添加"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newProjectName.trim()) {
                try {
                  await addProject(newProjectName.trim());
                  setNewProjectName("");
                } catch (error) {
                  console.error('添加项目失败:', error);
                  alert(error instanceof Error ? error.message : '添加项目失败');
                }
              }
            }}
          />
          <Button onClick={async () => { 
            if (newProjectName.trim()) {
              try {
                await addProject(newProjectName.trim()); 
                setNewProjectName("");
              } catch (error) {
                console.error('添加项目失败:', error);
                alert(error instanceof Error ? error.message : '添加项目失败');
              }
            } 
          }}>
            <Plus className="h-4 w-4 mr-1" /> 添加项目
          </Button>
        </section>

        {/* 项目网格 */}
        <ProjectGrid
          projects={projects}
          filter={filter}
          onAddTodo={async (projectId, text) => await addTodo(projectId, text)}
          onUpdateProject={async (projectId, patch) => await updateProject(projectId, patch)}
          onDeleteProject={async (projectId) => await deleteProject(projectId)}
          onUpdateTodo={async (projectId, todoId, patch) => await updateTodo(projectId, todoId, patch)}
          onDeleteTodo={async (projectId, todoId) => await deleteTodo(projectId, todoId)}
          onReorderTodos={async (projectId, from, to) => await reorderTodos(projectId, from, to)}
          onAddSubtask={async (projectId, todoId, text) => await addSubtask(projectId, todoId, text)}
          onUpdateSubtask={async (projectId, todoId, subId, patch) => await updateSubtask(projectId, todoId, subId, patch)}
          onDeleteSubtask={async (projectId, todoId, subId) => await deleteSubtask(projectId, todoId, subId)}
          onReorderSubtasks={async (projectId, todoId, from, to) => await reorderSubtasks(projectId, todoId, from, to)}
          onReorderProjects={handleProjectReorder}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        storageKey={storageKey}
        onStorageKeyChange={setStorageKey}
        storagePath={storagePath}
        onStoragePathChange={handleStoragePathChange}
        onExport={() => exportToJSON()}
        onImport={(json) => importFromJSON(json)}
        onClear={async () => await setProjects([])}
        stats={stats}
        settings={settings}
        onSettingsUpdate={handleSettingsUpdate}
        currentData={currentData}
        onDataRestore={handleDataRestore}
      />

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        projects={projects}
        settings={settings}
        onOpenSettings={() => {
          setReportOpen(false);
          setSettingsOpen(true);
        }}
      />
    </div>
  );
};

export default Index;
