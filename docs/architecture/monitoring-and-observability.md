# Monitoring and Observability

## Client-Side Monitoring
```javascript
// 性能监控
class PerformanceMonitor {
  static measurePageLoad() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart);
      
      // 可选：发送到分析服务
      this.sendMetrics('page_load', {
        loadTime: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart
      });
    });
  }
  
  static measureUserInteraction(action) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        console.log(`${action} took ${duration}ms`);
        
        if (duration > 100) {
          console.warn(`Slow interaction detected: ${action}`);
        }
      }
    };
  }
}

// 用户行为分析（可选）
class AnalyticsManager {
  static trackEvent(eventName, properties = {}) {
    // 本地存储用户行为数据（隐私友好）
    const event = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      session: this.getSessionId()
    };
    
    this.storeEventLocally(event);
  }
  
  static generateUsageReport() {
    const events = this.getStoredEvents();
    return {
      totalProjects: events.filter(e => e.name === 'project_created').length,
      totalTodos: events.filter(e => e.name === 'todo_created').length,
      averageSessionTime: this.calculateAverageSessionTime(events)
    };
  }
}
```

## Debugging Tools
```javascript
// 开发模式调试工具
if (CONFIG.DEBUG) {
  window.TodoToolDebug = {
    exportState: () => JSON.stringify(StateManager.getState(), null, 2),
    importState: (stateJson) => StateManager.setState(JSON.parse(stateJson)),
    clearStorage: () => StorageManager.clear(),
    simulateError: () => { throw new Error('测试错误'); }
  };
  
  console.log('Debug tools available at window.TodoToolDebug');
}
```
