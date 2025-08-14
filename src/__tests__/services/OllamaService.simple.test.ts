import { describe, it, expect } from 'vitest';
import { OllamaService } from '@/services/OllamaService';
import { AIReportConfig } from '@/types';

describe('OllamaService - 基础功能验证', () => {
  const validConfig: AIReportConfig = {
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3.2',
    temperature: 0.7
  };

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

    it('处理undefined配置', () => {
      expect(OllamaService.isConfigComplete(undefined)).toBe(false);
    });

    it('处理空配置对象', () => {
      expect(OllamaService.isConfigComplete({})).toBe(false);
    });

    it('检测部分配置', () => {
      const partialConfig = {
        ollamaUrl: 'http://localhost:11434',
        modelName: 'llama3.2'
        // 缺失 temperature
      };
      expect(OllamaService.isConfigComplete(partialConfig)).toBe(false);
    });
  });

  describe('generateReport - 参数验证', () => {
    it('配置验证优先于其他验证', async () => {
      const invalidConfig = {
        ollamaUrl: '',
        modelName: 'llama3.2',
        temperature: 0.7
      };

      const result = await OllamaService.generateReport(invalidConfig, '测试提示词');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('处理网络相关错误情况', async () => {
      const invalidUrlConfig = {
        ollamaUrl: 'invalid-url',
        modelName: 'llama3.2',
        temperature: 0.7
      };

      const result = await OllamaService.generateReport(invalidUrlConfig, '测试提示词');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('testConnection - 参数验证', () => {
    it('无效配置时返回错误', async () => {
      const invalidConfig = { ollamaUrl: '', modelName: '', temperature: 0 };
      
      const result = await OllamaService.testConnection(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});