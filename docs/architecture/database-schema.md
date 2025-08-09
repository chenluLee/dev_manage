# Database Schema

## IndexedDB Schema
```javascript
// 数据库名称: TodoToolDB
// 版本: 1

// 对象存储: projects
{
  keyPath: "id",
  indexes: {
    "status": { keyPath: "status" },
    "createdAt": { keyPath: "createdAt" },
    "order": { keyPath: "order" }
  }
}

// 对象存储: settings
{
  keyPath: "key"
}

// 对象存储: backups
{
  keyPath: "timestamp"
}
```

## File System Schema
```
用户选择的文件夹/
├── todo-data.json          # 主数据文件
├── backups/
│   ├── backup-YYYY-MM-DD-HH-mm.json
│   └── ...
└── exports/
    ├── export-YYYY-MM-DD.json
    └── ...
```
