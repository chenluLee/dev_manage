# Error Handling Strategy

## Client-Side Error Handling
```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  ErrorManager.logError(event.error);
  NotificationManager.showError('应用遇到错误，请刷新页面重试');
});

// Promise错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  ErrorManager.logError(event.reason);
});

// 业务错误处理
class ErrorManager {
  static logError(error) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // 存储到本地用于调试
    localStorage.setItem('lastError', JSON.stringify(errorInfo));
  }
  
  static handleStorageError(error) {
    if (error.name === 'NotAllowedError') {
      return '存储权限被拒绝，请检查浏览器设置';
    } else if (error.name === 'QuotaExceededError') {
      return '存储空间不足，请清理数据或更换存储位置';
    } else {
      return '存储操作失败：' + error.message;
    }
  }
}
```

## User-Friendly Error Messages
```javascript
const ERROR_MESSAGES = {
  STORAGE_PERMISSION_DENIED: '无法访问文件系统，请检查浏览器权限设置',
  STORAGE_QUOTA_EXCEEDED: '存储空间不足，请清理数据或选择其他存储位置',
  INVALID_DATA_FORMAT: '数据格式不正确，请检查导入文件',
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  BROWSER_NOT_SUPPORTED: '您的浏览器不支持此功能，请升级到最新版本'
};
```
