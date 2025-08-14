import { ReportData } from '@/types';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * AI报告生成提示词模板
 * 提供专业的工作报告生成指导
 */

/**
 * 生成AI报告的主要提示词模板
 * @param reportData 报告数据
 * @returns 格式化的提示词
 */
export function generateReportPrompt(reportData: ReportData): string {
  const startDate = format(parseISO(reportData.dateRange.start), 'yyyy年MM月dd日', { locale: zhCN });
  const endDate = format(parseISO(reportData.dateRange.end), 'yyyy年MM月dd日', { locale: zhCN });
  
  // 构造数据摘要
  const dataSummary = buildDataSummary(reportData);
  
  // 构造详细内容
  const detailedContent = buildDetailedContent(reportData);

  const prompt = `你是一名专业的工作报告撰写助手。请基于以下工作数据，生成一份专业、结构化的中文工作报告。

## 报告要求：
1. 使用专业且友好的语言风格
2. 重点突出工作成果和价值
3. 提供有意义的数据分析和洞察
4. 结构清晰，易于阅读
5. 体现工作效率和成长

## 时间范围：
${startDate} 至 ${endDate}

## 工作数据摘要：
${dataSummary}

## 详细完成事项：
${detailedContent}

## 报告结构要求：
请按以下结构生成报告：

### 1. 工作概览
- 简要总结本期间的主要工作内容
- 突出重要成果和里程碑

### 2. 完成统计
- 项目完成情况：${reportData.statistics.totalProjects}个项目
- 任务完成情况：${reportData.statistics.totalTodos}个主要任务
- 细分任务情况：${reportData.statistics.totalSubtasks}个子任务
- 分析完成效率和质量

### 3. 重点项目进展
- 按项目分类展示主要成果
- 突出项目的业务价值和技术亮点
- 说明遇到的挑战和解决方案

### 4. 工作亮点与收获
- 总结本期间的主要成就
- 分析工作方法的改进
- 提及学习和技能提升

### 5. 下阶段展望
- 基于当前进展，简要展望后续工作方向
- 提及需要关注的重点领域

请确保报告内容专业、准确、有价值，体现工作的成果和价值。使用Markdown格式输出。`;

  return prompt;
}

/**
 * 构建数据摘要
 * @param reportData 报告数据
 * @returns 格式化的数据摘要
 */
function buildDataSummary(reportData: ReportData): string {
  const { statistics, completedItems } = reportData;
  
  let summary = `- 完成项目：${statistics.totalProjects}个\n`;
  summary += `- 完成任务：${statistics.totalTodos}个\n`;
  summary += `- 完成子任务：${statistics.totalSubtasks}个\n`;
  
  if (completedItems.length > 0) {
    summary += `- 涉及项目领域：${completedItems.map(item => item.projectName).join('、')}\n`;
    
    // 计算平均每个项目的任务数
    const avgTasksPerProject = statistics.totalTodos / statistics.totalProjects;
    summary += `- 平均每项目任务数：${avgTasksPerProject.toFixed(1)}个\n`;
    
    // 统计子任务分布
    if (statistics.totalSubtasks > 0) {
      const avgSubtasksPerTask = statistics.totalSubtasks / statistics.totalTodos;
      summary += `- 平均每任务细分：${avgSubtasksPerTask.toFixed(1)}个子任务\n`;
    }
  }
  
  return summary;
}

/**
 * 构建详细内容
 * @param reportData 报告数据
 * @returns 格式化的详细内容
 */
function buildDetailedContent(reportData: ReportData): string {
  if (reportData.completedItems.length === 0) {
    return "在指定时间范围内暂无完成的项目和任务。";
  }

  let content = "";
  
  reportData.completedItems.forEach((project, index) => {
    content += `\n**项目 ${index + 1}：${project.projectName}**\n`;
    
    project.todos.forEach((todo, todoIndex) => {
      const completedDate = format(parseISO(todo.completedAt), 'MM月dd日', { locale: zhCN });
      content += `${todoIndex + 1}. ${todo.content} (完成时间：${completedDate})\n`;
      
      if (todo.subtasks.length > 0) {
        todo.subtasks.forEach((subtask, subtaskIndex) => {
          const subtaskCompletedDate = format(parseISO(subtask.completedAt), 'MM月dd日', { locale: zhCN });
          content += `   - ${subtask.content} (${subtaskCompletedDate})\n`;
        });
      }
    });
  });
  
  return content;
}

/**
 * 生成简化版提示词（用于快速生成）
 * @param reportData 报告数据
 * @returns 简化的提示词
 */
export function generateSimplePrompt(reportData: ReportData): string {
  const startDate = format(parseISO(reportData.dateRange.start), 'yyyy年MM月dd日', { locale: zhCN });
  const endDate = format(parseISO(reportData.dateRange.end), 'yyyy年MM月dd日', { locale: zhCN });
  
  const prompt = `请根据以下工作数据生成一份简洁的工作总结（${startDate} - ${endDate}）：

完成情况：
- 项目：${reportData.statistics.totalProjects}个
- 任务：${reportData.statistics.totalTodos}个  
- 子任务：${reportData.statistics.totalSubtasks}个

请生成一份200-300字的工作总结，重点突出成果和价值。使用专业友好的语言，Markdown格式输出。`;

  return prompt;
}

/**
 * 生成自定义提示词
 * @param reportData 报告数据
 * @param customTemplate 自定义模板
 * @returns 自定义提示词
 */
export function generateCustomPrompt(reportData: ReportData, customTemplate: string): string {
  const startDate = format(parseISO(reportData.dateRange.start), 'yyyy年MM月dd日', { locale: zhCN });
  const endDate = format(parseISO(reportData.dateRange.end), 'yyyy年MM月dd日', { locale: zhCN });
  
  // 替换模板中的占位符
  const prompt = customTemplate
    .replace(/\{startDate\}/g, startDate)
    .replace(/\{endDate\}/g, endDate)
    .replace(/\{totalProjects\}/g, reportData.statistics.totalProjects.toString())
    .replace(/\{totalTodos\}/g, reportData.statistics.totalTodos.toString())
    .replace(/\{totalSubtasks\}/g, reportData.statistics.totalSubtasks.toString())
    .replace(/\{projectList\}/g, reportData.completedItems.map(item => item.projectName).join('、'))
    .replace(/\{dataSummary\}/g, buildDataSummary(reportData))
    .replace(/\{detailedContent\}/g, buildDetailedContent(reportData));
  
  return prompt;
}

/**
 * 预定义的提示词模板选项
 */
export const PROMPT_TEMPLATES = {
  comprehensive: {
    name: '详细报告',
    description: '生成完整、专业的工作报告，包含分析和洞察',
    generator: generateReportPrompt
  },
  simple: {
    name: '简洁总结',
    description: '生成简洁的工作总结，突出重点成果',
    generator: generateSimplePrompt
  },
  weekly: {
    name: '周报模板',
    description: '适合周报的格式和内容',
    generator: (data: ReportData) => generateCustomPrompt(data, `
请生成一份周报（{startDate} - {endDate}）：

## 本周工作完成情况
- 完成项目：{totalProjects}个
- 完成任务：{totalTodos}个
- 细分完成：{totalSubtasks}个子任务

## 主要成果
{detailedContent}

## 工作亮点
请基于上述完成情况，总结本周的主要工作亮点和价值体现。

## 下周计划
简要说明基于当前进展的下周工作重点。

使用Markdown格式，语言专业友好。
    `)
  },
  monthly: {
    name: '月报模板',
    description: '适合月报的格式和内容',
    generator: (data: ReportData) => generateCustomPrompt(data, `
请生成一份月度工作报告（{startDate} - {endDate}）：

## 月度工作概览
本月共完成{totalProjects}个项目，{totalTodos}个主要任务，{totalSubtasks}个细分任务。

## 详细完成情况
{detailedContent}

## 数据分析
{dataSummary}

## 重点成果与价值
请分析本月工作的主要成果、业务价值和技术亮点。

## 经验总结
总结本月工作中的经验教训和方法改进。

## 下月重点
基于当前进展，规划下月工作重点方向。

使用专业的Markdown格式输出。
    `)
  }
};