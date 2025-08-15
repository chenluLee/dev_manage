import { AIReportRequest, AIReportResponse, AIReportConfig, GenerateReportResult } from '@/types';
import { validateAiConfig } from '@/utils/aiConfigValidation';

/**
 * Ollama API服务类
 * 提供与Ollama服务器的集成功能，支持AI报告生成
 * 更新时间: 2025-08-14 调试版本
 */
export class OllamaService {
  private static readonly DEFAULT_TIMEOUT = 300000; // 300秒超时
  private static readonly DEFAULT_STREAM = false;

  /**
   * 生成AI报告
   * @param config AI配置（URL、模型、温度）
   * @param prompt 提示词
   * @returns 生成结果
   */
  static async generateReport(
    config: AIReportConfig,
    prompt: string
  ): Promise<GenerateReportResult> {
    try {
      // 验证配置
      const configValidation = validateAiConfig(config);
      if (!configValidation.isValid) {
        return {
          success: false,
          error: configValidation.error || '配置验证失败'
        };
      }

      // 验证提示词
      if (!prompt?.trim()) {
        return {
          success: false,
          error: '提示词不能为空'
        };
      }

      // 构造请求
      const requestData: AIReportRequest = {
        model: config.modelName,
        prompt: prompt.trim(),
        temperature: config.temperature,
        stream: OllamaService.DEFAULT_STREAM
      };

      // 发送API请求
      const response = await OllamaService.callOllamaAPI(config.ollamaUrl, requestData);
      
      if (!response.success) {
        return response;
      }

      return {
        success: true,
        content: response.content
      };

    } catch (error) {
      console.error('生成AI报告失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 测试Ollama服务连接
   * @param config AI配置
   * @returns 连接测试结果
   */
  static async testConnection(config: AIReportConfig): Promise<GenerateReportResult> {
    try {
      // 验证配置
      const configValidation = validateAiConfig(config);
      if (!configValidation.isValid) {
        return {
          success: false,
          error: configValidation.error || '配置验证失败'
        };
      }

      // 首先测试服务是否可达 - 使用 /api/tags 端点
      const tagsTestResult = await OllamaService.testServiceAvailability(config.ollamaUrl);
      if (!tagsTestResult.success) {
        return tagsTestResult;
      }

      // 检查模型是否可用
      const modelCheckResult = await OllamaService.checkModelAvailability(config.ollamaUrl, config.modelName);
      if (!modelCheckResult.success) {
        return modelCheckResult;
      }

      // 最后测试实际生成功能
      const testPrompt = '请回复"连接测试成功"';
      
      const requestData: AIReportRequest = {
        model: config.modelName,
        prompt: testPrompt,
        temperature: 0.1,
        stream: false
      };

      const response = await OllamaService.callOllamaAPI(config.ollamaUrl, requestData);
      
      if (response.success) {
        return {
          success: true,
          content: '连接测试成功'
        };
      }

      return response;

    } catch (error) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  }

  /**
   * 测试服务是否可达 - 支持多种API格式
   * @param baseUrl 服务器URL
   * @returns 服务可用性测试结果
   */
  private static async testServiceAvailability(baseUrl: string): Promise<GenerateReportResult> {
    try {
      // 先尝试 OpenAI 兼容的 /v1/models 端点
      const openaiUrl = OllamaService.buildOpenAIModelsUrl(baseUrl);
      const openaiResult = await OllamaService.tryFetchWithTimeout(openaiUrl);
      
      if (openaiResult.success) {
        return { success: true, content: '服务可达 (OpenAI API 兼容)' };
      }

      // 如果失败，尝试标准的 Ollama /api/tags 端点
      const ollamaUrl = OllamaService.buildTagsUrl(baseUrl);
      const ollamaResult = await OllamaService.tryFetchWithTimeout(ollamaUrl);
      
      if (ollamaResult.success) {
        return { success: true, content: '服务可达 (Ollama API)' };
      }

      // 两个端点都失败
      const suggestions = OllamaService.getConnectionSuggestion(baseUrl);
      return {
        success: false,
        error: `服务不可达 - 已尝试 OpenAI 和 Ollama API 格式${suggestions}`
      };

    } catch (error) {
      if (error instanceof Error) {
        // 处理URL构建错误
        if (error.message.includes('无效的服务器URL')) {
          return {
            success: false,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: `服务连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 尝试获取URL并处理超时
   * @param url 要尝试的URL
   * @returns 请求结果
   */
  private static async tryFetchWithTimeout(url: string): Promise<{ success: boolean; response?: Response; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      return { success: response.ok, response };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '连接超时' };
        }
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          return { success: false, error: '连接失败' };
        }
      }
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  }

  /**
   * 检查模型是否可用 - 支持多种API格式
   * @param baseUrl 服务器URL
   * @param modelName 模型名称
   * @returns 模型可用性检查结果
   */
  private static async checkModelAvailability(baseUrl: string, modelName: string): Promise<GenerateReportResult> {
    try {
      // 先尝试 OpenAI 兼容的 /v1/models 端点
      const openaiUrl = OllamaService.buildOpenAIModelsUrl(baseUrl);
      const openaiResult = await OllamaService.tryFetchWithTimeout(openaiUrl);
      
      if (openaiResult.success && openaiResult.response) {
        const data = await openaiResult.response.json();
        const models = data.data || [];
        
        // OpenAI API 格式：查找模型 ID，支持精确匹配和部分匹配
        const modelExists = models.some((model: { id: string }) => {
          return model.id === modelName || 
                 model.id === `${modelName}:latest` ||
                 model.id.startsWith(`${modelName}:`);
        });
        
        if (modelExists) {
          return { success: true, content: '模型可用 (OpenAI API)' };
        } else {
          const availableModels = models.map((model: { id: string }) => model.id).join(', ');
          return {
            success: false,
            error: `模型 '${modelName}' 不存在。可用模型: ${availableModels || '无'}`
          };
        }
      }

      // 如果 OpenAI API 失败，尝试标准的 Ollama API
      const ollamaUrl = OllamaService.buildTagsUrl(baseUrl);
      const ollamaResult = await OllamaService.tryFetchWithTimeout(ollamaUrl);
      
      if (ollamaResult.success && ollamaResult.response) {
        const data = await ollamaResult.response.json();
        const models = data.models || [];
        
        const modelExists = models.some((model: { name: string }) => model.name === modelName);
        
        if (modelExists) {
          return { success: true, content: '模型可用 (Ollama API)' };
        } else {
          const availableModels = models.map((model: { name: string }) => model.name).join(', ');
          return {
            success: false,
            error: `模型 '${modelName}' 不存在。可用模型: ${availableModels || '无'}`
          };
        }
      }

      return {
        success: false,
        error: '无法获取模型列表 - API 格式不支持'
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('无效的服务器URL')) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: `检查模型可用性失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取详细的连接建议信息
   * @param baseUrl 当前URL
   * @returns 详细的建议字符串
   */
  private static getConnectionSuggestion(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      const currentPort = url.port || (url.protocol === 'https:' ? '443' : '80');
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      
      const suggestions = [];
      
      if (!isLocalhost) {
        suggestions.push(`设置环境变量: export OLLAMA_URL=${baseUrl}`);
        suggestions.push('重启开发服务器: npm run dev');
      }
      
      if (currentPort !== '11434') {
        suggestions.push(`尝试默认端口: ${url.protocol}//${url.hostname}:11434`);
      }
      
      suggestions.push('确认 Ollama 服务已启动: ollama serve');
      suggestions.push('检查 Ollama 服务状态: ollama list');
      
      return `\n建议解决方案:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    } catch {
      return '\n建议: 请检查 URL 格式是否正确';
    }
  }

  /**
   * 构造 OpenAI 兼容的 Models API URL
   * @param baseUrl 基础URL
   * @returns 完整的 OpenAI Models API URL
   */
  private static buildOpenAIModelsUrl(baseUrl: string): string {
    try {
      // 在开发环境中，优先使用代理以避免 CORS 问题
      if (import.meta.env.DEV) {
        return '/api/ollama/v1/models';
      }
      
      const url = new URL(baseUrl);
      const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      url.pathname = pathname + 'v1/models';
      return url.toString();
    } catch (error) {
      throw new Error(`无效的服务器URL: ${baseUrl}`);
    }
  }

  /**
   * 构造 Tags API URL (标准 Ollama API)
   * @param baseUrl 基础URL
   * @returns 完整的 Tags API URL
   */
  private static buildTagsUrl(baseUrl: string): string {
    try {
      // 在开发环境中，优先使用代理以避免 CORS 问题
      if (import.meta.env.DEV) {
        return '/api/ollama/api/tags';
      }
      
      const url = new URL(baseUrl);
      const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      url.pathname = pathname + 'api/tags';
      return url.toString();
    } catch (error) {
      throw new Error(`无效的服务器URL: ${baseUrl}`);
    }
  }

  /**
   * 调用AI API - 支持多种API格式，带智能连接策略
   * @param baseUrl 服务器URL
   * @param requestData 请求数据
   * @returns API响应结果
   */
  private static async callOllamaAPI(
    baseUrl: string,
    requestData: AIReportRequest
  ): Promise<GenerateReportResult> {
    try {
      // 在开发环境中，优先尝试代理连接
      if (import.meta.env.DEV) {
        console.log('🎯 智能连接策略: 优先尝试代理连接');
        
        // 先尝试 OpenAI 兼容的 chat/completions 端点 (通过代理)
        const openaiResult = await OllamaService.tryOpenAIAPI(baseUrl, requestData);
        if (openaiResult.success) {
          console.log('✅ 代理连接成功 (OpenAI API)');
          return openaiResult;
        }

        // 如果失败，尝试标准的 Ollama generate 端点 (通过代理)
        const ollamaResult = await OllamaService.tryOllamaAPI(baseUrl, requestData);
        if (ollamaResult.success) {
          console.log('✅ 代理连接成功 (Ollama API)');
          return ollamaResult;
        }

        console.log('⚠️ 代理连接失败，尝试直接连接...');
        return OllamaService.tryDirectConnection(baseUrl, requestData);
      }

      // 生产环境或非开发环境：直接连接
      const openaiResult = await OllamaService.tryOpenAIAPI(baseUrl, requestData);
      if (openaiResult.success) {
        return openaiResult;
      }

      const ollamaResult = await OllamaService.tryOllamaAPI(baseUrl, requestData);
      if (ollamaResult.success) {
        return ollamaResult;
      }

      return {
        success: false,
        error: `API调用失败 - OpenAI错误: ${openaiResult.error}, Ollama错误: ${ollamaResult.error}`
      };

    } catch (error) {
      return {
        success: false,
        error: `API调用异常: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 尝试直接连接（降级策略）
   * @param baseUrl 服务器URL
   * @param requestData 请求数据
   * @returns API响应结果
   */
  private static async tryDirectConnection(
    baseUrl: string,
    requestData: AIReportRequest
  ): Promise<GenerateReportResult> {
    console.log('🔄 尝试直接连接到:', baseUrl);
    
    // 使用直接连接方式（绕过环境检测）
    try {
      // 先尝试 OpenAI 兼容的 API (构造直接URL)
      const openaiUrl = OllamaService.buildDirectOpenAIChatUrl(baseUrl);
      const openaiResult = await OllamaService.tryDirectAPICall(openaiUrl, {
        model: requestData.model,
        messages: [{ role: "user", content: requestData.prompt }],
        temperature: requestData.temperature,
        stream: false
      }, 'openai');
      
      if (openaiResult.success) {
        console.log('✅ 直接连接成功 (OpenAI API)');
        return openaiResult;
      }

      // 尝试标准 Ollama API (构造直接URL)
      const ollamaUrl = OllamaService.buildDirectApiUrl(baseUrl);
      const ollamaResult = await OllamaService.tryDirectAPICall(ollamaUrl, requestData, 'ollama');
      
      if (ollamaResult.success) {
        console.log('✅ 直接连接成功 (Ollama API)');
        return ollamaResult;
      }

      return {
        success: false,
        error: `直接连接失败 - 可能是 CORS 限制或服务不可达。建议设置环境变量 OLLAMA_URL=${baseUrl} 并重启开发服务器`
      };
    } catch (error) {
      return {
        success: false,
        error: `直接连接异常: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 尝试 OpenAI 兼容的 API 调用
   */
  private static async tryOpenAIAPI(baseUrl: string, requestData: AIReportRequest): Promise<GenerateReportResult> {
    try {
      const url = OllamaService.buildOpenAIChatUrl(baseUrl);
      
      // 转换为 OpenAI 格式的请求体
      const openaiRequestData = {
        model: requestData.model,
        messages: [
          {
            role: "user",
            content: requestData.prompt
          }
        ],
        temperature: requestData.temperature,
        stream: false
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, OllamaService.DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiRequestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const responseData = await response.json();
      
      // OpenAI 格式的响应解析
      if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
        return {
          success: true,
          content: responseData.choices[0].message.content
        };
      }

      return {
        success: false,
        error: 'OpenAI API 响应格式无效'
      };

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '请求超时' };
        }
        if (error.message.includes('fetch')) {
          return { success: false, error: '网络连接失败' };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 尝试标准的 Ollama API 调用
   */
  private static async tryOllamaAPI(baseUrl: string, requestData: AIReportRequest): Promise<GenerateReportResult> {
    try {
      const url = OllamaService.buildApiUrl(baseUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, OllamaService.DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const responseData: AIReportResponse = await response.json();
      
      if (!responseData.response) {
        return {
          success: false,
          error: 'Ollama API 响应格式无效'
        };
      }

      return {
        success: true,
        content: responseData.response
      };

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '请求超时' };
        }
        if (error.message.includes('fetch')) {
          return { success: false, error: '网络连接失败' };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 构造 OpenAI 兼容的 Chat Completions API URL
   * @param baseUrl 基础URL
   * @returns 完整的 OpenAI Chat API URL
   */
  private static buildOpenAIChatUrl(baseUrl: string): string {
    try {
      console.log('🔧 buildOpenAIChatUrl 调试信息:', {
        baseUrl,
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE
      });
      
      // 在开发环境中，优先使用代理以避免 CORS 问题
      if (import.meta.env.DEV) {
        const apiPath = '/api/ollama/v1/chat/completions';
        console.log(`✅ 使用代理路径: ${apiPath} (基于用户配置: ${baseUrl})`);
        return apiPath;
      }
      
      const url = new URL(baseUrl);
      const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      url.pathname = pathname + 'v1/chat/completions';
      const directUrl = url.toString();
      console.log('🌐 使用直接URL:', directUrl);
      return directUrl;
    } catch (error) {
      console.error('❌ buildOpenAIChatUrl 错误:', error);
      throw new Error(`无效的服务器URL: ${baseUrl}`);
    }
  }

  /**
   * 构造API URL (标准 Ollama API)
   * @param baseUrl 基础URL
   * @returns 完整的API URL
   */
  private static buildApiUrl(baseUrl: string): string {
    try {
      console.log('🔧 buildApiUrl 调试信息:', {
        baseUrl,
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE
      });
      
      // 在开发环境中，优先使用代理以避免 CORS 问题
      if (import.meta.env.DEV) {
        const apiPath = '/api/ollama/api/generate';
        console.log(`✅ 使用代理路径: ${apiPath} (基于用户配置: ${baseUrl})`);
        return apiPath;
      }
      
      const url = new URL(baseUrl);
      // 确保路径以/结尾，然后添加api/generate
      const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      url.pathname = pathname + 'api/generate';
      const directUrl = url.toString();
      console.log('🌐 使用直接URL:', directUrl);
      return directUrl;
    } catch (error) {
      console.error('❌ buildApiUrl 错误:', error);
      throw new Error(`无效的服务器URL: ${baseUrl}`);
    }
  }

  /**
   * 构造直接连接的 OpenAI Chat URL
   */
  private static buildDirectOpenAIChatUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    url.pathname = pathname + 'v1/chat/completions';
    return url.toString();
  }

  /**
   * 构造直接连接的 Ollama API URL
   */
  private static buildDirectApiUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    url.pathname = pathname + 'api/generate';
    return url.toString();
  }

  /**
   * 尝试直接 API 调用
   */
  private static async tryDirectAPICall(
    url: string,
    requestData: unknown,
    apiType: 'openai' | 'ollama'
  ): Promise<GenerateReportResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, OllamaService.DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const responseData = await response.json();
      
      if (apiType === 'openai') {
        // OpenAI 格式的响应解析
        if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
          return {
            success: true,
            content: responseData.choices[0].message.content
          };
        }
        return {
          success: false,
          error: 'OpenAI API 响应格式无效'
        };
      } else {
        // Ollama 格式的响应解析
        if (!responseData.response) {
          return {
            success: false,
            error: 'Ollama API 响应格式无效'
          };
        }
        return {
          success: true,
          content: responseData.response
        };
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '请求超时' };
        }
        if (error.message.includes('fetch')) {
          return { success: false, error: '网络连接失败或 CORS 限制' };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 检查配置的完整性
   * @param config AI配置
   * @returns 配置是否完整
   */
  static isConfigComplete(config: Partial<AIReportConfig> | undefined): config is AIReportConfig {
    if (!config) return false;
    
    return !!(
      config.ollamaUrl &&
      config.modelName &&
      typeof config.temperature === 'number'
    );
  }
}