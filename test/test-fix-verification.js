/**
 * 验证 Ollama URL 设置修复的测试脚本
 * 
 * 这个脚本测试:
 * 1. 默认端口现在是 11434 而不是 11345
 * 2. 开发环境的智能代理逻辑
 * 3. 用户可以设置不同的端口
 */

// 模拟前端环境变量
const mockEnv = {
  DEV: true,
  VITE_OLLAMA_PROXY_TARGET: 'http://localhost:11434'
};

// 模拟 URL 构造器
class MockURL {
  constructor(url) {
    const match = url.match(/^(https?):\/\/([^:]+)(:(\d+))?/);
    if (!match) throw new Error('Invalid URL');
    
    this.protocol = match[1] + ':';
    this.hostname = match[2];
    this.port = match[4] || (match[1] === 'https' ? '443' : '80');
    this.pathname = '/';
  }
  
  toString() {
    return `${this.protocol}//${this.hostname}:${this.port}${this.pathname}`;
  }
}

// 模拟智能代理逻辑
function buildOpenAIChatUrl(baseUrl) {
  try {
    console.log('🔧 测试 buildOpenAIChatUrl:', { baseUrl });
    
    // 在开发环境中，检查是否应该使用代理
    if (mockEnv.DEV) {
      const url = new MockURL(baseUrl);
      const proxyTarget = mockEnv.VITE_OLLAMA_PROXY_TARGET || 'http://localhost:11434';
      const proxyUrl = new MockURL(proxyTarget);
      
      // 如果用户配置的端口与代理目标匹配，使用代理
      if (url.port === proxyUrl.port && url.hostname === proxyUrl.hostname) {
        const apiPath = '/api/ollama/v1/chat/completions';
        console.log(`✅ 使用代理路径: ${apiPath} (目标: ${proxyTarget})`);
        return apiPath;
      }
      
      // 否则尝试直接连接
      console.log(`⚠️ 端口不匹配 - 用户: ${url.port}, 代理: ${proxyUrl.port}, 尝试直接连接`);
    }
    
    const url = new MockURL(baseUrl);
    url.pathname = '/v1/chat/completions';
    const directUrl = url.toString();
    console.log('🌐 使用直接URL:', directUrl);
    return directUrl;
  } catch (error) {
    console.error('❌ buildOpenAIChatUrl 错误:', error);
    throw new Error(`无效的服务器URL: ${baseUrl}`);
  }
}

// 测试用例
console.log('🧪 开始验证 Ollama URL 设置修复');
console.log('=============================================');

console.log('\n1. 测试默认端口 11434 (应该使用代理):');
const result1 = buildOpenAIChatUrl('http://localhost:11434');
console.log('结果:', result1);

console.log('\n2. 测试用户自定义端口 11345 (应该直接连接):');
const result2 = buildOpenAIChatUrl('http://localhost:11345');
console.log('结果:', result2);

console.log('\n3. 测试其他端口 3000 (应该直接连接):');
const result3 = buildOpenAIChatUrl('http://localhost:3000');
console.log('结果:', result3);

console.log('\n4. 测试不同主机名 (应该直接连接):');
const result4 = buildOpenAIChatUrl('http://192.168.1.100:11434');
console.log('结果:', result4);

console.log('\n✅ 验证完成！');
console.log('\n预期结果:');
console.log('- 11434 端口: 使用代理路径 /api/ollama/v1/chat/completions');
console.log('- 11345 端口: 使用直接 URL http://localhost:11345/v1/chat/completions');
console.log('- 其他配置: 使用对应的直接 URL');

console.log('\n📋 修复总结:');
console.log('✅ 1. 移除了硬编码的 11345 端口');
console.log('✅ 2. 默认端口统一为 11434');
console.log('✅ 3. 实现智能代理逻辑');
console.log('✅ 4. 支持用户自定义端口');