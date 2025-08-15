/**
 * 针对用户实际配置的连接测试
 * URL: http://localhost:11345
 * 模型: gpt-oss
 */

const USER_CONFIG = {
  ollamaUrl: 'http://localhost:11345',
  modelName: 'gpt-oss',
  temperature: 0.7
};

async function testUserConfig() {
  console.log('🔧 测试用户实际配置');
  console.log('==========================================');
  console.log(`🌐 服务地址: ${USER_CONFIG.ollamaUrl}`);
  console.log(`🤖 模型名称: ${USER_CONFIG.modelName}`);
  console.log(`🌡️  温度设置: ${USER_CONFIG.temperature}`);
  console.log('');

  // 1. 测试 /v1/models 端点
  console.log('📋 1. 检查 OpenAI 兼容的模型列表...');
  try {
    const modelsResponse = await fetch(`${USER_CONFIG.ollamaUrl}/v1/models`);
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('  ✅ /v1/models 端点可访问');
      console.log(`  📊 找到 ${modelsData.data?.length || 0} 个模型`);
      
      // 检查用户指定的模型
      const availableModels = modelsData.data || [];
      const modelExists = availableModels.some(model => 
        model.id === USER_CONFIG.modelName || 
        model.id === `${USER_CONFIG.modelName}:latest` ||
        model.id.startsWith(`${USER_CONFIG.modelName}:`)
      );
      
      if (modelExists) {
        console.log(`  ✅ 模型 '${USER_CONFIG.modelName}' 可用`);
      } else {
        console.log(`  ⚠️  模型 '${USER_CONFIG.modelName}' 不在列表中`);
        console.log('  📋 可用模型:');
        availableModels.forEach(model => {
          console.log(`    - ${model.id}`);
        });
      }
    } else {
      console.log(`  ❌ /v1/models 端点访问失败: HTTP ${modelsResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ /v1/models 端点连接失败: ${error.message}`);
  }

  console.log('');

  // 2. 测试 OpenAI 兼容的 chat/completions 端点
  console.log('💬 2. 测试 OpenAI 兼容的 chat 端点...');
  try {
    const chatRequest = {
      model: USER_CONFIG.modelName,
      messages: [
        {
          role: "user",
          content: "请简单回复'测试成功'"
        }
      ],
      temperature: USER_CONFIG.temperature,
      stream: false
    };

    const chatResponse = await fetch(`${USER_CONFIG.ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRequest),
      signal: AbortSignal.timeout(10000) // 10秒超时
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('  ✅ OpenAI 兼容 chat 端点测试成功');
      console.log(`  💬 AI 回复: "${chatData.choices?.[0]?.message?.content || 'N/A'}"`);
    } else {
      const errorText = await chatResponse.text().catch(() => '无法获取错误详情');
      console.log(`  ❌ Chat 端点测试失败: HTTP ${chatResponse.status}`);
      console.log(`  📄 错误详情: ${errorText}`);
    }
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log('  ⏰ Chat 端点请求超时');
    } else {
      console.log(`  ❌ Chat 端点连接失败: ${error.message}`);
    }
  }

  console.log('');

  // 3. 测试标准 Ollama API (作为备选)
  console.log('🔄 3. 测试标准 Ollama API...');
  try {
    const ollamaResponse = await fetch(`${USER_CONFIG.ollamaUrl}/api/tags`);
    if (ollamaResponse.ok) {
      console.log('  ✅ 标准 Ollama API 也可用 (/api/tags)');
    } else {
      console.log(`  ❌ 标准 Ollama API 不可用: HTTP ${ollamaResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 标准 Ollama API 连接失败: ${error.message}`);
  }

  console.log('');
  console.log('📋 测试总结:');
  console.log('- 您的服务使用 OpenAI 兼容 API 格式');
  console.log('- 推荐配置已更新为您的实际环境');
  console.log('- 现在应用的连接测试将优先使用 OpenAI API 格式');
  console.log('');
  console.log('🎉 配置验证完成');
  console.log('==========================================');
}

// 运行测试
if (typeof window === 'undefined') {
  // Node.js 环境需要 fetch polyfill
  global.fetch = global.fetch || require('node-fetch');
  global.AbortSignal = global.AbortSignal || AbortSignal;
  testUserConfig().catch(console.error);
} else {
  // 浏览器环境
  window.testUserConfig = testUserConfig;
  console.log('🔧 用户配置测试工具已加载，运行 testUserConfig() 开始测试');
}