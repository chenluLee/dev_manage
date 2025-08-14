import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // 代理 Ollama API 请求以解决 CORS 问题
      '/api/ollama': {
        target: 'http://localhost:11345',
        changeOrigin: true,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔄 代理请求: ${req.method} ${req.url} -> ${proxyReq.host}${proxyReq.path}`);
            
            // 确保请求头正确设置
            if (req.method === 'POST') {
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Accept', 'application/json');
            }
            
            // 移除可能导致问题的头信息
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`✅ 代理响应: ${proxyRes.statusCode} ${req.url}`);
            
            // 添加 CORS 头信息
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept';
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ Ollama proxy error:', err.message, 'for', req.url);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
