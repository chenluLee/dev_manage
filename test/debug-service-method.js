/**
 * 调试 OllamaService 中的方法
 */

const CONFIG = {
  ollamaUrl: 'http://localhost:11434',
  modelName: 'gpt-oss',
  temperature: 0.7
};

function buildOpenAIModelsUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    url.pathname = pathname + 'v1/models';
    return url.toString();
  } catch (error) {
    throw new Error(`无效的服务器URL: ${baseUrl}`);
  }
}

async function tryFetchWithTimeout(url) {
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
    
    console.log(`✅ tryFetchWithTimeout - success: ${response.ok}, status: ${response.status}`);
    return { success: response.ok, response };
  } catch (error) {
    console.log(`❌ tryFetchWithTimeout - error: ${error.message}`);
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

async function testServiceAvailability(baseUrl) {
  try {
    console.log('🔍 测试服务可用性...');
    
    // 先尝试 OpenAI 兼容的 /v1/models 端点
    const openaiUrl = buildOpenAIModelsUrl(baseUrl);
    console.log('🌐 OpenAI URL:', openaiUrl);
    
    const openaiResult = await tryFetchWithTimeout(openaiUrl);
    console.log('📊 OpenAI 结果:', openaiResult);
    
    if (openaiResult.success) {
      return { success: true, content: '服务可达 (OpenAI API 兼容)' };
    }

    // 如果失败，尝试标准的 Ollama /api/tags 端点
    console.log('🔄 尝试标准 Ollama API...');
    const ollamaUrl = baseUrl + '/api/tags';
    const ollamaResult = await tryFetchWithTimeout(ollamaUrl);
    console.log('📊 Ollama 结果:', ollamaResult);
    
    if (ollamaResult.success) {
      return { success: true, content: '服务可达 (Ollama API)' };
    }

    // 两个端点都失败
    return {
      success: false,
      error: `服务不可达 - 已尝试 OpenAI 和 Ollama API 格式。建议尝试默认端口 11434: http://localhost:11434`
    };

  } catch (error) {
    console.log('💥 testServiceAvailability 异常:', error);
    return {
      success: false,
      error: `服务连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

async function debugServiceMethod() {
  console.log('🔧 调试服务方法');
  console.log('==========================================');
  
  const result = await testServiceAvailability(CONFIG.ollamaUrl);
  
  console.log('📋 最终结果:');
  console.log('  success:', result.success);
  console.log('  content:', result.content);
  console.log('  error:', result.error);
  
  console.log('==========================================');
}

// 运行调试
debugServiceMethod().catch(console.error);