/**
 * VS Code 集成测试配置
 * 用官方 @vscode/test-cli 启动真实 VS Code 实例（Extension Development Host），
 * 在其中运行 Mocha 测试，测试代码可访问完整的 vscode API。
 *
 * 与单元测试的分工：
 *   vitest（src/__tests__）→ 纯逻辑与 jsdom 渲染，无需 VS Code
 *   本配置（integration）→ 真实宿主：扩展激活、命令注册、TreeView、Webview 加载
 */

import { defineConfig } from '@vscode/test-cli';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // 集成测试编译后的产物（由 scripts/build-integration.mjs 生成）
  files: 'out-integration/**/*.test.js',
  version: 'stable',
  // 测试工作区：一个真实的 git 仓库夹具
  workspaceFolder: path.resolve(dirname, 'test-fixture'),
  mocha: {
    ui: 'tdd',
    timeout: 60000,
    color: true,
  },
  launchArgs: [
    // 避免加载用户已装的其他扩展，保证结果稳定
    '--disable-extensions',
    '--disable-workspace-trust',
    // Unix socket 路径有 103 字符上限，仓库路径较深时必须指定短目录
    '--user-data-dir',
    path.resolve(dirname, '.tmp-ud'),
  ],
});
