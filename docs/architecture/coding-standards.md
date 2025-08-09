# Coding Standards

## JavaScript编码规范
```javascript
// 使用ES6+现代语法
class ProjectCard extends HTMLElement {
  constructor() {
    super();
    this.project = null;
    this.render = this.render.bind(this);
  }
  
  // 使用async/await处理异步操作
  async saveProject(data) {
    try {
      const result = await StorageManager.save(data);
      this.showSuccessMessage('项目保存成功');
      return result;
    } catch (error) {
      this.showErrorMessage('保存失败：' + error.message);
      throw error;
    }
  }
}

// 命名约定
const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

// 函数命名：动词开头，描述性
function createProjectCard(project) { /* ... */ }
function updateProjectStatus(id, status) { /* ... */ }
function validateProjectData(data) { /* ... */ }
```

## CSS编码规范
```css
/* BEM命名方法 */
.project-card {
  /* 块级组件 */
}

.project-card__title {
  /* 元素 */
}

.project-card__title--completed {
  /* 修饰符 */
}

/* CSS变量 */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #10b981;
  --border-radius: 8px;
  --spacing-unit: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
```

## HTML编码规范
```html
<!-- 语义化标签 -->
<article class="project-card" data-project-id="123">
  <header class="project-card__header">
    <h2 class="project-card__title">项目标题</h2>
    <button class="project-card__status-toggle" 
            aria-label="切换项目状态"
            type="button">
      完成
    </button>
  </header>
  
  <section class="project-card__todos">
    <h3 class="sr-only">任务列表</h3>
    <ul class="todo-list" role="list">
      <!-- 任务项目 -->
    </ul>
  </section>
</article>
```
