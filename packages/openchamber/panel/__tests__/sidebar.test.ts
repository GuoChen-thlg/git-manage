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

/** 12 个图标的 key 顺序（对齐 IDEA 分支面板工具栏） */
const KEYS = [
  'newBranch', 'refresh', 'delete', 'compare', 'search', 'fetch',
  'favorite', 'locate', 'settings', 'expandAll', 'collapseAll', 'close',
];

/** 简体中文 tooltip */
const TITLES_ZH = [
  '新建分支', '更新所选', '删除分支', '与当前分支比较', '只显示我的分支', '获取远程更新',
  '收藏', '在 Git 日志中定位', '设置', '展开全部', '折叠全部', '关闭',
];

/** 英文 tooltip */
const TITLES_EN = [
  'New Branch', 'Update Selected', 'Delete Branch', 'Compare with Current', 'Show My Branches', 'Fetch',
  'Favorite', 'Select in Git Log', 'Settings', 'Expand All', 'Collapse All', 'Close',
];

/** 每个 key 对应的 handler 键 */
const HANDLER_OF: Record<string, keyof SidebarHandlers> = {
  newBranch: 'onNewBranch',
  refresh: 'onRefresh',
  delete: 'onDeleteBranch',
  compare: 'onCompareBranch',
  search: 'onToggleMyBranches',
  fetch: 'onFetch',
  favorite: 'onFavorite',
  locate: 'onLocateBranch',
  settings: 'onSettings',
  expandAll: 'onExpandAll',
  collapseAll: 'onCollapseAll',
  close: 'onClose',
};

describe('sidebar', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | null = null;
  let handlers: SidebarHandlers;

  beforeEach(() => {
    // 重置全局状态与语言（测试断言中文 tooltip）
    setState(s => Object.assign(s, createInitialState()));
    // 预置完整分支场景：本地 + 远程分支，且选中一个非当前本地分支
    // 这样各按钮的可用性判定都走「可用」分支，tooltip 与点击行为可被断言
    setState(s => {
      s.branches = [
        { name: 'main', isCurrent: true, isRemote: false },
        { name: 'develop', isCurrent: false, isRemote: false },
        { name: 'origin/main', isCurrent: false, isRemote: true, remote: 'origin' },
      ];
      s.selectedBranch = { name: 'develop', isCurrent: false, isRemote: false };
    });
    setLocale('zh-CN');
    container = document.createElement('div');
    document.body.appendChild(container);

    // 12 个 handler 全部打桩，逐个断言点击分发
    handlers = {
      onNewBranch: vi.fn(),
      onRefresh: vi.fn(),
      onDeleteBranch: vi.fn(),
      onCompareBranch: vi.fn(),
      onToggleMyBranches: vi.fn(),
      onFetch: vi.fn(),
      onFavorite: vi.fn(),
      onLocateBranch: vi.fn(),
      onSettings: vi.fn(),
      onExpandAll: vi.fn(),
      onCollapseAll: vi.fn(),
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
    // favorite 的图标随选中分支的收藏状态变化，这里断言未收藏时的空心星
    const ICON_OF: Record<string, string> = {
      delete: 'deleteBranch',
      compare: 'compareBranch',
      favorite: 'favoriteOutline',
    };
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

  it('逐个 hover 应该在 12 个按钮上精确切换背景色', () => {
    createBar();

    for (const key of KEYS) {
      const b = btn(key);
      // 初始背景显式定为 transparent（激活态才设置高亮底色）
      expect(b.style.background, `按钮 ${key} 初始背景`).toBe('transparent');
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
    // 现有订阅：showOnlyMyBranches/branches/selectedBranch/selectedBranches（按钮状态同步）
    expect(listeners.size, '创建后应新增一个监听器').toBe(base + 1);

    dispose?.();
    expect(listeners.size, 'dispose 后监听器应回到基线').toBe(base);
  });

  it('我的分支筛选激活时按钮应该显示背景色，关闭后恢复透明', () => {
    createBar();
    const btn = container.querySelector('[data-sidebar="search"]') as HTMLElement;

    // 初始未激活：无背景
    expect(btn.dataset.active).toBe('false');
    expect(btn.style.background).toBe('transparent');

    // 激活：设置高亮背景
    setState(s => { s.showOnlyMyBranches = true; });
    expect(btn.dataset.active).toBe('true');
    expect(btn.style.background).toBe('rgb(46, 74, 110)');

    // 再次关闭：恢复透明
    setState(s => { s.showOnlyMyBranches = false; });
    expect(btn.dataset.active).toBe('false');
    expect(btn.style.background).toBe('transparent');
  });

  it('没有本地分支时我的分支按钮应该禁用且点击不触发 handler', () => {
    // 清空分支：无可筛选对象
    setState(s => { s.branches = []; });
    createBar();
    const btn = container.querySelector('[data-sidebar="search"]') as HTMLElement;

    expect(btn.dataset.disabled).toBe('true');
    expect(btn.style.cursor).toBe('not-allowed');
    expect(btn.title).toBe('没有可筛选的本地分支');

    btn.click();
    expect(handlers.onToggleMyBranches).not.toHaveBeenCalled();
  });

  it('存在本地分支时我的分支按钮应该可用并响应点击', () => {
    createBar();
    const btn = container.querySelector('[data-sidebar="search"]') as HTMLElement;

    expect(btn.dataset.disabled).toBe('false');
    expect(btn.style.cursor).toBe('pointer');

    btn.click();
    expect(handlers.onToggleMyBranches).toHaveBeenCalledTimes(1);
  });

  it('选中当前分支时删除与比较按钮应该禁用', () => {
    setState(s => {
      s.selectedBranch = { name: 'main', isCurrent: true, isRemote: false };
    });
    createBar();

    const del = container.querySelector('[data-sidebar="delete"]') as HTMLElement;
    const cmp = container.querySelector('[data-sidebar="compare"]') as HTMLElement;

    expect(del.dataset.disabled).toBe('true');
    expect(del.title).toBe('当前分支不能删除');
    expect(cmp.dataset.disabled).toBe('true');
    expect(cmp.title).toBe('当前分支无法与自己比较');
  });

  it('未选中分支时删除、比较、收藏按钮应该禁用', () => {
    setState(s => { s.selectedBranch = null; });
    createBar();

    // 删除与收藏共用「请先选择分支」，比较用自身文案
    const expected: Record<string, string> = {
      delete: '请先选择分支',
      favorite: '请先选择分支',
      compare: '请先选择要比较的分支',
    };
    for (const [key, title] of Object.entries(expected)) {
      const btn = container.querySelector(`[data-sidebar="${key}"]`) as HTMLElement;
      expect(btn.dataset.disabled, `${key} 应禁用`).toBe('true');
      expect(btn.title).toBe(title);
    }
  });

  it('没有远程分支时更新与获取按钮应该禁用', () => {
    setState(s => {
      s.branches = [{ name: 'main', isCurrent: true, isRemote: false }];
      s.selectedBranch = null;
    });
    createBar();

    for (const key of ['refresh', 'fetch']) {
      const btn = container.querySelector(`[data-sidebar="${key}"]`) as HTMLElement;
      expect(btn.dataset.disabled, `${key} 应禁用`).toBe('true');
      expect(btn.title).toBe('未配置远程仓库');
    }
  });

  it('禁用按钮点击不应该触发 handler', () => {
    setState(s => { s.selectedBranch = null; });
    createBar();

    const del = container.querySelector('[data-sidebar="delete"]') as HTMLElement;
    del.click();
    expect(handlers.onDeleteBranch).not.toHaveBeenCalled();
  });

  it('选中非当前分支后删除与比较按钮应该恢复可用', () => {
    setState(s => {
      s.selectedBranch = { name: 'develop', isCurrent: false, isRemote: false };
    });
    createBar();

    const del = container.querySelector('[data-sidebar="delete"]') as HTMLElement;
    const cmp = container.querySelector('[data-sidebar="compare"]') as HTMLElement;
    expect(del.dataset.disabled).toBe('false');
    expect(cmp.dataset.disabled).toBe('false');
    expect(del.title).toBe('删除分支');
  });

  it('收藏按钮图标应该随选中分支的收藏状态切换实心与空心', () => {
    // beforeEach 选中的 develop 未收藏 → 空心星
    createBar();
    const btn = container.querySelector('[data-sidebar="favorite"]') as HTMLElement;
    expect(svgSignature(btn.innerHTML)).toEqual(svgSignature(getIcon('favoriteOutline')));

    // 收藏后 → 实心星
    setState(s => { s.favorites = new Set(['develop']); });
    expect(svgSignature(btn.innerHTML)).toEqual(svgSignature(getIcon('favorite')));

    // 取消收藏 → 回到空心
    setState(s => { s.favorites = new Set(); });
    expect(svgSignature(btn.innerHTML)).toEqual(svgSignature(getIcon('favoriteOutline')));
  });

  it('多选分支全部已收藏时收藏按钮才显示实心星', () => {
    setState(s => {
      s.selectedBranches = new Set(['develop', 'main']);
      s.favorites = new Set(['develop']);
    });
    createBar();
    const btn = container.querySelector('[data-sidebar="favorite"]') as HTMLElement;

    // 只有部分已收藏 → 空心
    expect(svgSignature(btn.innerHTML)).toEqual(svgSignature(getIcon('favoriteOutline')));

    // 全部已收藏 → 实心
    setState(s => { s.favorites = new Set(['develop', 'main']); });
    expect(svgSignature(btn.innerHTML)).toEqual(svgSignature(getIcon('favorite')));
  });

  it('选中分支后定位按钮应解除禁用（回归）', () => {
    setState(s => { s.selectedBranch = null; s.selectedBranches = new Set(); });
    createBar();
    const btn = container.querySelector('[data-sidebar="locate"]') as HTMLElement;
    expect(btn.dataset.disabled).toBe('true');

    setState(s => { s.selectedBranch = { name: 'develop', isCurrent: false, isRemote: false }; });
    expect(btn.dataset.disabled).toBe('false');
  });
});
