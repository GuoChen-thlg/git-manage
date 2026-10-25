import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // 插件运行在 Node 环境（无 DOM）
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      // vscode 模块由宿主注入，测试中用本地替身，避免运行时找不到模块
      vscode: path.resolve(__dirname, './src/__tests__/__mocks__/vscode.ts'),
    },
  },
});
