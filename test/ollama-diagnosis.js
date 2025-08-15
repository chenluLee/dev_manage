/**
 * Ollama 连接诊断工具
 * 用于测试不同端口和配置的 Ollama 连接状态
 */

async function testOllamaConnection(url, port) {
  const fullUrl = `${url}:${port}`;
  console.log(`\n🔍 测试连接: ${fullUrl}`);
  
  try {
    // 测试 /api/tags 端点
    console.log('  - 检查 /api/tags 端点...');
    const tagsResponse = await fetch(`${fullUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      console.log(`  ✅ /api/tags 连接成功`);
      console.log(`  📋 可用模型:`, tagsData.models?.map(m => m.name) || []);
      
      // 检查特定模型
      const hasGptOss = tagsData.models?.some(m => m.name === 'gpt-oss');
      if (hasGptOss) {
        console.log(`  ✅ 找到模型 'gpt-oss'`);
      } else {
        console.log(`  ⚠️  未找到模型 'gpt-oss'`);
        console.log(`  💡 建议使用以下可用模型之一:`, tagsData.models?.map(m => m.name) || []);
      }
      
      return { success: true, models: tagsData.models || [], port };
    } else {
      console.log(`  ❌ /api/tags 连接失败: HTTP ${tagsResponse.status}`);
      return { success: false, error: `HTTP ${tagsResponse.status}`, port };
    }
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log(`  ⏰ 连接超时 (5秒)`);
      return { success: false, error: '超时', port };
    } else if (error.message.includes('fetch')) {
      console.log(`  🚫 无法连接到服务`);
      return { success: false, error: '连接拒绝', port };
    } else {
      console.log(`  ❌ 连接错误: ${error.message}`);
      return { success: false, error: error.message, port };
    }
  }
}

async function testModelGeneration(url, port, modelName) {
  const fullUrl = `${url}:${port}`;
  console.log(`\n🤖 测试模型生成: ${modelName} @ ${fullUrl}`);
  
  try {
    const response = await fetch(`${fullUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: '请回复"测试成功"',
        temperature: 0.1,
        stream: false
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ 模型生成测试成功`);
      console.log(`  💬 响应内容: "${data.response}"`);
      return { success: true, response: data.response };
    } else {
      console.log(`  ❌ 模型生成失败: HTTP ${response.status}`);
      const errorText = await response.text().catch(() => '无法获取错误详情');
      console.log(`  📄 错误详情: ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log(`  ⏰ 生成超时 (10秒)`);
      return { success: false, error: '生成超时' };
    } else {
      console.log(`  ❌ 生成错误: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function diagnosisOllama() {
  console.log('🔧 Ollama 连接诊断工具');
  console.log('==========================================');
  
  const commonPorts = [11434, 11345, 8080, 3000];
  const baseUrl = 'http://localhost';
  
  console.log(`📍 测试地址: ${baseUrl}`);
  console.log(`🔌 测试端口: ${commonPorts.join(', ')}`);
  
  const results = [];
  
  // 测试不同端口的连接
  for (const port of commonPorts) {
    const result = await testOllamaConnection(baseUrl, port);
    results.push(result);
  }
  
  // 找到成功的连接
  const successfulConnections = results.filter(r => r.success);
  
  if (successfulConnections.length === 0) {
    console.log('\n❌ 所有端口连接失败');
    console.log('\n💡 可能的解决方案:');
    console.log('1. 确保 Ollama 服务已启动: ollama serve');
    console.log('2. 检查防火墙设置');
    console.log('3. 确认 Ollama 运行在正确的端口上');
    console.log('4. 尝试使用 curl 测试: curl http://localhost:11434/api/tags');
    return;
  }
  
  console.log('\n✅ 成功连接的端口:');
  successfulConnections.forEach(conn => {
    console.log(`  - 端口 ${conn.port}: ${conn.models.length} 个可用模型`);
  });
  
  // 测试模型生成
  const firstConnection = successfulConnections[0];
  if (firstConnection.models.length > 0) {
    // 测试 gpt-oss 模型
    const hasGptOss = firstConnection.models.some(m => m.name === 'gpt-oss');
    if (hasGptOss) {
      await testModelGeneration(baseUrl, firstConnection.port, 'gpt-oss');
    } else {
      console.log('\n⚠️  gpt-oss 模型不可用，测试第一个可用模型...');
      const firstModel = firstConnection.models[0].name;
      await testModelGeneration(baseUrl, firstConnection.port, firstModel);
    }
  }
  
  // 总结建议
  console.log('\n📋 配置建议:');
  if (successfulConnections.length > 0) {
    const recommended = successfulConnections[0];
    console.log(`  Ollama URL: http://localhost:${recommended.port}`);
    
    if (recommended.models.length > 0) {
      const hasGptOss = recommended.models.some(m => m.name === 'gpt-oss');
      if (hasGptOss) {
        console.log(`  推荐模型: gpt-oss`);
      } else {
        console.log(`  推荐模型: ${recommended.models[0].name}`);
        console.log(`  💡 如需使用 gpt-oss，请先安装: ollama pull gpt-oss`);
      }
    }
    
    console.log(`  温度参数: 0.7 (默认)`);
  }
  
  console.log('\n==========================================');
  console.log('🎉 诊断完成');
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  // Node.js 环境
  const { fetch } = require('node-fetch');
  global.fetch = fetch;
  global.AbortSignal = AbortSignal;
  
  diagnosisOllama().catch(console.error);
} else {
  // 浏览器环境
  window.diagnosisOllama = diagnosisOllama;
  console.log('🔧 诊断工具已加载，运行 diagnosisOllama() 开始诊断');
}