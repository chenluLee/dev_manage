import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StorageManager } from "@/managers/StorageManager";
import { FormatConverter } from "@/utils/formatConverters";
import { DataValidator } from "@/utils/dataValidation";
import { useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppData } from "@/types";
import { Upload, Download, Eye, Info } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentData: AppData;
  onImportComplete: (data: AppData) => void;
}

interface ImportPreview {
  totalProjects: number;
  totalTodos: number;
  version: string;
  format: string;
  formatDescription: string;
  warnings?: string[];
  validationWarnings?: string[];
  metadata: {
    createdAt: string;
    lastModified: string;
  };
}

export default function ImportExportModal({ 
  open, 
  onOpenChange, 
  currentData, 
  onImportComplete 
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportData, setPendingImportData] = useState<AppData | null>(null);
  const [operationStatus, setOperationStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const clearStatus = () => {
    setOperationStatus(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    clearStatus();
    
    try {
      const result = await StorageManager.downloadExportedData(
        currentData, 
        `project-data-export-${new Date().toISOString().split('T')[0]}.json`
      );
      
      if (result.success) {
        setOperationStatus({
          type: 'success',
          message: '数据导出成功'
        });
      } else if (result.error) {
        setOperationStatus({
          type: 'error',
          message: result.error.userFriendlyMessage || '导出失败'
        });
      }
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: '导出过程中发生未知错误'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsImporting(true);
    clearStatus();
    
    try {
      // 首先尝试解析文件内容
      const fileContent = await file.text();
      let parsedData: unknown;
      
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        setOperationStatus({
          type: 'error',
          message: '文件不是有效的JSON格式'
        });
        return;
      }

      // 检测格式信息
      const formatInfo = FormatConverter.getFormatInfo(parsedData);
      
      // 尝试转换为标准格式
      const conversionResult = FormatConverter.convertToAppData(parsedData);
      
      if (!conversionResult.success) {
        setOperationStatus({
          type: 'error',
          message: conversionResult.error || '数据转换失败'
        });
        return;
      }

      if (!conversionResult.data) {
        setOperationStatus({
          type: 'error',
          message: '转换后的数据为空'
        });
        return;
      }

      // 进行数据验证
      const validationResult = DataValidator.validateAppData(conversionResult.data, {
        checkIds: true,
        allowPartialData: false,
        strictMode: false // 允许警告，不严格模式
      });

      // 数据清理和标准化
      const sanitizedData = DataValidator.sanitizeAppData(conversionResult.data);
      
      // 生成预览信息
      const preview: ImportPreview = {
        totalProjects: sanitizedData.projects.length,
        totalTodos: sanitizedData.projects.reduce((total, project) => total + project.todos.length, 0),
        version: sanitizedData.version,
        format: formatInfo.format,
        formatDescription: formatInfo.description,
        warnings: conversionResult.warnings,
        validationWarnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
        metadata: {
          createdAt: new Date(sanitizedData.metadata.createdAt).toLocaleString('zh-CN'),
          lastModified: new Date(sanitizedData.metadata.lastModified).toLocaleString('zh-CN')
        }
      };
      
      setImportPreview(preview);
      setPendingImportData(sanitizedData);
      
      if (validationResult.errors.length > 0) {
        setOperationStatus({
          type: 'error',
          message: `数据验证失败: ${validationResult.errors[0]}`
        });
      } else {
        setOperationStatus({
          type: 'info',
          message: '数据解析成功，请确认导入内容'
        });
      }
      
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: '解析文件时发生未知错误'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = (overwrite: boolean = false) => {
    if (!pendingImportData) return;
    
    onImportComplete(pendingImportData);
    
    // 清理状态
    setImportPreview(null);
    setPendingImportData(null);
    setOperationStatus({
      type: 'success',
      message: '数据导入成功'
    });
    
    // 延时关闭模态框
    setTimeout(() => {
      onOpenChange(false);
    }, 1000);
  };

  const handleCancelImport = () => {
    setImportPreview(null);
    setPendingImportData(null);
    clearStatus();
  };

  const resetFileInput = () => {
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="import-export-desc" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>数据导入导出</DialogTitle>
          <DialogDescription id="import-export-desc">
            导出您的项目数据或从文件导入数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 当前数据统计 */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">当前数据统计</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">项目数量:</span>
                <span className="ml-2 font-medium">{currentData.projects.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">任务总数:</span>
                <span className="ml-2 font-medium">
                  {currentData.projects.reduce((total, project) => total + project.todos.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">数据版本:</span>
                <span className="ml-2 font-medium">{currentData.version}</span>
              </div>
              <div>
                <span className="text-muted-foreground">最后更新:</span>
                <span className="ml-2 font-medium">
                  {new Date(currentData.metadata.lastModified).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          {/* 导出功能 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">导出数据</Label>
            <div className="space-y-3">
              <Button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "导出中..." : "导出为JSON文件"}
              </Button>
              <p className="text-xs text-muted-foreground">
                将所有项目和任务数据导出为JSON格式文件，可用于备份和数据迁移
              </p>
            </div>
          </div>

          {/* 导入功能 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">导入数据</Label>
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                  resetFileInput();
                }}
              />
              <Button 
                variant="outline" 
                onClick={() => fileRef.current?.click()}
                disabled={isImporting}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "解析中..." : "选择JSON文件"}
              </Button>
              <p className="text-xs text-muted-foreground">
                支持导入标准格式的JSON数据文件，系统会自动验证数据完整性
              </p>
            </div>
          </div>

          {/* 导入预览 */}
          {importPreview && pendingImportData && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-900">导入预览</h3>
              </div>
              
              {/* 格式信息 */}
              <div className="bg-blue-100 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">文件格式</span>
                </div>
                <div className="text-sm text-blue-600">
                  {importPreview.formatDescription} ({importPreview.format})
                </div>
              </div>

              {/* 数据统计 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">项目数量:</span>
                  <span className="ml-2 font-medium">{importPreview.totalProjects}</span>
                </div>
                <div>
                  <span className="text-blue-700">任务总数:</span>
                  <span className="ml-2 font-medium">{importPreview.totalTodos}</span>
                </div>
                <div>
                  <span className="text-blue-700">数据版本:</span>
                  <span className="ml-2 font-medium">{importPreview.version}</span>
                </div>
                <div>
                  <span className="text-blue-700">创建时间:</span>
                  <span className="ml-2 font-medium">{importPreview.metadata.createdAt}</span>
                </div>
              </div>

              {/* 转换警告 */}
              {importPreview.warnings && importPreview.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <div className="text-sm font-medium text-yellow-800 mb-2">转换警告:</div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importPreview.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 验证警告 */}
              {importPreview.validationWarnings && importPreview.validationWarnings.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                  <div className="text-sm font-medium text-orange-800 mb-2">数据质量提醒:</div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {importPreview.validationWarnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 导入按钮 */}
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  onClick={() => handleConfirmImport(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  确认导入（覆盖现有数据）
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancelImport}
                >
                  取消导入
                </Button>
              </div>
            </div>
          )}

          {/* 状态消息 */}
          {operationStatus && (
            <Alert variant={operationStatus.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>
                {operationStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 支持的文件格式说明 */}
          <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground space-y-1">
            <div><strong>支持的格式：</strong> JSON (.json)</div>
            <div><strong>兼容的工具：</strong></div>
            <ul className="ml-4 space-y-1">
              <li>• PMApp 标准格式 - 完全支持</li>
              <li>• Todoist 导出文件 - 自动转换项目和任务</li>
              <li>• Trello 导出文件 - 列表转为项目，卡片转为任务</li>
            </ul>
            <div><strong>安全性：</strong> 导入前会自动验证数据结构和完整性，支持数据清理和标准化</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}