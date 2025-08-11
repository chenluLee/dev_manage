import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Download, RefreshCw, Calendar, HardDrive, Check, X } from 'lucide-react';
import { StorageManager } from '@/managers/StorageManager';
import { BackupMetadata, AppData, AppSettings } from '@/types';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: AppData;
  settings: AppSettings;
  onSettingsUpdate: (settings: AppSettings) => void;
  onDataRestore?: (data: AppData) => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  currentData,
  settings,
  onSettingsUpdate,
  onDataRestore
}) => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await StorageManager.getBackupList();
      if (result.success) {
        setBackups(result.backups || []);
      } else {
        setError(result.error?.userFriendlyMessage || '获取备份列表失败');
      }
    } catch (err) {
      setError('获取备份列表时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await StorageManager.createBackup(currentData);
      if (result.success) {
        setSuccess(`备份创建成功：${result.filename}`);
        
        // 更新最后备份时间
        const updatedSettings: AppSettings = {
          ...settings,
          lastBackupTime: new Date().toISOString()
        };
        onSettingsUpdate(updatedSettings);
        
        // 重新加载备份列表
        await loadBackups();
      } else {
        setError(result.error?.userFriendlyMessage || '创建备份失败');
      }
    } catch (err) {
      setError('创建备份时发生错误');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`确定要删除备份文件"${filename}"吗？此操作无法撤销。`)) {
      return;
    }

    try {
      const result = await StorageManager.deleteBackup(filename);
      if (result.success) {
        setSuccess(`备份文件"${filename}"删除成功`);
        await loadBackups();
      } else {
        setError(result.error?.userFriendlyMessage || '删除备份失败');
      }
    } catch (err) {
      setError('删除备份时发生错误');
    }
  };

  const handleRestoreFromBackup = async (filename: string) => {
    if (!confirm(`确定要从备份"${filename}"恢复数据吗？当前数据将被覆盖。`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await StorageManager.restoreFromBackup(filename);
      if (result.success && result.data) {
        setSuccess(`从备份"${filename}"恢复数据成功`);
        if (onDataRestore) {
          onDataRestore(result.data);
        }
        onClose();
      } else {
        setError(result.error?.userFriendlyMessage || '恢复数据失败');
      }
    } catch (err) {
      setError('恢复数据时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            备份管理
          </DialogTitle>
          <DialogDescription>
            管理您的数据备份，包括创建、删除和恢复备份
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 操作按钮 */}
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={handleCreateBackup} 
              disabled={creatingBackup || loading}
              className="flex items-center gap-2"
            >
              {creatingBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {creatingBackup ? '创建中...' : '创建备份'}
            </Button>
            <Button 
              variant="outline" 
              onClick={loadBackups} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {/* 状态消息 */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* 备份列表 */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                暂无备份文件
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {backups.map((backup) => (
                  <div 
                    key={backup.filename} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{backup.filename}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(backup.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(backup.size)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreFromBackup(backup.filename)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        恢复
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.filename)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 备份信息 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="flex items-center gap-2 mb-1">
              <span className="font-medium">自动备份：</span>
              {settings.autoBackup ? (
                <span className="text-green-600">已启用 (每 {settings.backupInterval} 小时)</span>
              ) : (
                <span className="text-red-600">已禁用</span>
              )}
            </p>
            {settings.lastBackupTime && (
              <p className="flex items-center gap-2">
                <span className="font-medium">上次备份：</span>
                {formatDate(new Date(settings.lastBackupTime))}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};