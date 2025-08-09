import { useCallback, useEffect, useRef, useState } from "react";

// Generic localStorage hook with JSON serialization and namespacing
export function useLocalStorage<T>(key: string, initialValue: T) {
  const keyRef = useRef(key);
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(keyRef.current);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [value]);

  const importFromJSON = useCallback((json: string) => {
    try {
      const data = JSON.parse(json) as T;
      setValue(data);
      return { ok: true } as const;
    } catch (e) {
      return { ok: false, error: e } as const;
    }
  }, []);

  const exportToJSON = useCallback(() => JSON.stringify(value, null, 2), [value]);

  return { value, setValue, importFromJSON, exportToJSON } as const;
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
