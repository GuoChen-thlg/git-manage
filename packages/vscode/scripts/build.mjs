/**
 * VS Code 插件构建脚本
 * 用 esbuild 打两个产物：
 *   1. 扩展主进程：单文件 CJS（VS Code 要求 CommonJS），core 一并打进产物
 *   2. webview 前端：IIFE bundle（浏览器环境），入口 src/webview/src/main.ts
 * 样式为纯 CSS，直接复制到 dist/webview/main.css
 */

import { build, context } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

/** 命令行是否带 --watch */
const watch = process.argv.includes('--watch');

/** 扩展主进程构建配置 */
const extensionOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  // vscode 由宿主提供，不能打进产物
  external: ['vscode'],
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

/** webview 前端构建配置（浏览器 IIFE，保留 sourcemap 便于调试） */
const webviewOptions = {
  entryPoints: ['src/webview/src/main.ts'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(extensionOptions);
  const ctxWebview = await context(webviewOptions);
  await ctx.watch();
  await ctxWebview.watch();
  console.log('[build] 监听中，修改源码后自动重建');
} else {
  await build(extensionOptions);
  await build(webviewOptions);
  // CSS 无需编译，复制到产物目录
  mkdirSync('dist/webview', { recursive: true });
  copyFileSync('src/webview/src/styles.css', 'dist/webview/main.css');
  console.log('[build] 构建完成 dist/extension.js + dist/webview/main.js + dist/webview/main.css');
}
