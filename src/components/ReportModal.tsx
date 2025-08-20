import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useMemo, useEffect } from "react";
import { format, subDays, isAfter, isBefore, isEqual, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, Download, FileText, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ReportData, AppSettings } from "@/types";
import { download } from "@/hooks/useLocalStorage";
import { OllamaService } from "@/services/OllamaService";
import { generateReportPrompt, generateSimplePrompt, PROMPT_TEMPLATES } from "@/utils/reportPrompts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: Project[];
  settings: AppSettings;
  onOpenSettings?: () => void;
}

export default function ReportModal({ open, onOpenChange, projects, settings, onOpenSettings }: Props) {
  // 日期范围状态
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subDays(new Date(), 30), // 默认过去30天
    to: new Date(),
  });

  // 报告内容编辑状态
  const [reportContent, setReportContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // AI生成相关状态
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>("comprehensive");
  const [retryCount, setRetryCount] = useState(0);

  // 过滤完成事项数据
  const reportData = useMemo<ReportData | null>(() => {
    if (!dateRange.from || !dateRange.to) return null;

    const startDate = dateRange.from;
    const endDate = dateRange.to;

    const completedItems: ReportData['completedItems'] = [];
    let totalTodos = 0;
    let totalSubtasks = 0;

    projects.forEach(project => {
      const completedTodos = project.todos.filter(todo => {
        if (!todo.completedAt) return false;
        const completedDate = parseISO(todo.completedAt);
        return (
          (isEqual(completedDate, startDate) || isAfter(completedDate, startDate)) &&
          (isEqual(completedDate, endDate) || isBefore(completedDate, endDate))
        );
      });

      if (completedTodos.length > 0) {
        const projectData = {
          projectName: project.name,
          riskStatus: project.riskStatus,
          todos: completedTodos.map(todo => {
            const completedSubtasks = todo.subtasks.filter(subtask => {
              if (!subtask.completedAt) return false;
              const completedDate = parseISO(subtask.completedAt);
              return (
                (isEqual(completedDate, startDate) || isAfter(completedDate, startDate)) &&
                (isEqual(completedDate, endDate) || isBefore(completedDate, endDate))
              );
            });

            totalSubtasks += completedSubtasks.length;

            return {
              content: todo.text,
              completedAt: todo.completedAt!,
              subtasks: completedSubtasks.map(subtask => ({
                content: subtask.text,
                completedAt: subtask.completedAt!,
              })),
            };
          }),
        };

        completedItems.push(projectData);
        totalTodos += completedTodos.length;
      }
    });

    return {
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
      completedItems,
      statistics: {
        totalProjects: completedItems.length,
        totalTodos,
        totalSubtasks,
      },
    };
  }, [projects, dateRange]);

  // 生成基础报告内容
  const generateReportContent = (data: ReportData): string => {
    const startDate = format(parseISO(data.dateRange.start), 'yyyy年MM月dd日', { locale: zhCN });
    const endDate = format(parseISO(data.dateRange.end), 'yyyy年MM月dd日', { locale: zhCN });

    let content = `# 工作报告 (${startDate} - ${endDate})\n\n`;
    content += `## 完成统计\n\n`;
    content += `- 完成项目：${data.statistics.totalProjects}个\n`;
    content += `- 完成任务：${data.statistics.totalTodos}个\n`;
    content += `- 完成子任务：${data.statistics.totalSubtasks}个\n\n`;

    if (data.completedItems.length > 0) {
      content += `## 详细内容\n\n`;
      
      data.completedItems.forEach((project, index) => {
        content += `### ${index + 1}. ${project.projectName}\n\n`;
        
        project.todos.forEach((todo, todoIndex) => {
          const completedDate = format(parseISO(todo.completedAt), 'MM-dd', { locale: zhCN });
          content += `${todoIndex + 1}. **${todo.content}** ✅ ${completedDate}\n`;
          
          if (todo.subtasks.length > 0) {
            todo.subtasks.forEach((subtask, subtaskIndex) => {
              const subtaskCompletedDate = format(parseISO(subtask.completedAt), 'MM-dd', { locale: zhCN });
              content += `   - ${subtask.content} ✅ ${subtaskCompletedDate}\n`;
            });
          }
          content += '\n';
        });
      });
    } else {
      content += `## 详细内容\n\n`;
      content += `在选定的时间范围内暂无完成的任务。\n\n`;
    }

    content += `---\n\n`;
    content += `*报告生成时间：${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}*\n`;

    return content;
  };

  // 当日期范围或数据变化时，自动生成报告内容
  useEffect(() => {
    if (reportData && open) {
      setIsGenerating(true);
      const content = generateReportContent(reportData);
      setReportContent(content);
      setIsGenerating(false);
    }
  }, [reportData, open]);

  // 快捷日期选择
  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  // 检查AI配置是否完整
  const isAiConfigured = useMemo(() => {
    // 如果 aiReport 为空，使用默认配置进行检查
    const configToCheck = settings.aiReport || {
      ollamaUrl: "http://localhost:11434",
      modelName: "gpt-oss",
      temperature: 0.7
    };
    return OllamaService.isConfigComplete(configToCheck);
  }, [settings.aiReport]);

  // AI生成报告
  const generateAiReport = async (isRetry = false) => {
    if (!reportData || !isAiConfigured) return;

    if (!isRetry) {
      setRetryCount(0);
    }

    setIsAiGenerating(true);
    setAiError(null);

    try {
      // 记录生成开始
      console.log(`AI报告生成开始 - 模板: ${selectedPromptTemplate}, 重试次数: ${retryCount}`);
      
      // 根据选择的模板获取提示词生成器
      const templateConfig = PROMPT_TEMPLATES[selectedPromptTemplate as keyof typeof PROMPT_TEMPLATES];
      const prompt = templateConfig ? templateConfig.generator(reportData) : generateReportPrompt(reportData);

      // 获取AI配置，如果为空则使用默认值
      const aiConfig = settings.aiReport || {
        ollamaUrl: "http://localhost:11434",
        modelName: "gpt-oss",
        temperature: 0.7
      };
      
      // 调用AI服务
      const result = await OllamaService.generateReport(aiConfig, prompt);
      
      if (result.success && result.content) {
        // 将AI生成的内容填充到编辑区域
        setReportContent(result.content);
        setAiError(null);
        setRetryCount(0);
        console.log('AI报告生成成功');
      } else {
        // 记录错误详情
        console.error('AI生成失败:', result.error);
        
        // 构造用户友好的错误信息
        let errorMessage = result.error || 'AI生成失败';
        if (result.error?.includes('fetch')) {
          errorMessage = '网络连接失败，请检查Ollama服务器是否运行';
        } else if (result.error?.includes('timeout') || result.error?.includes('超时')) {
          errorMessage = '请求超时，服务器响应缓慢，请稍后重试';
        } else if (result.error?.includes('500') || result.error?.includes('服务器响应格式无效')) {
          errorMessage = '服务器内部错误，请检查模型是否已下载';
        }
        
        setAiError(errorMessage);
      }
    } catch (error) {
      console.error('AI生成报告异常:', error);
      
      // 分析错误类型，提供针对性建议
      let errorMessage = '生成过程中发生未知错误';
      if (error instanceof Error) {
        if (error.message.includes('AbortError') || error.message.includes('timeout')) {
          errorMessage = '请求超时，请检查网络连接或降低模型温度参数';
        } else if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage = '网络连接失败，请确认Ollama服务器地址正确且服务正在运行';
        } else {
          errorMessage = error.message;
        }
      }
      
      setAiError(errorMessage);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 重试AI生成
  const retryAiGeneration = async () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    console.log(`重试AI生成，第 ${newRetryCount} 次重试`);
    await generateAiReport(true);
  };

  // 重置AI错误状态
  const clearAiError = () => {
    setAiError(null);
  };

  // 导出Markdown文件
  const exportMarkdown = () => {
    if (!reportData) return;
    
    const filename = `工作报告-${reportData.dateRange.start}-${reportData.dateRange.end}.md`;
    download(filename, reportContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="report-desc" className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            生成工作报告
          </DialogTitle>
          <DialogDescription id="report-desc">
            选择时间范围并生成工作完成情况报告
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-6 py-4">
          {/* 日期范围选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">报告时间范围</Label>
            
            {/* 快捷选择按钮 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(7)}
                className="text-xs"
              >
                过去7天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(30)}
                className="text-xs"
              >
                过去30天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(90)}
                className="text-xs"
              >
                过去90天
              </Button>
            </div>

            {/* 自定义日期选择 */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-xs">开始日期：</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MM-dd", { locale: zhCN }) : "选择日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      disabled={(date) => {
                        const today = new Date();
                        return date > today || (dateRange.to && date > dateRange.to);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-xs">结束日期：</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MM-dd", { locale: zhCN }) : "选择日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      disabled={(date) => {
                        const today = new Date();
                        return date > today || (dateRange.from && date < dateRange.from);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* 完成事项预览 */}
          {reportData && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">完成事项预览</Label>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                <div className="flex gap-4">
                  <span>项目：{reportData.statistics.totalProjects}个</span>
                  <span>任务：{reportData.statistics.totalTodos}个</span>
                  <span>子任务：{reportData.statistics.totalSubtasks}个</span>
                </div>
              </div>
            </div>
          )}

          {/* AI生成功能区域 */}
          {isAiConfigured && reportData && (
            <div className="space-y-3 border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">AI智能生成</Label>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <Label htmlFor="template-select" className="text-xs text-gray-600 dark:text-gray-300">报告模板</Label>
                  <Select
                    value={selectedPromptTemplate}
                    onValueChange={setSelectedPromptTemplate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择报告模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:block">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={generateAiReport}
                  disabled={isAiGenerating || !reportData}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="default"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">AI正在分析工作数据并生成报告...</span>
                      <span className="sm:hidden">AI生成中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">AI生成报告</span>
                      <span className="sm:hidden">AI生成</span>
                    </>
                  )}
                </Button>
              </div>

              {aiError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <span>{aiError}</span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        {retryCount < 3 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={retryAiGeneration}
                            disabled={isAiGenerating}
                            className="text-sm w-full sm:w-auto"
                          >
                            {isAiGenerating ? '重试中...' : `重试 (${retryCount + 1}/3)`}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAiError}
                          className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                        >
                          关闭
                        </Button>
                      </div>
                      {retryCount >= 3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          已达到最大重试次数，建议检查网络连接或Ollama服务器配置。您可以手动编辑报告内容。
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* AI配置提示 */}
          {!isAiConfigured && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="flex flex-col gap-2">
                  <span className="font-medium">要使用AI生成功能，需要配置Ollama服务器：</span>
                  <ul className="text-sm list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                    {!settings.aiReport?.ollamaUrl && <li>设置Ollama服务器URL（如：http://localhost:11434）</li>}
                    {!settings.aiReport?.modelName && <li>配置AI模型名称（如：llama3.2）</li>}
                    {typeof settings.aiReport?.temperature !== 'number' && <li>设置温度参数（0-2之间的数值）</li>}
                  </ul>
                  <div className="flex items-center gap-2 mt-1">
                    {onOpenSettings ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenSettings}
                        className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600"
                      >
                        打开设置
                      </Button>
                    ) : (
                      <span className="text-xs">请在设置页面中配置AI相关参数</span>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 报告内容编辑区域 */}
          <div className="flex-1 flex flex-col space-y-2">
            <Label htmlFor="report-content" className="text-sm font-medium">报告内容</Label>
            <Textarea
              id="report-content"
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder={isGenerating ? "正在生成报告内容..." : "报告内容将在选择日期范围后自动生成，您也可以手动编辑"}
              className="flex-1 min-h-[300px] font-mono text-xs"
              disabled={isGenerating}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={exportMarkdown}
            disabled={!reportData || !reportContent.trim()}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出Markdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}