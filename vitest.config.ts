import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    // service 路由测试需要真实文件系统与 git，跑在 node 环境
    environmentMatchGlobs: [['**/service/__tests__/**', 'node']],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages'),
    },
  },
});
