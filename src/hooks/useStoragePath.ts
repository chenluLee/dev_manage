import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { StorageManager, StorageError } from '@/managers/StorageManager';

export function useStoragePath(settings: AppSettings, updateSettings: (settings: AppSettings) => void) {
  const [storageError, setStorageError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const storagePath = settings.storagePath || '';

  const updateStoragePath = useCallback(async (path: string) => {
    updateSettings({
      ...settings,
      storagePath: path
    });
    setStorageError('');
    
  }, [settings, updateSettings]);

  const clearStoragePath = useCallback(async () => {
    try {
      await StorageManager.clearStoragePath();
      updateSettings({
        ...settings,
        storagePath: ''
      });
      setStorageError('');
    } catch (error) {
      setStorageError('清除存储路径失败');
    }
  }, [settings, updateSettings]);

  const validateCurrentPath = useCallback(async () => {
    if (!storagePath || !StorageManager.isFileSystemAccessSupported()) {
      return;
    }

    setIsValidating(true);
    try {
      const result = await StorageManager.validateDirectoryAccess();
      if (!result.valid && result.error) {
        setStorageError(result.error.message);
      } else {
        setStorageError('');
      }
    } catch (error) {
      setStorageError('验证存储路径时发生错误');
    } finally {
      setIsValidating(false);
    }
  }, [storagePath]);

  const getDefaultStoragePath = useCallback(() => {
    return window.localStorage.getItem('pmapp:defaultStoragePath') || '';
  }, []);

  const setDefaultStoragePath = useCallback((path: string) => {
    if (path) {
      window.localStorage.setItem('pmapp:defaultStoragePath', path);
    } else {
      window.localStorage.removeItem('pmapp:defaultStoragePath');
    }
  }, []);

  useEffect(() => {
    validateCurrentPath();
  }, [validateCurrentPath]);

  return {
    storagePath,
    updateStoragePath,
    clearStoragePath,
    storageError,
    setStorageError,
    isValidating,
    validateCurrentPath,
    getDefaultStoragePath,
    setDefaultStoragePath,
    isFileSystemSupported: StorageManager.isFileSystemAccessSupported()
  };
}