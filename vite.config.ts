import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // 優化：配置 chunk 分割策略，減少初始載入大小
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心套件
          'react-vendor': ['react', 'react-dom'],
          // React Query
          'react-query': ['@tanstack/react-query'],
          // UI 框架套件（Radix UI）
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-scroll-area',
          ],
          // 圖表套件（通常較大）
          'chart-vendor': ['recharts'],
          // 圖示套件
          'icons-vendor': ['lucide-react'],
          // 工具類套件
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // 優化：設定 chunk 大小警告閾值
    chunkSizeWarningLimit: 1000, // 1MB
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
    hmr: false,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
