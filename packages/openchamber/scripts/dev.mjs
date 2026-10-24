#!/usr/bin/env node
/**
 * 开发模式构建脚本
 * 首次完整构建后进入监听，源码变化时自动重建到 dist/。
 * 宿主通过「路径安装」指向本包目录（packages/openchamber）即可读取 dist/ 下的产物。
 *
 * 用法：node scripts/dev.mjs
 * 停止：Ctrl+C
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(PKG_ROOT, 'dist');

/**
 * 打印带时间戳的日志
 * @param {string} msg 消息
 */
function log(msg) {
  const time = new Date().toTimeString().slice(0, 8);
  console.log(`[${time}] [dev] ${msg}`);
}

/**
 * 把面板 HTML 复制到产物目录（HTML 不参与打包，需单独同步）
 */
async function copyPanelHtml() {
  await fs.mkdir(path.join(DIST, 'panel'), { recursive: true });
  await fs.copyFile(
    path.join(PKG_ROOT, 'panel/index.html'),
    path.join(DIST, 'panel/index.html'),
  );
}

/**
 * 启动 esbuild 监听进程
 * @param {string} entry 入口文件（相对包根目录）
 * @param {string} outfile 输出文件（相对包根目录）
 * @param {string[]} extraArgs 额外参数
 * @returns {import('node:child_process').ChildProcess} 子进程
 */
function watch(entry, outfile, extraArgs) {
  const args = [
    entry,
    '--bundle',
    `--outfile=${outfile}`,
    // forever：后台运行时 stdin 关闭也不会退出监听
    '--watch=forever',
    '--log-level=warning',
    ...extraArgs,
  ];
  // 直接调用本地 esbuild 可执行文件：shell:false 下 npx 无法解析命令
  const esbuildBin = path.join(PKG_ROOT, 'node_modules/.bin/esbuild');
  const child = spawn(esbuildBin, args, { cwd: PKG_ROOT, stdio: 'inherit' });
  child.on('error', (e) => {
    log(`启动 ${entry} 监听失败：${e.message}`);
  });
  child.on('exit', (code) => {
    if (code !== 0) log(`${entry} 监听进程退出，code=${code}`);
  });
  return child;
}

async function main() {
  log('准备开发构建目录 dist/');
  await fs.mkdir(DIST, { recursive: true });
  await copyPanelHtml();

  log('启动面板监听（panel/main.ts → dist/panel/main.js）');
  const panel = watch('panel/main.ts', 'dist/panel/main.js', ['--format=iife', '--platform=browser']);

  log('启动服务监听（service/main.ts → dist/service/main.js）');
  const service = watch('service/main.ts', 'dist/service/main.js', ['--format=cjs', '--platform=node', '--target=node20']);

  // HTML 变化不频繁，用轮询同步（避免额外依赖）
  let htmlMtime = 0;
  try {
    htmlMtime = (await fs.stat(path.join(PKG_ROOT, 'panel/index.html'))).mtimeMs;
  } catch { /* 首次读取失败时下方逻辑会在变化后补上 */ }
  const timer = setInterval(async () => {
    try {
      const stat = await fs.stat(path.join(PKG_ROOT, 'panel/index.html'));
      if (stat.mtimeMs !== htmlMtime) {
        htmlMtime = stat.mtimeMs;
        await copyPanelHtml();
        log('已同步 panel/index.html');
      }
    } catch { /* 文件暂时不可读时忽略，下一轮重试 */ }
  }, 1000);

  log('监听中，修改源码会自动重建。宿主按路径安装时请选择：');
  log(`  ${PKG_ROOT}`);
  log('停止监听：Ctrl+C');

  const stop = () => {
    clearInterval(timer);
    panel.kill('SIGTERM');
    service.kill('SIGTERM');
    log('已停止');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error('[dev] 启动失败:', e);
  process.exit(1);
});
