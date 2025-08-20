# 项目风险状态可视化功能 - Brownfield Addition

## 1. Quick Project Assessment

### Current System Context:

- [x] Relevant existing functionality identified
  - 现有项目卡片组件 (`ProjectCard.tsx`) 已有状态显示功能
  - 使用 Badge 组件显示项目状态 ("已结束"/"进行中")
  - 已有状态切换按钮 (CheckCircle2 图标)
  - 使用 shadcn/ui 组件库和 Tailwind CSS

- [x] Technology stack for this area noted
  - React + TypeScript + Vite
  - shadcn/ui 组件库
  - Tailwind CSS 样式
  - Lucide React 图标库

- [x] Integration point(s) clearly understood
  - ProjectCard 组件的 CardHeader 区域
  - Project 数据模型需要扩展新的状态字段
  - 状态切换逻辑通过 onUpdateProject 回调函数

- [x] Existing patterns for similar work identified
  - 现有的状态切换按钮模式
  - Badge 组件的样式模式
  - Tooltip 提示交互模式
  - cn() 函数的样式条件渲染模式

### Change Scope:

- [x] Specific change clearly defined
  - 添加项目风险状态字段到 Project 类型
  - 在项目卡片左上角添加风险状态指示灯
  - 移除现有的 CheckCircle2 状态切换按钮
  - 通过点击状态指示灯切换项目状态

- [x] Impact boundaries identified
  - 仅影响 ProjectCard 组件的显示和交互
  - 需要扩展 Project 类型定义
  - 状态切换逻辑保持现有模式

- [x] Success criteria established
  - 状态指示灯在卡片左上角正确显示
  - 点击指示灯能够循环切换状态
  - 不同状态有清晰的颜色区分
  - 移除原有状态按钮后不影响其他功能

## 2. Story Creation

### Story Title
项目风险状态指示灯 - Brownfield Addition

### User Story
作为一个独立开发者，
我希望在项目卡片上通过颜色指示灯快速识别项目的风险状态，
以便我能够快速了解哪些项目需要关注或有风险。

### Story Context

**Existing System Integration:**
- Integrates with: ProjectCard 组件的 CardHeader 区域
- Technology: React + TypeScript, shadcn/ui, Tailwind CSS
- Follows pattern: 现有的状态显示和切换模式
- Touch points: Project 类型定义、ProjectCard 组件渲染逻辑、状态更新回调

### Acceptance Criteria

**Functional Requirements:**
1. 项目卡片左上角显示圆形状态指示灯，包含6种状态：高风险(红色)、注意(橙色)、正常(绿色)、超前(蓝色)、暂停(灰色)、已完成(绿色圆环)
2. 单击状态指示灯在进行中状态间循环切换(normal→attention→high→ahead→paused→normal)
3. 双击状态指示灯可以切换到/离开已完成状态
4. 移除现有的 CheckCircle2 状态切换按钮，保持其他操作按钮不变

**Integration Requirements:**
5. 现有的项目管理功能继续正常工作
6. 新的状态字段遵循现有的数据更新模式
7. 与现有的拖拽、编辑、删除功能保持兼容
8. 添加"所有项目"筛选选项解决状态切换时卡片消失问题

**Quality Requirements:**
9. 状态指示灯有合适的 hover 提示显示状态名称和操作方式
10. 已完成状态使用绿色圆环样式区分于实心圆进行中状态
11. 所有现有功能回归测试通过

### Technical Notes

- **Integration Approach:** 在 Project 接口添加可选的 riskStatus 字段，在 ProjectCard 组件的 CardHeader 左上角渲染状态指示灯
- **Existing Pattern Reference:** 使用类似现有 Badge 组件的样式模式，遵循 Tooltip 的交互模式
- **Key Constraints:** 必须保持现有布局不被破坏，状态指示灯应该紧凑且不干扰其他功能

### Definition of Done

- [x] Project 类型添加 riskStatus 字段定义，包含completed状态
- [x] ProjectCard 组件左上角显示状态指示灯，支持6种状态
- [x] 单击指示灯能够在5种进行中状态间循环切换
- [x] 双击指示灯能够切换到/离开已完成状态
- [x] 已完成状态使用绿色圆环样式，进行中状态使用实心圆
- [x] 移除原有的 CheckCircle2 状态按钮
- [x] 添加"所有项目"筛选选项，默认显示所有项目
- [x] 状态指示灯有详细的 hover 提示显示操作方式
- [x] 现有功能不受影响，通过手动回归测试
- [x] 代码遵循现有项目的 TypeScript 和样式规范

## 3. Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk:** 修改 Project 类型可能影响现有数据序列化/反序列化
- **Mitigation:** 使用可选字段，添加默认值处理逻辑
- **Rollback:** 可以简单地隐藏状态指示灯或恢复原有按钮

**Compatibility Verification:**
- [x] No breaking changes to existing APIs (使用可选字段)
- [x] Database changes (if any) are additive only (仅添加可选字段)
- [x] UI changes follow existing design patterns (遵循现有 Badge 和 Tooltip 模式)
- [x] Performance impact is negligible (仅增加简单的状态渲染)

## 4. Validation Checklist

**Scope Validation:**
- [x] Story can be completed in one development session (预计2-3小时)
- [x] Integration approach is straightforward (直接在现有组件中添加)
- [x] Follows existing patterns exactly (使用现有的样式和交互模式)
- [x] No design or architecture work required (使用现有组件和模式)

**Clarity Check:**
- [x] Story requirements are unambiguous (明确的5种状态和交互方式)
- [x] Integration points are clearly specified (ProjectCard 组件左上角位置)
- [x] Success criteria are testable (可以通过手动测试验证所有功能)
- [x] Rollback approach is simple (可以通过版本控制轻松回滚)

## Success Criteria

The story creation is successful when:

1. ✅ Enhancement is clearly defined and appropriately scoped for single session
2. ✅ Integration approach is straightforward and low-risk
3. ✅ Existing system patterns are identified and will be followed
4. ✅ Rollback plan is simple and feasible
5. ✅ Acceptance criteria include existing functionality verification

## Implementation Notes

这个用户故事符合 brownfield-create-story 任务的要求：
- 可以在单个开发会话中完成（2-3小时）
- 不需要新的架构或重大设计工作
- 完全遵循现有模式
- 集成简单，风险最小
- 变更边界清晰

该功能将为项目管理工具增加视觉化的风险状态管理能力，同时保持与现有系统的完全兼容性。

## Dev Agent Record

### Status: Ready for Review

### Tasks Completed:
- [x] 扩展 Project 类型定义，添加 riskStatus 字段 
- [x] 在 ProjectCard 组件左上角添加状态指示灯
- [x] 实现点击指示灯循环切换5种状态的逻辑
- [x] 移除现有的 CheckCircle2 状态切换按钮
- [x] 添加状态指示灯的颜色样式和 hover 提示
- [x] 执行回归测试确保现有功能正常

### File List:
- `src/types/index.ts` - 添加 RiskStatus 类型定义和 Project 接口的 riskStatus 字段
- `src/components/ProjectCard.tsx` - 添加风险状态指示灯组件、状态切换逻辑，移除原有状态按钮

### Completion Notes:
- 成功实现了统一的6种状态系统：正常、注意、高风险、超前、暂停、已完成
- 进行中状态循环切换：正常(绿色) → 注意(橙色) → 高风险(红色) → 超前(蓝色) → 暂停(灰色)
- 已完成状态使用绿色圆环样式，与实心圆进行中状态形成清晰视觉区分
- 单击进行状态循环，双击切换完成状态，交互逻辑清晰
- 添加"所有项目"筛选选项，解决了状态切换时卡片消失的用户体验问题
- Tooltip 提示显示详细的操作方式和当前状态信息
- 移除原有 CheckCircle2 按钮后布局保持良好
- 所有现有功能（拖拽、编辑、添加待办、URL 管理等）均正常工作
- 通过了 ESLint、TypeScript 类型检查和所有单元测试

### Change Log:
1. 在 `src/types/index.ts` 中扩展了 `RiskStatus` 类型定义，包含6种状态并添加状态转换工具函数
2. 在 `src/components/ProjectCard.tsx` 中：
   - 导入移除了 `CheckCircle2`，新增状态转换函数
   - 更新风险状态配置，添加completed状态的绿色圆环样式
   - 实现单击/双击不同的状态切换逻辑
   - 在 CardHeader 左上角添加了支持两种样式的状态指示灯
   - 移除了原有的状态切换按钮，更新Badge显示逻辑
   - 添加了详细的 Tooltip 提示显示操作方式
3. 在 `src/components/StatusToggle.tsx` 中添加了"所有项目"筛选选项
4. 在 `src/components/ProjectGrid.tsx` 中更新筛选逻辑支持"all"选项
5. 在 `src/hooks/useProjects.ts` 中添加数据迁移逻辑和更新demo数据

### Debug Log References:
- 手动回归测试通过，包括状态切换、拖拽、添加待办等核心功能
- Lint 检查通过（仅有组件库相关警告，不影响功能）
- TypeScript 类型检查通过
- Vitest 单元测试全部通过