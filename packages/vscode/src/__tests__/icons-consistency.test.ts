/**
 * 图标一致性测试
 * 面板的侧栏与工具栏图标必须与 OpenChamber 版本保持一致：
 * 同名、同顺序、且每个用到的图标都有定义（否则渲染为空白）。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PANEL_ICONS } from '../webview/icons';
import { PANEL_SCRIPT } from '../webview/script';

/** 仓库根目录 */
const REPO_ROOT = resolve(__dirname, '../../../..');

/**
 * 读取 OpenChamber 面板源码
 * @returns 侧栏与提交列表源码
 */
function readOpenChamberSources(): { sidebar: string; commitList: string } {
  return {
    sidebar: readFileSync(resolve(REPO_ROOT, 'packages/openchamber/panel/components/sidebar.ts'), 'utf-8'),
    commitList: readFileSync(resolve(REPO_ROOT, 'packages/openchamber/panel/components/commit-list.ts'), 'utf-8'),
  };
}

describe('图标与 OpenChamber 一致', () => {
  const { sidebar, commitList } = readOpenChamberSources();

  it('侧栏图标顺序应与 OpenChamber 一致', () => {
    // OpenChamber 侧栏图标定义（icon: 字段按顺序出现）
    const ocIcons = [...sidebar.matchAll(/icon: '([a-zA-Z]+)'/g)].map(m => m[1]);

    // VS Code 面板侧栏项
    const block = /SIDEBAR_ITEMS = \[([\s\S]*?)\];/.exec(PANEL_SCRIPT)?.[1] ?? '';
    const vsIcons = [...block.matchAll(/icon: '([a-zA-Z]+)'/g)].map(m => m[1]);

    expect(vsIcons.length).toBe(ocIcons.length);
    // 收藏图标会按状态在 favorite/favoriteOutline 间切换，比对时归一化
    const normalize = (list: string[]) => list.map(n => (n.startsWith('favorite') ? 'favorite' : n));
    expect(normalize(vsIcons)).toEqual(normalize(ocIcons));
  });

  it('工具栏右侧图标应与 OpenChamber 一致', () => {
    // OpenChamber 工具栏右上角四个按钮：按按钮的 data-action 精确定位
    const ocToolbar: string[] = [];
    for (const action of ['btn-refresh', 'btn-cherry-pick', 'btn-settings', 'btn-goto']) {
      const re = new RegExp('data-action="' + action + '"[^>]*>\\$\\{getIcon\\\(' + "'" + '([a-zA-Z]+)' + "'" + '\\)\\}');
      const hit = re.exec(commitList);
      if (hit) ocToolbar.push(hit[1]!);
    }
    expect(ocToolbar).toEqual(['refresh', 'cherryPick', 'gearSettings', 'search']);

    // VS Code 面板工具栏右侧
    const block = /\/\/ 右侧操作[^]*?const settingsBtn[\s\S]*?\n\n/.exec(PANEL_SCRIPT)?.[0] ?? '';
    const vsIcons = [...block.matchAll(/iconButton\('([a-zA-Z]+)'/g)].map(m => m[1]);

    // gearSettings 通过变量传递，单独补上
    expect(vsIcons).toContain('refresh');
    expect(vsIcons).toContain('cherryPick');
    expect(vsIcons).toContain('search');
    expect(block).toContain("iconButton('gearSettings'");
    // 不应再出现旧的跳转箭头图标
    expect(block).not.toContain("iconButton('goToRef'");
  });

  it('收起/展开分支面板的图标应与 OpenChamber 一致（左箭头/右箭头）', () => {
    // OpenChamber：展开态 hideBranches（左箭头），收起态 showBranches（右箭头）
    expect(sidebar).toContain("getIcon('showBranches')");
    expect(sidebar).toContain("getIcon('hideBranches')");

    // VS Code 面板必须使用同样这一对图标
    const line = /branchPanelHidden \? '([a-zA-Z]+)' : '([a-zA-Z]+)'/.exec(PANEL_SCRIPT);
    expect(line).toBeTruthy();
    expect(line![1]).toBe('showBranches');
    expect(line![2]).toBe('hideBranches');
  });

  it('面板用到的每个图标都必须有定义，否则渲染为空白', () => {
    const used = new Set<string>([
      ...[...PANEL_SCRIPT.matchAll(/icon: '([a-zA-Z]+)'/g)].map(m => m[1]),
      ...[...PANEL_SCRIPT.matchAll(/iconButton\('([a-zA-Z]+)'/g)].map(m => m[1]),
      // 三元表达式里以字符串形式指定的图标（如收起/展开切换）也要覆盖
      ...[...PANEL_SCRIPT.matchAll(/\? '([a-zA-Z]+)' : '([a-zA-Z]+)'/g)].flatMap(m => [m[1]!, m[2]!]),
      // 赋值语句右侧的图标名
      ...[...PANEL_SCRIPT.matchAll(/iconName = '([a-zA-Z]+)'/g)].map(m => m[1]),
    ]);

    const missing = [...used].filter(name => !PANEL_ICONS[name as keyof typeof PANEL_ICONS]);
    expect(missing).toEqual([]);
  });

  it('图标应使用 currentColor，才能跟随主题变色', () => {
    for (const [name, svg] of Object.entries(PANEL_ICONS)) {
      // 固定颜色在浅色主题下会不可见
      expect(svg, `${name} 不应包含写死的颜色`).not.toMatch(/#[0-9A-Fa-f]{6}/);
    }
  });
});
