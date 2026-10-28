import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    // vscode 包依赖 vscode 模块替身，由 packages/vscode/vitest.config.ts 单独运行
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/vscode/**', '**/packages/vscode/**'],
    // service 路由测试需要真实文件系统与 git，跑在 node 环境
    environmentMatchGlobs: [['**/service/__tests__/**', 'node']],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages'),
    },
  },
});
