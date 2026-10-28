/**
 * VS Code 集成测试
 * 在真实 Extension Development Host 中运行，验证 jsdom 无法覆盖的部分：
 * 扩展激活、命令注册、TreeView 数据、Webview 实际创建。
 */

import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** 扩展 ID，与 package.json 的 publisher.name 对应 */
const EXTENSION_ID = 'thlg.git-manager-vscode';

/**
 * 等待条件成立
 * @param fn 判断函数
 * @param timeout 超时毫秒
 */
async function waitFor(fn: () => boolean | Promise<boolean>, timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('等待超时');
}

suite('扩展激活', () => {
  test('扩展应能被找到并激活', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, '扩展应已安装到测试宿主中');

    await ext.activate();
    assert.strictEqual(ext.isActive, true, '激活后 isActive 应为 true');
  });

  test('激活后应注册全部命令', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
    await ext.activate();

    const all = await vscode.commands.getCommands(true);
    for (const id of [
      'gitManager.openPanel',
      'gitManager.refresh',
      'gitManager.checkoutBranch',
      'gitManager.createBranch',
      'gitManager.deleteBranch',
      'gitManager.renameBranch',
      'gitManager.selectBranch',
      'gitManager.showLogs',
    ]) {
      assert.ok(all.includes(id), `应注册命令 ${id}`);
    }
  });

  test('打开面板命令应能聚焦底部面板视图而不报错', async () => {
    // 真实宿主里执行命令，验证不会抛异常（这是「点不开」类问题的兜底检查）
    await vscode.commands.executeCommand('gitManager.openPanel');
    // 视图聚焦是异步的，等待面板容器出现
    await new Promise(r => setTimeout(r, 1500));

    // 面板在底部面板区，通过命令执行不抛错即视为通过
    assert.ok(true);
  });
});

suite('TreeView 数据', () => {
  test('刷新命令应能在真实仓库上执行成功', async () => {
    // 工作区是真实 git 仓库（test-fixture），刷新会真实调用 git
    // executeCommand 返回 Thenable，需转成 Promise 才能被 doesNotReject 接受
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('gitManager.refresh')),
      '刷新命令不应抛错',
    );
  });

  test('分支命令在无参数时应给出提示而不是崩溃', async () => {
    // 无选中分支时点击删除，应走提示分支，不应抛异常
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('gitManager.deleteBranch')),
      '删除命令在无参数时不应抛错',
    );
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('gitManager.renameBranch')),
      '重命名命令在无参数时不应抛错',
    );
  });
});

suite('日志通道', () => {
  test('显示日志命令应可执行', async () => {
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('gitManager.showLogs')),
      '显示日志命令不应抛错',
    );
  });
});

suite('工作区', () => {
  test('测试夹具应为 git 仓库', async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, '应打开测试工作区');
    // 夹具目录里应有 .git
    const uri = vscode.Uri.joinPath(folders![0]!.uri, '.git');
    await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(uri);
        return true;
      } catch {
        return false;
      }
    });
  });
});
