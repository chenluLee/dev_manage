import { describe, it, expect } from 'vitest';
import { 
  validateOllamaUrl, 
  validateModelName, 
  validateTemperature, 
  validateAiConfig 
} from '../../utils/aiConfigValidation';

describe('aiConfigValidation', () => {
  describe('validateOllamaUrl', () => {
    it('应该接受有效的HTTP URL', () => {
      const result = validateOllamaUrl('http://localhost:11434');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的HTTPS URL', () => {
      const result = validateOllamaUrl('https://api.ollama.com:8080');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝空字符串', () => {
      const result = validateOllamaUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL不能为空');
    });

    it('应该拒绝空白字符串', () => {
      const result = validateOllamaUrl('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL不能为空');
    });

    it('应该拒绝无效的协议', () => {
      const result = validateOllamaUrl('ftp://localhost:11434');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL必须以http://或https://开头');
    });

    it('应该拒绝无效的URL格式', () => {
      const result = validateOllamaUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('无效的URL格式');
    });

    it('应该拒绝没有主机名的URL', () => {
      const result = validateOllamaUrl('http://');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL必须包含有效的主机名');
    });
  });

  describe('validateModelName', () => {
    it('应该接受有效的模型名称', () => {
      const result = validateModelName('llama3.2');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受包含下划线和连字符的模型名称', () => {
      const result = validateModelName('llama_3.2-chat');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝空字符串', () => {
      const result = validateModelName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模型名称不能为空');
    });

    it('应该拒绝空白字符串', () => {
      const result = validateModelName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模型名称不能为空');
    });

    it('应该拒绝包含特殊字符的模型名称', () => {
      const result = validateModelName('llama@3.2');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模型名称只能包含字母、数字、点号、下划线和连字符');
    });

    it('应该拒绝过长的模型名称', () => {
      const longName = 'a'.repeat(101);
      const result = validateModelName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模型名称不能超过100个字符');
    });
  });

  describe('validateTemperature', () => {
    it('应该接受有效的温度值', () => {
      const result = validateTemperature(0.7);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受边界值0', () => {
      const result = validateTemperature(0);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受边界值2', () => {
      const result = validateTemperature(2);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝NaN', () => {
      const result = validateTemperature(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('温度参数必须是数字');
    });

    it('应该拒绝负数', () => {
      const result = validateTemperature(-0.1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('温度参数不能小于0');
    });

    it('应该拒绝大于2的值', () => {
      const result = validateTemperature(2.1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('温度参数不能大于2');
    });
  });

  describe('validateAiConfig', () => {
    const validConfig = {
      ollamaUrl: 'http://localhost:11434',
      modelName: 'llama3.2',
      temperature: 0.7
    };

    it('应该接受有效的配置', () => {
      const result = validateAiConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝无效的URL', () => {
      const config = { ...validConfig, ollamaUrl: 'invalid-url' };
      const result = validateAiConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('无效的URL格式');
    });

    it('应该拒绝无效的模型名称', () => {
      const config = { ...validConfig, modelName: '' };
      const result = validateAiConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模型名称不能为空');
    });

    it('应该拒绝无效的温度值', () => {
      const config = { ...validConfig, temperature: -1 };
      const result = validateAiConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('温度参数不能小于0');
    });
  });
});