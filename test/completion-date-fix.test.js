// 测试完成日期修复功能

// 模拟数据
const mockProjects = [
  {
    id: '1',
    name: '测试项目',
    todos: [
      {
        id: 'todo1',
        text: '已完成但没有日期的待办事项',
        isCompleted: true,
        // 缺少 completedAt 字段
        subtasks: [
          {
            id: 'sub1',
            text: '已完成的子任务1',
            isCompleted: true,
            // 缺少 completedAt 字段
          },
          {
            id: 'sub2',
            text: '未完成的子任务',
            isCompleted: false,
          }
        ]
      },
      {
        id: 'todo2',
        text: '正常的待办事项',
        isCompleted: true,
        completedAt: '2024-01-01T00:00:00.000Z',
        subtasks: []
      }
    ]
  }
];

// 模拟 fixCompletionDates 函数的核心逻辑
function fixCompletionDates(projects) {
  const currentDate = new Date().toISOString();
  let hasChanges = false;
  
  const updatedProjects = projects.map(project => {
    const updatedTodos = project.todos.map(todo => {
      let newTodo = { ...todo };
      
      // 检查并修复待办事项的完成日期
      if (todo.isCompleted && !todo.completedAt) {
        newTodo = { ...newTodo, completedAt: currentDate };
        hasChanges = true;
        console.log(`修复待办事项 "${todo.text}" 的完成日期`);
      }
      
      // 检查并修复子任务的完成日期
      const updatedSubtasks = todo.subtasks.map(subtask => {
        if (subtask.isCompleted && !subtask.completedAt) {
          hasChanges = true;
          console.log(`修复子任务 "${subtask.text}" 的完成日期`);
          return { ...subtask, completedAt: currentDate };
        }
        return subtask;
      });
      
      // 如果子任务有变化，更新todo
      if (updatedSubtasks.some((subtask, index) => subtask !== todo.subtasks[index])) {
        newTodo = { ...newTodo, subtasks: updatedSubtasks };
      }
      
      return newTodo;
    });
    
    return { ...project, todos: updatedTodos };
  });
  
  return { projects: updatedProjects, hasChanges };
}

// 运行测试
console.log('=== 测试完成日期修复功能 ===');
console.log('原始数据:');
console.log(JSON.stringify(mockProjects, null, 2));

const result = fixCompletionDates(mockProjects);

console.log('\n=== 修复结果 ===');
console.log('是否有修复:', result.hasChanges);
console.log('修复后的数据:');
console.log(JSON.stringify(result.projects, null, 2));

// 验证修复结果
const fixedTodo = result.projects[0].todos[0];
const fixedSubtask = result.projects[0].todos[0].subtasks[0];

console.log('\n=== 验证结果 ===');
console.log('待办事项修复验证:', fixedTodo.completedAt ? '✅ 成功' : '❌ 失败');
console.log('子任务修复验证:', fixedSubtask.completedAt ? '✅ 成功' : '❌ 失败');
console.log('未完成事项未受影响:', !result.projects[0].todos[0].subtasks[1].completedAt ? '✅ 成功' : '❌ 失败');
console.log('已有日期的事项未受影响:', result.projects[0].todos[1].completedAt === '2024-01-01T00:00:00.000Z' ? '✅ 成功' : '❌ 失败');