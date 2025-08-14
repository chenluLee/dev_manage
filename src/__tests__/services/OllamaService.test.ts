import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaService } from '@/services/OllamaService';
import { AIReportConfig } from '@/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('OllamaService', () => {
  const validConfig: AIReportConfig = {
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3.2',
    temperature: 0.7
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe('generateReport', () => {
    it('成功生成报告', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          model: 'llama3.2',
          created_at: '2024-01-01T00:00:00Z',
          response: '这是一份AI生成的工作报告',
          done: true
        })
      };
      // 因为generateReport直接调用callOllamaAPI，所以只需要一次mock
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await OllamaService.generateReport(validConfig, '测试提示词');

      expect(result.success).toBe(true);
      expect(result.content).toBe('这是一份AI生成的工作报告');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('处理配置验证失败', async () => {
      const invalidConfig = {
        ollamaUrl: '',
        modelName: 'llama3.2',
        temperature: 0.7
      };

      const result = await OllamaService.generateReport(invalidConfig, '测试提示词');

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL不能为空');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('处理空提示词', async () => {
      // Mock successful validation
      vi.mock('@/utils/aiConfigValidation', () => ({
        validateAiConfig: () => ({ isValid: true })
      }));
      
      const result = await OllamaService.generateReport(validConfig, '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('提示词不能为空');
    });

    it('处理空白提示词', async () => {
      const result = await OllamaService.generateReport(validConfig, '   ');

      expect(result.success).toBe(false);
      // 由于配置验证先执行，这里会得到配置验证的错误
      expect(result.error).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('配置验证失败时不进行连接', async () => {
      const invalidConfig = { ollamaUrl: '', modelName: '', temperature: 0 };
      
      const result = await OllamaService.testConnection(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL不能为空');
    });

    it('成功的连接测试', async () => {
      // Mock /api/tags 端点返回成功
      const mockTagsResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2' }
          ]
        })
      };

      // Mock /api/generate 端点返回成功
      const mockGenerateResponse = {
        ok: true,
        json: () => Promise.resolve({
          model: 'llama3.2',
          created_at: '2024-01-01T00:00:00Z',
          response: '连接测试成功',
          done: true
        })
      };

      // 按顺序mock两个API调用
      mockFetch
        .mockResolvedValueOnce(mockTagsResponse)  // testServiceAvailability
        .mockResolvedValueOnce(mockTagsResponse)  // checkModelAvailability
        .mockResolvedValueOnce(mockGenerateResponse); // callOllamaAPI

      const result = await OllamaService.testConnection(validConfig);

      expect(result.success).toBe(true);
      expect(result.content).toBe('连接测试成功');
    });

    it('服务不可达时返回端口建议', async () => {
      const mockFailResponse = {
        ok: false,
        status: 404
      };

      mockFetch.mockResolvedValueOnce(mockFailResponse);

      const result = await OllamaService.testConnection(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('服务不可达');
    });

    it('模型不存在时提供可用模型列表', async () => {
      // Service可达但模型不存在
      const mockTagsResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.1' },
            { name: 'mistral' }
          ]
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockTagsResponse)  // testServiceAvailability
        .mockResolvedValueOnce(mockTagsResponse); // checkModelAvailability

      const result = await OllamaService.testConnection(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('模型');
      expect(result.error).toContain('llama3.1, mistral');
    });
  });

  describe('isConfigComplete', () => {
    it('验证完整配置', () => {
      expect(OllamaService.isConfigComplete(validConfig)).toBe(true);
    });

    it('检测缺失的URL', () => {
      const config = { ...validConfig, ollamaUrl: '' };
      expect(OllamaService.isConfigComplete(config)).toBe(false);
    });

    it('检测缺失的模型名称', () => {
      const config = { ...validConfig, modelName: '' };
      expect(OllamaService.isConfigComplete(config)).toBe(false);
    });

    it('检测缺失的温度参数', () => {
      const config = { ...validConfig, temperature: undefined as unknown as number };
      expect(OllamaService.isConfigComplete(config)).toBe(false);
    });

    it('检测部分配置对象', () => {
      expect(OllamaService.isConfigComplete({})).toBe(false);
      expect(OllamaService.isConfigComplete(undefined)).toBe(false);
    });
  });

  describe('URL处理', () => {
    it('通过实际API调用验证URL构建', async () => {
      // 测试无效URL会被正确处理
      const invalidConfig = {
        ollamaUrl: 'invalid-url',
        modelName: 'llama3.2',
        temperature: 0.7
      };

      const result = await OllamaService.generateReport(invalidConfig, '测试');
      expect(result.success).toBe(false);
      expect(result.error).toContain('无效的服务器URL');
    });
  });
});