# API Specification

## REST-style Data API

由于是纯前端应用，API指的是数据操作接口模式，模拟REST风格便于理解和扩展。

### Project API
```javascript
// 获取所有项目
ProjectAPI.getAll()
// 返回: Promise<Project[]>

// 根据ID获取项目
ProjectAPI.getById(id)
// 参数: id: string
// 返回: Promise<Project | null>

// 创建新项目
ProjectAPI.create(projectData)
// 参数: projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
// 返回: Promise<Project>

// 更新项目
ProjectAPI.update(id, updates)
// 参数: id: string, updates: Partial<Project>
// 返回: Promise<Project>

// 删除项目
ProjectAPI.delete(id)
// 参数: id: string
// 返回: Promise<boolean>

// 更新项目排序
ProjectAPI.updateOrder(projectOrders)
// 参数: projectOrders: {id: string, order: number}[]
// 返回: Promise<boolean>
```

### Todo API
```javascript
// 获取项目下的所有任务
TodoAPI.getAll()
// 返回: Promise<Todo[]>

// 获取项目下的所有任务
TodoAPI.getByProjectId(projectId)
// 参数: projectId: string
// 返回: Promise<Todo[]>

// 根据ID获取任务
TodoAPI.getById(id)
// 参数: id: string
// 返回: Promise<Todo | null>

// 创建新任务
TodoAPI.create(projectId, todoData)
// 参数: projectId: string, todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>
// 返回: Promise<Todo>

// 更新任务
TodoAPI.update(id, updates)
// 参数: id: string, updates: Partial<Todo>
// 返回: Promise<Todo>

// 更新任务状态
TodoAPI.updateStatus(id, status)
// 参数: id: string, status: 'pending' | 'in-progress' | 'completed'
// 返回: Promise<Todo>

// 删除任务
TodoAPI.delete(id)
// 参数: id: string
// 返回: Promise<boolean>

// 更新任务排序
TodoAPI.updateOrder(projectId, todoOrders)
// 参数: projectId: string, todoOrders: {id: string, order: number}[]
// 返回: Promise<boolean>

// 移动任务到其他项目
TodoAPI.moveToProject(todoId, targetProjectId, order?)
// 参数: todoId: string, targetProjectId: string, order?: number
// 返回: Promise<Todo>
```

### Subtask API
```javascript
// 获取任务下的所有子任务
SubtaskAPI.getByTodoId(todoId)
// 参数: todoId: string
// 返回: Promise<Subtask[]>

// 根据ID获取子任务
SubtaskAPI.getById(id)
// 参数: id: string
// 返回: Promise<Subtask | null>

// 创建新子任务
SubtaskAPI.create(todoId, subtaskData)
// 参数: todoId: string, subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>
// 返回: Promise<Subtask>

// 更新子任务
SubtaskAPI.update(id, updates)
// 参数: id: string, updates: Partial<Subtask>
// 返回: Promise<Subtask>

// 更新子任务状态
SubtaskAPI.updateStatus(id, status)
// 参数: id: string, status: 'pending' | 'completed'
// 返回: Promise<Subtask>

// 删除子任务
SubtaskAPI.delete(id)
// 参数: id: string
// 返回: Promise<boolean>

// 更新子任务排序
SubtaskAPI.updateOrder(todoId, subtaskOrders)
// 参数: todoId: string, subtaskOrders: {id: string, order: number}[]
// 返回: Promise<boolean>
```

### URL Management API
```javascript
// 获取项目的所有URL
ProjectUrlAPI.getByProjectId(projectId)
// 参数: projectId: string
// 返回: Promise<ProjectUrl[]>

// 添加项目URL
ProjectUrlAPI.create(projectId, urlData)
// 参数: projectId: string, urlData: {name: string, url: string, icon?: string}
// 返回: Promise<ProjectUrl>

// 更新项目URL
ProjectUrlAPI.update(urlId, updates)
// 参数: urlId: string, updates: Partial<ProjectUrl>
// 返回: Promise<ProjectUrl>

// 删除项目URL
ProjectUrlAPI.delete(urlId)
// 参数: urlId: string
// 返回: Promise<boolean>

// 验证URL有效性
ProjectUrlAPI.validateUrl(url)
// 参数: url: string
// 返回: Promise<{valid: boolean, error?: string}>
```

### Storage API
```javascript
// 保存数据到文件系统
StorageAPI.saveToFile(data, filename?)
// 参数: data: AppData, filename?: string
// 返回: Promise<boolean>

// 从文件系统加载数据
StorageAPI.loadFromFile()
// 返回: Promise<AppData | null>

// 导出数据
StorageAPI.exportData(format)
// 参数: format: 'json' | 'csv'
// 返回: Promise<Blob>

// 导入数据
StorageAPI.importData(file)
// 参数: file: File
// 返回: Promise<AppData>

// 设置存储路径
StorageAPI.setStoragePath()
// 返回: Promise<string | null>

// 获取当前存储路径
StorageAPI.getCurrentStoragePath()
// 返回: Promise<string | null>

// 创建备份
StorageAPI.createBackup()
// 返回: Promise<{filename: string, success: boolean}>

// 获取备份列表
StorageAPI.getBackupList()
// 返回: Promise<{filename: string, createdAt: Date, size: number}[]>

// 从备份恢复
StorageAPI.restoreFromBackup(backupFilename)
// 参数: backupFilename: string
// 返回: Promise<AppData>
```

### Settings API
```javascript
// 获取所有设置
SettingsAPI.getAll()
// 返回: Promise<AppSettings>

// 获取特定设置
SettingsAPI.get(key)
// 参数: key: keyof AppSettings
// 返回: Promise<any>

// 更新设置
SettingsAPI.update(settings)
// 参数: settings: Partial<AppSettings>
// 返回: Promise<AppSettings>

// 重置设置到默认值
SettingsAPI.reset()
// 返回: Promise<AppSettings>

// 导入设置
SettingsAPI.importSettings(settingsData)
// 参数: settingsData: AppSettings
// 返回: Promise<AppSettings>

// 导出设置
SettingsAPI.exportSettings()
// 返回: Promise<Blob>
```

### Validation API
```javascript
// 验证项目数据
ValidationAPI.validateProject(projectData)
// 参数: projectData: Partial<Project>
// 返回: {valid: boolean, errors: string[]}

// 验证任务数据
ValidationAPI.validateTodo(todoData)
// 参数: todoData: Partial<Todo>
// 返回: {valid: boolean, errors: string[]}

// 验证子任务数据
ValidationAPI.validateSubtask(subtaskData)
// 参数: subtaskData: Partial<Subtask>
// 返回: {valid: boolean, errors: string[]}

// 验证导入数据完整性
ValidationAPI.validateImportData(data)
// 参数: data: any
// 返回: {valid: boolean, errors: string[], warnings: string[]}

// 验证URL格式
ValidationAPI.validateUrl(url)
// 参数: url: string
// 返回: {valid: boolean, error?: string}
```
