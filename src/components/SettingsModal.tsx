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
import { HardDrive } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storageKey: string;
  onStorageKeyChange: (v: string) => void;
  storagePath?: string;
  onStoragePathChange: (path: string) => void;
  onExport: () => string;
  onImport: (json: string) => { ok: boolean; error?: unknown };
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

  useEffect(() => {
    if (open && storagePath) {
      performHealthCheck();
    }
  }, [open, storagePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="settings-desc" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>系统设置</DialogTitle>
          <DialogDescription id="settings-desc">管理数据存储路径、导入导出与其他选项。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
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
                  {storagePath || "未选择（使用浏览器本地存储）"}
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
              
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>默认路径:</strong> {StorageManager.getDefaultStoragePath()}
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
                  const res = onImport(text);
                  if (!res.ok) alert("导入失败，请检查JSON格式");
                  e.currentTarget.value = ""; // reset
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
        </div>

        <DialogFooter>
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
