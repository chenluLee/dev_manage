import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock File System Access API
Object.defineProperty(window, 'showDirectoryPicker', {
  writable: true,
  value: vi.fn(),
});

// Mock IndexedDB with more complete implementation
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  readyState: 'pending',
  transaction: null,
  source: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBDatabase = {
  name: 'test-db',
  version: 1,
  objectStoreNames: [],
  close: vi.fn(),
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn(),
  transaction: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onabort: null,
  onclose: null,
  onerror: null,
  onversionchange: null,
};

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: vi.fn(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.result = mockIDBDatabase;
        request.readyState = 'done';
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      }, 0);
      return request;
    }),
    deleteDatabase: vi.fn(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.readyState = 'done';
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      }, 0);
      return request;
    }),
  },
});

// Mock Storage API
Object.defineProperty(navigator, 'storage', {
  writable: true,
  value: {
    estimate: vi.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.URL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});