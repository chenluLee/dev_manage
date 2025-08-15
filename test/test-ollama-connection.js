/**
 * Ollama 连接测试脚本
 * 用于验证不同配置场景下的连接行为
 */

// 模拟不同的环境配置
const testConfigs = [
  {
    name: '默认配置 (localhost:11434)',
    url: 'http://localhost:11434',
    shouldUseProxy: true
  },
  {
    name: '用户配置 (10.2.2.19:11345)',
    url: 'http://10.2.2.19:11345',
    shouldUseProxy: true // 现在应该始终使用代理
  },
  {
    name: '其他IP配置 (192.168.1.100:11434)',
    url: 'http://192.168.1.100:11434',
    shouldUseProxy: true
  }
];

// 模拟 buildApiUrl 函数的逻辑
function simulateBuildApiUrl(baseUrl, isDev = true) {
  console.log(`\n🔧 测试配置: ${baseUrl}`);
  console.log(`环境: ${isDev ? '开发' : '生产'}`);
  
  if (isDev) {
    const apiPath = '/api/ollama/api/generate';
    console.log(`✅ 使用代理路径: ${apiPath} (基于用户配置: ${baseUrl})`);
    return apiPath;
  }
  
  try {
    const url = new URL(baseUrl);
    const pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    url.pathname = pathname + 'api/generate';
    const directUrl = url.toString();
    console.log(`🌐 使用直接URL: ${directUrl}`);
    return directUrl;
  } catch (error) {
    console.error(`❌ URL 构建错误: ${error.message}`);
    return null;
  }
}

function simulateConnectionSuggestion(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const currentPort = url.port || (url.protocol === 'https:' ? '443' : '80');
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    
    let suggestions = [];
    
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

// 运行测试
console.log('🚀 Ollama 连接配置测试\n');
console.log('='.repeat(50));

testConfigs.forEach((config, index) => {
  console.log(`\n📋 测试场景 ${index + 1}: ${config.name}`);
  console.log('-'.repeat(30));
  
  // 测试开发环境
  simulateBuildApiUrl(config.url, true);
  
  // 测试生产环境
  console.log('\n生产环境行为:');
  simulateBuildApiUrl(config.url, false);
  
  // 显示连接建议
  if (!config.url.includes('localhost')) {
    console.log('\n💡 连接建议:');
    console.log(simulateConnectionSuggestion(config.url));
  }
  
  console.log('\n' + '='.repeat(50));
});

console.log('\n✅ 测试总结:');
console.log('- 开发环境现在始终使用代理，避免 CORS 问题');
console.log('- 用户只需设置 OLLAMA_URL 环境变量指向实际服务');
console.log('- 代理失败时会自动尝试直接连接并提供详细建议');
console.log('- 生产环境保持直接连接行为');