/**
 * 集成测试构建脚本
 * 把 integration/ 下的测试编译成 CommonJS（VS Code 测试宿主需要 CJS），
 * 并复用主构建产物 dist/extension.js 作为被测扩展。
 */

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';

// 1) 清理旧产物
rmSync('out-integration', { recursive: true, force: true });
mkdirSync('out-integration', { recursive: true });

// 2) 编译测试文件
// 每个测试文件单独打包成 CJS，vscode 由宿主提供
for (const name of ['extension', 'features', 'boundary']) {
  await build({
    entryPoints: [`integration/${name}.test.ts`],
    bundle: true,
    outfile: `out-integration/${name}.test.js`,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    sourcemap: false,
    logLevel: 'error',
  });
}
console.log('[integration] 测试文件已编译');

// 3) 构建被测扩展本体
await import('./build.mjs');

// 4) 确保测试夹具是真实的 git 仓库
const FIXTURE = 'test-fixture';
if (!existsSync(FIXTURE)) mkdirSync(FIXTURE, { recursive: true });

/**
 * 在夹具目录执行 git
 * @param args git 参数
 */
function git(args) {
  execFileSync('git', args, { cwd: FIXTURE, stdio: 'pipe' });
}

if (!existsSync(`${FIXTURE}/.git`)) {
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'fixture@example.com']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'commit.gpgsign', 'false']);
  writeFileSync(`${FIXTURE}/README.md`, '# fixture\n');
  git(['add', '.']);
  git(['commit', '-m', 'init: 夹具初始提交']);
  console.log('[integration] 已创建测试夹具仓库');
}

console.log('[integration] 构建完成，可运行 pnpm run test:integration');
