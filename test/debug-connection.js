/**
 * 调试连接问题
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

async function debugConnection() {
  console.log('🔍 调试连接问题');
  console.log('==========================================');
  
  const modelsUrl = buildOpenAIModelsUrl(CONFIG.ollamaUrl);
  console.log('🌐 构建的URL:', modelsUrl);
  
  try {
    console.log('📡 发送请求...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏰ 请求超时 (5秒)');
    }, 5000);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    console.log('📊 响应状态:', response.status, response.statusText);
    console.log('📋 响应头:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 请求成功');
      console.log('📄 响应数据:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ 请求失败');
      console.log('📄 错误响应:', errorText);
    }
    
  } catch (error) {
    console.log('💥 请求异常:', error.message);
    console.log('🔍 错误类型:', error.name);
    console.log('📋 完整错误:', error);
  }
  
  console.log('==========================================');
}

// 运行调试
debugConnection().catch(console.error);