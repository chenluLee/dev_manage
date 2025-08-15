import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { download } from "@/hooks/useLocalStorage";
import { StorageManager, StorageHealthCheck } from "@/managers/StorageManager";
import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackupManagerModal } from "./BackupManagerModal";
import { AppSettings, AppData } from "@/types";
import { HardDrive, Bot } from "lucide-react";
import { validateOllamaUrl, validateModelName, validateTemperature } from "@/utils/aiConfigValidation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storageKey: string;
  onStorageKeyChange: (v: string) => void;
  storagePath?: string;
  onStoragePathChange: (path: string) => void;
  onExport: () => string;
  onImport: (json: string) => Promise<{ ok: boolean; error?: unknown }>;
  onClear: () => void;
  stats?: { total: number; active: number; completed: number };
  settings: AppSettings;
  onSettingsUpdate: (settings: AppSettings) => void;
  currentData: AppData;
  onDataRestore?: (data: AppData) => void;
}

export default function SettingsModal({ 
  open, 
  onOpenChange, 
  storageKey, 
  onStorageKeyChange, 
  storagePath, 
  onStoragePathChange, 
  onExport, 
  onImport, 
  onClear, 
  stats,
  settings,
  onSettingsUpdate,
  currentData,
  onDataRestore
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [storageError, setStorageError] = useState<string>("");
  const [isSelectingPath, setIsSelectingPath] = useState(false);
  const [healthCheck, setHealthCheck] = useState<StorageHealthCheck | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [aiConfigErrors, setAiConfigErrors] = useState<{
    ollamaUrl?: string;
    modelName?: string;
    temperature?: string;
  }>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSelectStoragePath = async () => {
    setIsSelectingPath(true);
    setStorageError("");
    
    try {
      const result = await StorageManager.requestDirectoryAccess();
      
      if (result.success) {
        const pathName = StorageManager.getSelectedDirectoryName();
        if (pathName) {
          onStoragePathChange(pathName);
        }
      } else if (result.error) {
        setStorageError(result.error.message);
      }
    } catch (error) {
      setStorageError("选择目录时发生错误");
    } finally {
      setIsSelectingPath(false);
    }
  };

  const handleClearStoragePath = async () => {
    try {
      await StorageManager.clearStoragePath();
      onStoragePathChange("");
      setStorageError("");
    } catch (error) {
      setStorageError("清除存储路径时发生错误");
    }
  };

  const performHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await StorageManager.performHealthCheck();
      setHealthCheck(result);
    } catch (error) {
      setStorageError("健康检查失败");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleAiConfigChange = (field: 'ollamaUrl' | 'modelName' | 'temperature', value: string | number) => {
    const newAiReport = {
      ollamaUrl: settings.aiReport?.ollamaUrl || "http://localhost:11434",
      modelName: settings.aiReport?.modelName || "gpt-oss", 
      temperature: settings.aiReport?.temperature || 0.7,
      [field]: value
    };

    // 验证输入
    const errors = { ...aiConfigErrors };
    
    if (field === 'ollamaUrl') {
      const validation = validateOllamaUrl(value as string);
      if (!validation.isValid) {
        errors.ollamaUrl = validation.error;
      } else {
        delete errors.ollamaUrl;
      }
    } else if (field === 'modelName') {
      const validation = validateModelName(value as string);
      if (!validation.isValid) {
        errors.modelName = validation.error;
      } else {
        delete errors.modelName;
      }
    } else if (field === 'temperature') {
      const validation = validateTemperature(value as number);
      if (!validation.isValid) {
        errors.temperature = validation.error;
      } else {
        delete errors.temperature;
      }
    }

    setAiConfigErrors(errors);
    setConnectionTestResult(null); // 清除之前的连接测试结果
    
    onSettingsUpdate({
      ...settings,
      aiReport: newAiReport
    });
  };

  const testOllamaConnection = async () => {
    const config = {
      ollamaUrl: settings.aiReport?.ollamaUrl || "http://localhost:11434",
      modelName: settings.aiReport?.modelName || "gpt-oss",
      temperature: settings.aiReport?.temperature || 0.7
    };
    
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      // 使用更强大的OllamaService测试方法
      const { OllamaService } = await import('@/services/OllamaService');
      const result = await OllamaService.testConnection(config);
      
      if (result.success) {
        setConnectionTestResult({
          success: true,
          message: "连接测试成功！服务和模型都正常可用"
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: result.error || "连接测试失败"
        });
      }
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    if (open && storagePath) {
      performHealthCheck();
    }
  }, [open, storagePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="settings-desc" className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>系统设置</DialogTitle>
          <DialogDescription id="settings-desc">管理数据存储路径、导入导出与其他选项。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2">
            <Label>数据存储路径</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleSelectStoragePath}
                  disabled={isSelectingPath}
                  className="flex-shrink-0"
                >
                  {isSelectingPath ? "选择中..." : "选择文件夹"}
                </Button>
                {storagePath && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={performHealthCheck}
                      disabled={isCheckingHealth}
                      className="text-muted-foreground"
                    >
                      {isCheckingHealth ? "检查中..." : "健康检查"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClearStoragePath}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      清除
                    </Button>
                  </>
                )}
                <span className="text-sm text-muted-foreground flex-1">
                  {storagePath ? `已选择：${storagePath}` : "未选择（使用浏览器本地存储）"}
                </span>
              </div>
              
              {!StorageManager.isFileSystemAccessSupported() && (
                <Alert>
                  <AlertDescription>
                    您的浏览器不支持文件系统访问功能，仅能使用浏览器本地存储
                  </AlertDescription>
                </Alert>
              )}
              
              {storageError && (
                <Alert variant="destructive">
                  <AlertDescription>{storageError}</AlertDescription>
                </Alert>
              )}

              {healthCheck && (
                <div className="space-y-2">
                  {healthCheck.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <div className="space-y-1">
                          {healthCheck.errors.map((error, index) => (
                            <div key={index}>
                              <strong>{error.userFriendlyMessage}</strong>
                              {error.suggestion && (
                                <div className="text-sm opacity-90">建议：{error.suggestion}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {healthCheck.warnings.length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-1">
                          {healthCheck.warnings.map((warning, index) => (
                            <div key={index} className="text-sm">{warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {healthCheck.isHealthy && healthCheck.warnings.length === 0 && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✓ 存储状态正常
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                选择文件夹后，数据将保存到该位置，方便多设备同步
              </p>
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>当前存储位置:</strong> {storagePath ? `文件系统：${storagePath}` : "浏览器本地存储 (localStorage)"}
                </div>
                
                {!storagePath && (
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                    <strong>提示:</strong> 选择文件夹可启用跨设备数据同步
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="storageKey">本地存储标识（LocalStorage Key）</Label>
            <Input id="storageKey" value={storageKey} onChange={(e) => onStorageKeyChange(e.target.value)} placeholder="例如：pmapp:data" />
            <p className="text-xs text-muted-foreground">修改后将以新路径保存数据；原路径数据仍保留。</p>
          </div>

          <div className="space-y-2">
            <Label>数据导入/导出</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => download(`projects-export-${Date.now()}.json`, onExport())}
              >导出JSON</Button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const res = await onImport(text);
                  if (!res.ok) alert("导入失败，请检查JSON格式");
                  if (fileRef.current) {
                    fileRef.current.value = ""; // reset
                  }
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>导入JSON</Button>
              <Button variant="destructive" onClick={onClear}>清空数据</Button>
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground">项目总数 {stats.total}，进行中 {stats.active}，已结束 {stats.completed}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              数据备份
            </Label>
            <div className="space-y-3">
              {/* 自动备份设置 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">自动备份</Label>
                  <p className="text-xs text-muted-foreground">应用启动时自动创建数据备份</p>
                </div>
                <Switch
                  checked={settings.autoBackup || false}
                  onCheckedChange={(checked) => 
                    onSettingsUpdate({ ...settings, autoBackup: checked })
                  }
                />
              </div>

              {/* 备份间隔设置 */}
              {settings.autoBackup && (
                <div className="space-y-1">
                  <Label htmlFor="backupInterval" className="text-sm">备份间隔（小时）</Label>
                  <Input
                    id="backupInterval"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.backupInterval || 24}
                    onChange={(e) => 
                      onSettingsUpdate({ 
                        ...settings, 
                        backupInterval: parseInt(e.target.value) || 24 
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    推荐：24小时（每天备份一次）
                  </p>
                </div>
              )}

              {/* 上次备份时间 */}
              {settings.lastBackupTime && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>上次备份：</strong> {new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(new Date(settings.lastBackupTime))}
                </div>
              )}

              {/* 备份管理按钮 */}
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowBackupManager(true)}
                  className="flex items-center gap-2"
                >
                  <HardDrive className="w-4 h-4" />
                  备份管理
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                备份文件将保存到选定的存储目录中的 backups 文件夹内
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI报告生成
            </Label>
            <div className="space-y-3">
              {/* Ollama URL 配置 */}
              <div className="space-y-1">
                <Label htmlFor="ollamaUrl" className="text-sm">Ollama服务器URL</Label>
                <Input
                  id="ollamaUrl"
                  type="url"
                  value={settings.aiReport?.ollamaUrl || "http://localhost:11434"}
                  onChange={(e) => handleAiConfigChange('ollamaUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  className={`w-full ${aiConfigErrors.ollamaUrl ? 'border-red-500' : ''}`}
                />
                {aiConfigErrors.ollamaUrl && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {aiConfigErrors.ollamaUrl}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                  <div className="font-semibold mb-1">端口配置:</div>
                  <div>• Ollama 默认端口: http://localhost:11434</div>
                  <div>• OpenAI 兼容服务: 通常使用其他端口 (如 11345 等)</div>
                  <div>• 测试连接将自动检测 API 格式</div>
                  <div>• 确保服务已启动: <code className="bg-blue-100 px-1 rounded">ollama serve</code></div>
                  {import.meta.env.DEV && (
                    <div className="mt-1 pt-1 border-t border-blue-200">
                      <div className="text-blue-600">
                        🔧 开发环境代理: {import.meta.env.VITE_OLLAMA_PROXY_TARGET || 'http://localhost:11434'}
                      </div>
                      <div className="text-xs">
                        如需修改，设置环境变量 OLLAMA_URL 并重启开发服务器
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 模型名称配置 */}
              <div className="space-y-1">
                <Label htmlFor="modelName" className="text-sm">AI模型名称</Label>
                <Input
                  id="modelName"
                  type="text"
                  value={settings.aiReport?.modelName || "gpt-oss"}
                  onChange={(e) => handleAiConfigChange('modelName', e.target.value)}
                  placeholder="gpt-oss"
                  className={`w-full ${aiConfigErrors.modelName ? 'border-red-500' : ''}`}
                />
                {aiConfigErrors.modelName && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {aiConfigErrors.modelName}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border-l-2 border-green-200">
                  <div className="font-semibold mb-1">根据您的服务，推荐使用:</div>
                  <div>• gpt-oss (您服务中可用)</div>
                  <div>• qwen3:32b (中文优化)</div>
                  <div>• qwq:latest (推理模型)</div>
                  <div>• deepseek-r1:32b (数学推理)</div>
                  <div className="mt-1 text-blue-600">
                    💡 您的服务支持 OpenAI 兼容 API 格式
                  </div>
                </div>
              </div>

              {/* 温度参数配置 */}
              <div className="space-y-1">
                <Label htmlFor="temperature" className="text-sm">温度参数</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.aiReport?.temperature || 0.7}
                  onChange={(e) => handleAiConfigChange('temperature', parseFloat(e.target.value) || 0.7)}
                  className={`w-full ${aiConfigErrors.temperature ? 'border-red-500' : ''}`}
                />
                {aiConfigErrors.temperature && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {aiConfigErrors.temperature}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  控制AI生成的随机性（0-2，推荐0.7）
                </p>
              </div>

              {/* 连接测试 */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={testOllamaConnection}
                  disabled={isTestingConnection || !!aiConfigErrors.ollamaUrl || !!aiConfigErrors.modelName}
                  className="w-full"
                >
                  {isTestingConnection ? "测试中..." : "测试连接"}
                </Button>
                
                {connectionTestResult && (
                  <Alert variant={connectionTestResult.success ? "default" : "destructive"}>
                    <AlertDescription className="text-sm whitespace-pre-line">
                      {connectionTestResult.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded border-l-2 border-yellow-200">
                  <div className="font-semibold mb-1">故障排除:</div>
                  <div>1. 确认Ollama服务已启动</div>
                  <div>2. 检查端口是否正确(默认11434)</div>
                  <div>3. 确认模型已安装并可用</div>
                  <div>4. 检查防火墙设置</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
      
      {/* 备份管理Modal */}
      <BackupManagerModal
        isOpen={showBackupManager}
        onClose={() => setShowBackupManager(false)}
        currentData={currentData}
        settings={settings}
        onSettingsUpdate={onSettingsUpdate}
        onDataRestore={onDataRestore}
      />
    </Dialog>
  );
}
