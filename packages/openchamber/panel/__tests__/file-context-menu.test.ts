/**
 * 文件右键菜单组件单元测试
 * 覆盖 showFileContextMenu 渲染、菜单项动作与 hideFileContextMenu 隐藏逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showFileContextMenu, hideFileContextMenu } from '../components/file-context-menu';
import { setState, createInitialState, FileDiff } from '../state';
import { setLocale } from '../i18n';
import { ServiceClient } from '../service';

/** 测试目录 */
const DIRECTORY = '/repo';

/** 测试文件差异 */
const fileDiff: FileDiff = {
  path: 'src/app.ts',
  additions: 3,
  deletions: 1,
  lines: [],
};

/** 全部中文菜单项文案（按渲染顺序） */
const ALL_LABELS = [
  '显示差异',
  '新窗口显示差异',
  '与本地比较',
  '比较改动前与本地',
  '编辑源文件',
  '打开仓库版本',
  '回滚选中更改',
  '摘取选中更改',
  '创建补丁',
  '从版本获取',
  '此处为止的历史',
];

/**
 * 构造右键点击事件
 * @returns 带坐标的 contextmenu 事件
 */
function createContextMenuEvent(): MouseEvent {
  return new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 });
}

/**
 * 按文案查找直接菜单项
 * @param menu 菜单容器
 * @param label 菜单项文案
 * @returns 菜单项元素，找不到返回 undefined
 */
function findMenuItem(menu: HTMLElement, label: string): HTMLElement | undefined {
  return Array.from(menu.children).find(el => el.textContent === label) as HTMLElement | undefined;
}

/**
 * 断言样式颜色值（兼容 3/6 位 hex，jsdom 可能把 hex 规范化为 rgb 字符串）
 * @param actual 实际样式值
 * @param hex 期望的十六进制颜色
 */
function expectStyleColor(actual: string, hex: string): void {
  // 3 位 hex 展开为 6 位
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  expect([hex, full, `rgb(${r}, ${g}, ${b})`]).toContain(actual);
}

/**
 * 获取当前文件菜单元素
 * @returns 菜单元素
 */
function getMenu(): HTMLElement {
  const menu = document.getElementById('git-file-context-menu');
  expect(menu).toBeTruthy();
  return menu as HTMLElement;
}

describe('file-context-menu', () => {
  beforeEach(() => {
    // 使用假计时器接管 show 结束时注册的 setTimeout(0)
    vi.useFakeTimers();
    setLocale('zh-CN');
    setState(s => Object.assign(s, createInitialState()));
    document.body.innerHTML = '';
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    hideFileContextMenu();
    // 执行排队的 setTimeout(0)，让全局 click 关闭监听注册后自清理
    vi.runAllTimers();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('showFileContextMenu', () => {
    it('派发 contextmenu 事件后应在指针位置渲染菜单与全部中文菜单项', () => {
      const trigger = document.createElement('div');
      document.body.appendChild(trigger);
      trigger.addEventListener('contextmenu', (e) => {
        showFileContextMenu(e as MouseEvent, fileDiff, {} as ServiceClient, DIRECTORY);
      });

      trigger.dispatchEvent(createContextMenuEvent());

      const menu = getMenu();
      expect(menu.style.position).toBe('fixed');
      expect(menu.style.left).toBe('10px');
      expect(menu.style.top).toBe('10px');

      const labels = (Array.from(menu.children) as HTMLElement[])
        .filter(el => el.style.height !== '1px')
        .map(el => el.textContent);
      expect(labels).toEqual(ALL_LABELS);

      // 4 条分隔线
      const separators = (Array.from(menu.children) as HTMLElement[]).filter(el => el.style.height === '1px');
      expect(separators).toHaveLength(4);
      expectStyleColor(separators[0].style.background, '#444');
    });

    it('回滚选中更改应显示为危险红色，普通项为默认样式', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      const menu = getMenu();
      const dangerItem = findMenuItem(menu, '回滚选中更改');
      const normalItem = findMenuItem(menu, '显示差异');

      expect(dangerItem).toBeTruthy();
      expectStyleColor(dangerItem!.style.color, '#f44336');
      expect(normalItem).toBeTruthy();
      expectStyleColor(normalItem!.style.color, '#ccc');
      expect(normalItem!.style.cursor).toBe('pointer');
    });

    it('悬停菜单项应显示高亮，移出后恢复透明', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      const item = findMenuItem(getMenu(), '显示差异')!;
      item.dispatchEvent(new MouseEvent('mouseenter'));
      expect(item.style.background).not.toBe('');
      expect(item.style.background).not.toBe('transparent');

      item.dispatchEvent(new MouseEvent('mouseleave'));
      expect(item.style.background).toBe('transparent');
    });

    it('点击显示差异应记录日志并关闭菜单', async () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      findMenuItem(getMenu(), '显示差异')!.click();
      await Promise.resolve();

      expect(console.log).toHaveBeenCalledWith('[git-manager] Show Diff:', 'src/app.ts');
      expect(document.getElementById('git-file-context-menu')).toBeNull();
    });

    it('点击回滚选中更改应记录对应日志并关闭菜单', async () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      findMenuItem(getMenu(), '回滚选中更改')!.click();
      await Promise.resolve();

      expect(console.log).toHaveBeenCalledWith('[git-manager] Revert Selected Changes:', 'src/app.ts');
      expect(document.getElementById('git-file-context-menu')).toBeNull();
    });

    it('点击每个菜单项都应执行动作并关闭菜单', async () => {
      for (const label of ALL_LABELS) {
        showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
        findMenuItem(getMenu(), label)!.click();
        await Promise.resolve();
        expect(document.getElementById('git-file-context-menu')).toBeNull();
      }
      // 每个动作都至少记录了一条日志
      expect(console.log).toHaveBeenCalledTimes(ALL_LABELS.length);
    });

    it('点击分隔线不应关闭菜单', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
      vi.runAllTimers();

      const menu = getMenu();
      const separator = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px')!;
      separator.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-file-context-menu')).toBeTruthy();
    });

    it('点击菜单外部应关闭菜单', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
      // 触发 setTimeout(0) 注册全局 click 关闭监听
      vi.runAllTimers();
      expect(document.getElementById('git-file-context-menu')).toBeTruthy();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-file-context-menu')).toBeNull();
    });

    it('重复打开菜单应只保留一个菜单', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      expect(document.querySelectorAll('#git-file-context-menu')).toHaveLength(1);
    });
  });

  describe('hideFileContextMenu', () => {
    it('应移除已存在的菜单', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
      expect(document.getElementById('git-file-context-menu')).toBeTruthy();

      hideFileContextMenu();

      expect(document.getElementById('git-file-context-menu')).toBeNull();
    });

    it('无菜单时调用不应报错', () => {
      expect(() => hideFileContextMenu()).not.toThrow();
    });
  });

  describe('菜单细节（补充变异覆盖）', () => {
    /** 各菜单项动作对应的日志文案（已由既有用例覆盖的项不在此列） */
    const LOG_CASES: Array<[label: string, message: string]> = [
      ['新窗口显示差异', '[git-manager] Show Diff in New Window:'],
      ['与本地比较', '[git-manager] Compare with Local:'],
      ['比较改动前与本地', '[git-manager] Compare Before with Local:'],
      ['编辑源文件', '[git-manager] Edit Source:'],
      ['打开仓库版本', '[git-manager] Open Repository Version:'],
      ['摘取选中更改', '[git-manager] Cherry-Pick Selected Changes:'],
      ['创建补丁', '[git-manager] Create Patch:'],
      ['从版本获取', '[git-manager] Get from Revision:'],
      ['此处为止的历史', '[git-manager] History Up to Here:'],
    ];

    it('点击各菜单项应输出对应文案的日志', async () => {
      for (const [label, message] of LOG_CASES) {
        showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);
        findMenuItem(getMenu(), label)!.click();
        await Promise.resolve();

        expect(console.log).toHaveBeenCalledWith(message, 'src/app.ts');
      }
    });

    it('菜单项与分隔线应应用默认内联样式', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      const menu = getMenu();
      const item = findMenuItem(menu, '显示差异')!;
      expect(item.style.padding).toBe('6px 12px');
      expect(item.style.fontSize).toBe('12px');

      const sep = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px') as HTMLElement;
      expect(sep.style.margin).toMatch(/^4px 0(px)?$/);
    });

    it('鼠标位于菜单容器自身时不触发高亮与恢复', () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      const menu = getMenu();
      menu.dispatchEvent(new MouseEvent('mouseenter'));
      expectStyleColor(menu.style.background, '#2d2d2d');

      menu.dispatchEvent(new MouseEvent('mouseleave'));
      expectStyleColor(menu.style.background, '#2d2d2d');
    });

    it('点击菜单项内的嵌套元素不应执行动作或关闭菜单', async () => {
      showFileContextMenu(createContextMenuEvent(), fileDiff, {} as ServiceClient, DIRECTORY);

      const menu = getMenu();
      const item = findMenuItem(menu, '与本地比较')!;
      const nested = document.createElement('div');
      nested.textContent = '与本地比较';
      item.appendChild(nested);

      nested.click();
      await Promise.resolve();

      expect(console.log).not.toHaveBeenCalledWith('[git-manager] Compare with Local:', 'src/app.ts');
      expect(document.getElementById('git-file-context-menu')).toBeTruthy();
    });
  });
});
