# External APIs

## File System Access API
**用途：** 允许用户选择存储文件夹，实现真正的本地文件管理

**集成方式：**
```javascript
// 请求目录访问权限
const directoryHandle = await window.showDirectoryPicker();

// 创建或获取文件
const fileHandle = await directoryHandle.getFileHandle('data.json', { create: true });

// 读写文件
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(data));
await writable.close();
```

## IndexedDB API
**用途：** 作为File System Access API的后备存储方案

**数据结构：**
- `projects` 对象存储：存储所有项目数据
- `settings` 对象存储：存储应用设置
- `backups` 对象存储：存储自动备份
