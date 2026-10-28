/**
 * VS Code 插件构建脚本
 * 用 esbuild 把扩展主进程打成单文件 CJS（VS Code 要求 CommonJS），
 * core 一并打进产物，避免插件安装时还需安装依赖
 */

import { build, context } from 'esbuild';

/** 命令行是否带 --watch */
const watch = process.argv.includes('--watch');

/** 构建配置 */
const options = {
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

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[build] 监听中，修改源码后自动重建');
} else {
  await build(options);
  console.log('[build] 构建完成 dist/extension.js');
}
