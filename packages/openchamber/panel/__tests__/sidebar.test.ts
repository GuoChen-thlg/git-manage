/**
 * 左侧图标工具栏组件单元测试
 * 覆盖：12 个图标渲染顺序与 tooltip（中/英）、逐个点击回调分发、
 * 每个按钮的 svg 图标内容（getIcon 分支与 merge 自定义 svg 分支）、
 * 首个按钮 title 与箭头图标随 branchPanelHidden 订阅更新、hover 背景切换、
 * 创建时清空容器旧内容、dispose 取消订阅并停用点击（含重复调用幂等）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSidebar, SidebarHandlers } from '../components/sidebar';
import { createInitialState, setState, stateManager } from '../state';
import { setLocale } from '../i18n';
import { getIcon } from '../icons';

/** 12 个图标的 key 顺序（与 main.ts 原版一致） */
const KEYS = [
  'hideBranches', 'newBranch', 'refresh', 'delete', 'compare', 'search',
  'favorite', 'settings', 'pull', 'expandAll', 'sort', 'close',
];

/** 简体中文 tooltip（branchPanelHidden=false 初始态） */
const TITLES_ZH = [
  '隐藏 Git 分支', '新建分支', '更新所选', '删除分支', '与当前分支比较', '搜索',
  '收藏', '设置', '拉取', '展开全部', '排序', '关闭',
];

/** 英文 tooltip（branchPanelHidden=false 初始态） */
const TITLES_EN = [
  'Hide Git Branches', 'New Branch', 'Update Selected', 'Delete Branch', 'Compare with Current', 'Search',
  'Favorite', 'Settings', 'Pull', 'Expand All', 'Sort', 'Close',
];

/** 每个 key 对应的 handler 键 */
const HANDLER_OF: Record<string, keyof SidebarHandlers> = {
  hideBranches: 'onToggleBranchPanel',
  newBranch: 'onNewBranch',
  refresh: 'onRefresh',
  delete: 'onDeleteBranch',
  compare: 'onCompareBranch',
  search: 'onSearch',
  favorite: 'onFavorite',
  settings: 'onSettings',
  pull: 'onPull',
  expandAll: 'onExpandAll',
  sort: 'onSort',
  close: 'onClose',
};

describe('sidebar', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | null = null;
  let handlers: SidebarHandlers;

  beforeEach(() => {
    // 重置全局状态与语言（测试断言中文 tooltip）
    setState(s => Object.assign(s, createInitialState()));
    setLocale('zh-CN');
    container = document.createElement('div');
    document.body.appendChild(container);

    // 12 个 handler 全部打桩，逐个断言点击分发
    handlers = {
      onToggleBranchPanel: vi.fn(),
      onNewBranch: vi.fn(),
      onRefresh: vi.fn(),
      onDeleteBranch: vi.fn(),
      onCompareBranch: vi.fn(),
      onSearch: vi.fn(),
      onFavorite: vi.fn(),
      onSettings: vi.fn(),
      onPull: vi.fn(),
      onExpandAll: vi.fn(),
      onSort: vi.fn(),
      onClose: vi.fn(),
    };
  });

  afterEach(() => {
    dispose?.();
    dispose = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  /**
   * 创建侧边栏并登记 dispose（afterEach 统一调用）
   * @returns createSidebar 返回的可复用对象
   */
  function createBar() {
    const bar = createSidebar(container, handlers);
    dispose = bar.dispose;
    return bar;
  }

  /**
   * 按 key 取图标按钮
   * @param key 图标标识（data-sidebar）
   * @returns 按钮元素
   */
  function btn(key: string): HTMLElement {
    const el = container.querySelector(`[data-sidebar="${key}"]`) as HTMLElement | null;
    if (!el) throw new Error(`未找到侧边栏按钮: ${key}`);
    return el;
  }

  /**
   * 提取 svg 图形签名（d/points 属性值序列）
   * 忽略序列化差异，只比对图形数据本身
   * @param svg HTML 字符串（图标源码或元素 outerHTML）
   * @returns 图形属性值序列
   */
  function svgSignature(svg: string): string[] {
    return [...svg.matchAll(/\s(?:d|points)="([^"]*)"/g)].map(m => m[1]);
  }

  it('应该按约定顺序渲染 12 个图标按钮与简体中文 tooltip', () => {
    createBar();

    const nodes = container.querySelectorAll('[data-sidebar]');
    expect(nodes.length).toBe(12);
    expect([...nodes].map(n => n.getAttribute('data-sidebar'))).toEqual(KEYS);
    expect([...nodes].map(n => n.getAttribute('title'))).toEqual(TITLES_ZH);
  });

  it('容器应该沿用 40px 图标栏样式', () => {
    createBar();

    expect(container.style.width).toBe('40px');
    expect(container.style.background).toBe('rgb(43, 43, 43)');
    expect(container.style.gap).toBe('2px');
    expect(btn('refresh').style.width).toBe('32px');
    expect(btn('refresh').style.height).toBe('32px');
  });

  it('每个图标按钮点击应该只触发对应的 handler', () => {
    createBar();

    const called = new Set<keyof SidebarHandlers>();
    for (const key of KEYS) {
      const handlerKey = HANDLER_OF[key];
      // 每轮先清空全部 spy，隔离上一轮点击的调用记录
      for (const k of KEYS) vi.mocked(handlers[HANDLER_OF[k]]).mockClear();

      btn(key).click();

      // 目标 handler 恰好调用一次
      expect(vi.mocked(handlers[handlerKey])).toHaveBeenCalledTimes(1);
      // 其余 handler 全部未被调用
      for (const other of KEYS) {
        if (other === key) continue;
        expect(vi.mocked(handlers[HANDLER_OF[other]])).not.toHaveBeenCalled();
      }
      called.add(handlerKey);
    }

    // 12 个 handler 全部被逐一触发过
    expect(called.size).toBe(12);
  });

  it('设置按钮应该把 MouseEvent 透传给 onSettings', () => {
    createBar();

    btn('settings').click();

    expect(handlers.onSettings).toHaveBeenCalledTimes(1);
    const received = vi.mocked(handlers.onSettings).mock.calls[0][0];
    expect(received).toBeInstanceOf(MouseEvent);
    expect(received.type).toBe('click');
  });

  it('branchPanelHidden 变化应该把首个按钮 title 切换为显示/隐藏文案', () => {
    createBar();
    expect(btn('hideBranches').title).toBe('隐藏 Git 分支');

    setState(s => { s.branchPanelHidden = true; });
    expect(btn('hideBranches').title).toBe('显示 Git 分支');

    setState(s => { s.branchPanelHidden = false; });
    expect(btn('hideBranches').title).toBe('隐藏 Git 分支');
  });

  it('branchPanelHidden 变化应该把首个按钮图标在左右箭头间切换', () => {
    createBar();

    // 展开态：箭头向左（表示可收起）
    expect(svgSignature(btn('hideBranches').innerHTML)).toEqual(['M10 13L5 8L10 3']);

    // 隐藏态：箭头向右（表示可展开）
    setState(s => { s.branchPanelHidden = true; });
    expect(svgSignature(btn('hideBranches').innerHTML)).toEqual(['M6 13L11 8L6 3']);

    // 翻回展开态：箭头回到向左
    setState(s => { s.branchPanelHidden = false; });
    expect(svgSignature(btn('hideBranches').innerHTML)).toEqual(['M10 13L5 8L10 3']);
  });

  it('hover 应该切换按钮背景色', () => {
    createBar();
    const refresh = btn('refresh');

    refresh.dispatchEvent(new MouseEvent('mouseenter'));
    expect(refresh.style.background).toBe('rgb(60, 60, 60)');

    refresh.dispatchEvent(new MouseEvent('mouseleave'));
    expect(refresh.style.background).toBe('transparent');
  });

  it('dispose 应该清空容器且点击不再触发 handler', () => {
    createBar();
    const refresh = btn('refresh');
    const settings = btn('settings');

    dispose?.();

    expect(container.innerHTML).toBe('');

    // 持有旧引用点击：disposed 标志拦截，不再分发
    refresh.click();
    settings.click();
    expect(handlers.onRefresh).not.toHaveBeenCalled();
    expect(handlers.onSettings).not.toHaveBeenCalled();
  });

  it('dispose 后 state 变化不应再更新 title', () => {
    createBar();
    const toggle = btn('hideBranches');
    expect(toggle.title).toBe('隐藏 Git 分支');
    const iconBefore = toggle.innerHTML;

    dispose?.();
    setState(s => { s.branchPanelHidden = true; });

    // 订阅已取消：旧按钮 title 与图标保持不变
    expect(toggle.title).toBe('隐藏 Git 分支');
    expect(toggle.innerHTML).toBe(iconBefore);
  });

  it('重复 dispose 应该安全无副作用', () => {
    createBar();
    const bar = { dispose: dispose! };

    expect(() => {
      bar.dispose();
      bar.dispose();
    }).not.toThrow();
  });

  it('每个按钮应该渲染对应图标 svg，refresh 与 compare 使用各自图标字形', () => {
    createBar();

    // 非 refresh 按钮：走 getIcon(item.icon) 分支，逐个比对图形签名
    // delete 键的图标名为 deleteBranch（垃圾桶字形），compare 键为 compareBranch（双向箭头）
    const ICON_OF: Record<string, string> = { delete: 'deleteBranch', compare: 'compareBranch' };
    for (const key of KEYS) {
      if (key === 'refresh') continue;
      const expected = getIcon(ICON_OF[key] ?? key);
      expect(expected, `图标表应包含 ${key}`).not.toBe('');
      const svg = btn(key).querySelector('svg');
      expect(svg, `按钮 ${key} 应包含 svg 元素`).not.toBeNull();
      expect(svgSignature(svg!.outerHTML), `按钮 ${key} 图标内容`).toEqual(
        svgSignature(expected)
      );
    }

    // refresh 按钮：渲染 IDEA AllIcons.Actions.CheckOut 字形（更新所选）
    const updateSvg = btn('refresh').querySelector('svg');
    expect(updateSvg, 'refresh 按钮应包含 svg 元素').not.toBeNull();
    expect(svgSignature(updateSvg!.outerHTML)).toEqual(
      svgSignature(getIcon('updateSelected'))
    );
    expect(updateSvg!.outerHTML).toContain('#6E6E6E');

    // compare 按钮：双向箭头字形（与当前分支比较）
    const compareSvg = btn('compare').querySelector('svg');
    expect(compareSvg, 'compare 按钮应包含 svg 元素').not.toBeNull();
    expect(svgSignature(compareSvg!.outerHTML)).toEqual(
      svgSignature(getIcon('compareBranch'))
    );
  });

  it('创建时应该清空容器旧内容且不残留任何文本节点', () => {
    container.innerHTML = '<span class="stale">旧内容</span><p>残留段落</p>';

    createBar();

    expect(container.querySelector('.stale')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    // 恰好 12 个按钮子节点，没有任何多余文本节点
    expect(container.childNodes.length).toBe(12);
    // 按钮模板自带缩进空白，去空白后容器内不应残留任何文字
    expect(container.textContent?.replace(/\s+/g, '')).toBe('');
  });

  it('setLocale(en) 后 12 个按钮应该显示英文 tooltip', () => {
    setLocale('en');

    createBar();

    const nodes = container.querySelectorAll('[data-sidebar]');
    expect([...nodes].map(n => n.getAttribute('title'))).toEqual(TITLES_EN);
  });

  it('branchPanelHidden 初始为 true 时首个按钮应该直接显示“显示 Git 分支”', () => {
    setState(s => { s.branchPanelHidden = true; });

    createBar();

    expect(btn('hideBranches').title).toBe('显示 Git 分支');
    // 隐藏态初始渲染即为向右箭头
    expect(svgSignature(btn('hideBranches').innerHTML)).toEqual(['M6 13L11 8L6 3']);

    // 翻回 false，订阅应继续同步标题与图标
    setState(s => { s.branchPanelHidden = false; });
    expect(btn('hideBranches').title).toBe('隐藏 Git 分支');
    expect(svgSignature(btn('hideBranches').innerHTML)).toEqual(['M10 13L5 8L10 3']);
  });

  it('反复创建并翻转两次应该保持订阅独立且标题同步', () => {
    for (let round = 0; round < 3; round++) {
      setState(s => { s.branchPanelHidden = false; });

      const bar = createSidebar(container, handlers);
      expect(btn('hideBranches').title, `第 ${round} 轮初始标题`).toBe('隐藏 Git 分支');

      // 连续翻转两次再定格为 true
      setState(s => { s.branchPanelHidden = true; });
      setState(s => { s.branchPanelHidden = false; });
      setState(s => { s.branchPanelHidden = true; });
      expect(btn('hideBranches').title, `第 ${round} 轮翻转后标题`).toBe('显示 Git 分支');

      bar.dispose();
      // 本轮销毁后再变更状态，不应影响已卸载的按钮
      setState(s => { s.branchPanelHidden = false; });
    }
  });

  it('逐个 hover 应该在 12 个按钮上精确切换背景色', () => {
    createBar();

    for (const key of KEYS) {
      const b = btn(key);
      expect(b.style.background, `按钮 ${key} 初始背景`).toBe('');
      b.dispatchEvent(new MouseEvent('mouseenter'));
      expect(b.style.background, `按钮 ${key} hover 背景`).toBe('rgb(60, 60, 60)');
      b.dispatchEvent(new MouseEvent('mouseleave'));
      expect(b.style.background, `按钮 ${key} 离开背景`).toBe('transparent');
    }
  });

  it('重复 dispose 不应该再次清空容器（幂等）', () => {
    createBar();
    const bar = { dispose: dispose! };
    bar.dispose();

    // 首次 dispose 后放入的新内容，第二次 dispose 不应再清除
    const marker = document.createElement('span');
    marker.className = 'marker';
    marker.textContent = '后续内容';
    container.appendChild(marker);

    bar.dispose();

    expect(container.querySelector('.marker')).toBe(marker);
  });

  it('dispose 应该取消状态订阅使监听器数量复原', () => {
    const listeners = (stateManager as unknown as { listeners: Set<unknown> }).listeners;
    const base = listeners.size;

    createBar();
    expect(listeners.size, '创建后应新增一个监听器').toBe(base + 1);

    dispose?.();
    expect(listeners.size, 'dispose 后监听器应回到基线').toBe(base);
  });
});
