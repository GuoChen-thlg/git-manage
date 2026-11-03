/**
 * diff-popup 弹窗组件单元测试
 * 覆盖：参数边界、打开渲染、边缘禁用与不循环、键盘 ←/→ 切换、↑↓ 不拦截、
 * 文件列表弹层、关闭与监听解绑、buildSideBySideRows 对齐规则、空差异文件
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showDiffPopup, buildSideBySideRows } from '../components/diff-popup';
import { setLocale } from '../i18n';
import type { FileDiff, DiffLine } from '../state';

/** 获取当前弹窗覆盖层（未打开时为 null） */
function getOverlay(): HTMLElement | null {
  return document.getElementById('gm-diff-popup-overlay');
}

/** 获取工具栏路径文本 */
function getPathText(): string {
  return getOverlay()!.querySelector('.gm-diff-popup-path')!.textContent ?? '';
}

/** 获取 n/m 计数文本 */
function getCountText(): string {
  return getOverlay()!.querySelector('[data-diff-popup-count]')!.textContent ?? '';
}

/** 获取上一个文件按钮 */
function getPrevBtn(): HTMLButtonElement {
  return getOverlay()!.querySelector('[data-diff-popup-prev]') as HTMLButtonElement;
}

/** 获取下一个文件按钮 */
function getNextBtn(): HTMLButtonElement {
  return getOverlay()!.querySelector('[data-diff-popup-next]') as HTMLButtonElement;
}

/** 获取 n/m 计数元素（点击弹出文件列表） */
function getCountEl(): HTMLElement {
  return getOverlay()!.querySelector('[data-diff-popup-count]') as HTMLElement;
}

/** 获取文件列表弹层（未打开时为 null） */
function getFileList(): HTMLElement | null {
  return getOverlay()!.querySelector('.gm-diff-popup-filelist');
}

/**
 * 在 document 上派发一次键盘事件（弹窗监听挂在 document 上）
 * @param key 键名
 * @param opts 可选修饰键（altKey 等）
 * @returns 派发的事件，便于断言 defaultPrevented
 */
function pressKey(key: string, opts: { altKey?: boolean } = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    altKey: opts.altKey === true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

/** 两个变更文件的固定样例（第 2 个文件无差异行） */
const sampleDiffs: FileDiff[] = [
  {
    path: 'src/app.ts',
    additions: 3,
    deletions: 1,
    lines: [
      { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
      { type: 'add', content: 'const b = 2;', newLine: 2 },
      { type: 'delete', content: 'const c = 3;', oldLine: 2 },
    ],
  },
  {
    path: 'src/util.new.ts',
    additions: 5,
    deletions: 0,
    lines: [],
  },
];

describe('diff-popup', () => {
  beforeEach(() => {
    // 断言中文文案：固定 locale，避免受宿主环境影响
    setLocale('zh-CN');
    // 静音弹窗的调试日志，保持测试输出干净
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // 正常关闭弹窗以解绑 document 键盘监听，兜底直接移除残留节点
    const overlay = getOverlay();
    if (overlay) {
      (overlay.querySelector('[data-diff-popup-close]') as HTMLButtonElement | null)?.click();
      overlay.remove();
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('参数边界', () => {
    it('空列表与越界起始索引都不渲染 DOM，且 dispose 可安全调用', () => {
      const emptyHandle = showDiffPopup([], 0);
      expect(getOverlay()).toBeNull();
      expect(() => emptyHandle.dispose()).not.toThrow();

      const outOfRangeHandle = showDiffPopup(sampleDiffs, 99);
      expect(getOverlay()).toBeNull();
      expect(() => outOfRangeHandle.dispose()).not.toThrow();

      expect(getOverlay()).toBeNull();
    });
  });

  describe('打开渲染', () => {
    it('合法参数打开后应渲染遮罩、路径、计数与边缘按钮状态', () => {
      showDiffPopup(sampleDiffs, 0);

      const overlay = getOverlay();
      expect(overlay).toBeTruthy();
      expect(getPathText()).toBe('src/app.ts');
      expect(getCountText()).toBe('1/2');
      // 首文件：上一个禁用、下一个可用
      expect(getPrevBtn().disabled).toBe(true);
      expect(getNextBtn().disabled).toBe(false);
    });
  });

  describe('边缘禁用与不循环', () => {
    it('末尾文件 next 禁用，点击与 ArrowRight 均不切换', () => {
      showDiffPopup(sampleDiffs, 1);

      expect(getPrevBtn().disabled).toBe(false);
      expect(getNextBtn().disabled).toBe(true);

      // 绕过原生 disabled 直接派发 click，验证 step 的边缘兜底同样不切换
      getNextBtn().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(getPathText()).toBe('src/util.new.ts');
      expect(getCountText()).toBe('2/2');

      pressKey('ArrowRight');
      expect(getPathText()).toBe('src/util.new.ts');
      expect(getCountText()).toBe('2/2');
    });
  });

  describe('键盘切换', () => {
    it('ArrowRight 切到下一个文件并更新计数与 prev 可用态，ArrowLeft 回上一个', () => {
      showDiffPopup(sampleDiffs, 0);

      pressKey('ArrowRight');
      expect(getPathText()).toBe('src/util.new.ts');
      expect(getCountText()).toBe('2/2');
      expect(getPrevBtn().disabled).toBe(false);

      pressKey('ArrowLeft');
      expect(getPathText()).toBe('src/app.ts');
      expect(getCountText()).toBe('1/2');
      expect(getPrevBtn().disabled).toBe(true);
    });

    it('首文件 ArrowLeft 不切换', () => {
      showDiffPopup(sampleDiffs, 0);

      pressKey('ArrowLeft');
      expect(getPathText()).toBe('src/app.ts');
      expect(getCountText()).toBe('1/2');
    });
  });

  describe('↑↓ 不拦截', () => {
    it('ArrowUp/ArrowDown 后文件不变（按键留给内容滚动）', () => {
      showDiffPopup(sampleDiffs, 0);

      pressKey('ArrowUp');
      pressKey('ArrowDown');
      expect(getPathText()).toBe('src/app.ts');
      expect(getCountText()).toBe('1/2');
    });
  });

  describe('文件列表弹层', () => {
    it('点击计数弹出文件列表，点列表项跳转并关闭，再点计数 toggle 关闭', () => {
      showDiffPopup(sampleDiffs, 0);

      // 打开文件列表
      getCountEl().click();
      expect(getFileList()).toBeTruthy();
      const items = Array.from(
        getFileList()!.querySelectorAll('[data-diff-popup-file-index]')
      ) as HTMLElement[];
      expect(items.length).toBe(2);
      expect(items[0]!.classList.contains('gm-diff-popup-filelist-item-active')).toBe(true);
      expect(items[0]!.textContent).toBe('src/app.ts');
      expect(items[1]!.textContent).toBe('src/util.new.ts');

      // 点击第二个文件项：路径跳转到该文件且列表关闭
      items[1]!.click();
      expect(getPathText()).toBe('src/util.new.ts');
      expect(getCountText()).toBe('2/2');
      expect(getFileList()).toBeNull();

      // 再点计数：打开后再次点击应关闭
      getCountEl().click();
      expect(getFileList()).toBeTruthy();
      getCountEl().click();
      expect(getFileList()).toBeNull();
    });
  });

  describe('关闭', () => {
    it('Escape 关闭弹窗，关闭后按键监听已解绑且无残留', () => {
      showDiffPopup(sampleDiffs, 0);
      expect(getOverlay()).toBeTruthy();

      pressKey('Escape');
      expect(getOverlay()).toBeNull();

      // 关闭后再派发按键不应抛错；监听已解绑则按键不会再被弹窗消费
      expect(() => pressKey('ArrowRight')).not.toThrow();
      const ev = pressKey('ArrowRight');
      expect(ev.defaultPrevented).toBe(false);
      expect(getOverlay()).toBeNull();
    });

    it('关闭按钮应关闭弹窗，dispose 幂等', () => {
      const handle = showDiffPopup(sampleDiffs, 0);
      (getOverlay()!.querySelector('[data-diff-popup-close]') as HTMLButtonElement).click();
      expect(getOverlay()).toBeNull();

      expect(() => {
        handle.dispose();
        handle.dispose();
      }).not.toThrow();
      expect(getOverlay()).toBeNull();
    });
  });

  describe('buildSideBySideRows 对齐规则', () => {
    it('context 行应在左右两侧显示同一行', () => {
      const ctx: DiffLine = { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 };

      const rows = buildSideBySideRows([ctx]);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.left).toBe(ctx);
      expect(rows[0]!.right).toBe(ctx);
    });

    it('连续 2 delete + 1 add 应配对为 2 行，缺的一侧补位', () => {
      const d1: DiffLine = { type: 'delete', content: 'const b = 2;', oldLine: 2 };
      const d2: DiffLine = { type: 'delete', content: 'const c = 3;', oldLine: 3 };
      const a1: DiffLine = { type: 'add', content: 'const b = 9;', newLine: 2 };

      const rows = buildSideBySideRows([d1, d2, a1]);

      expect(rows).toHaveLength(2);
      expect(rows[0]!.left).toBe(d1);
      expect(rows[0]!.right).toBe(a1);
      expect(rows[1]!.left).toBe(d2);
      expect(rows[1]!.right).toBeNull();
    });

    it('孤立 add 行左侧应为补位', () => {
      const a1: DiffLine = { type: 'add', content: 'const b = 2;', newLine: 2 };

      const rows = buildSideBySideRows([a1]);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.left).toBeNull();
      expect(rows[0]!.right).toBe(a1);
    });

    it('输出顺序应与输入顺序一致', () => {
      const ctx1: DiffLine = { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 };
      const del: DiffLine = { type: 'delete', content: 'const b = 2;', oldLine: 2 };
      const add: DiffLine = { type: 'add', content: 'const b = 3;', newLine: 2 };
      const ctx2: DiffLine = { type: 'context', content: 'return a;', oldLine: 3, newLine: 3 };

      const rows = buildSideBySideRows([ctx1, del, add, ctx2]);

      expect(rows).toHaveLength(3);
      expect(rows[0]!.left).toBe(ctx1);
      expect(rows[1]!.left).toBe(del);
      expect(rows[1]!.right).toBe(add);
      expect(rows[2]!.left).toBe(ctx2);
    });
  });

  describe('空差异文件', () => {
    it('打开 lines 为空的文件时 body 应显示无差异内容', () => {
      showDiffPopup(sampleDiffs, 1);

      const body = getOverlay()!.querySelector('.gm-diff-popup-body')!;
      expect(body.querySelector('.gm-diff-popup-empty')).toBeTruthy();
      expect(body.textContent).toBe('无差异内容');
    });
  });

  describe('自动换行开关', () => {
    beforeEach(() => {
      // 每个用例从干净的持久化状态开始，避免用例间串扰
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    /** 获取自动换行开关按钮 */
    function getWrapBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-wrap]') as HTMLElement;
    }

    it('默认不开换行：body 与按钮均无激活样式', () => {
      showDiffPopup(sampleDiffs, 0);

      const overlay = getOverlay()!;
      expect(overlay.querySelector('[data-diff-popup-wrap]'), '工具栏应有自动换行按钮').toBeTruthy();
      expect(overlay.querySelector('.gm-diff-popup-body')!.classList.contains('gm-diff-popup-wrap')).toBe(false);
      expect(getWrapBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(false);
    });

    it('点击按钮应进入换行态并持久化为 1', () => {
      showDiffPopup(sampleDiffs, 0);

      getWrapBtn().click();

      const overlay = getOverlay()!;
      expect(overlay.querySelector('.gm-diff-popup-body')!.classList.contains('gm-diff-popup-wrap')).toBe(true);
      expect(getWrapBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(true);
      expect(localStorage.getItem('gm.diffPopupWrap')).toBe('1');
    });

    it('再次点击应退出换行态并持久化为 0', () => {
      showDiffPopup(sampleDiffs, 0);

      getWrapBtn().click();
      getWrapBtn().click();

      const overlay = getOverlay()!;
      expect(overlay.querySelector('.gm-diff-popup-body')!.classList.contains('gm-diff-popup-wrap')).toBe(false);
      expect(getWrapBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(false);
      expect(localStorage.getItem('gm.diffPopupWrap')).toBe('0');
    });

    it('持久化开启时打开弹窗应自动进入换行态', () => {
      localStorage.setItem('gm.diffPopupWrap', '1');

      showDiffPopup(sampleDiffs, 0);

      const overlay = getOverlay()!;
      expect(overlay.querySelector('.gm-diff-popup-body')!.classList.contains('gm-diff-popup-wrap')).toBe(true);
      expect(getWrapBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(true);
    });
  });

  describe('工具栏功能组', () => {
    beforeEach(() => {
      // 每个用例从干净的持久化状态开始，避免用例间串扰
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    /** 获取视图切换按钮 */
    function getViewBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-view]') as HTMLElement;
    }

    /** 获取忽略空白按钮 */
    function getIgnoreWsBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-ignore-ws]') as HTMLElement;
    }

    /** 获取单词高亮按钮 */
    function getHighlightBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-highlight]') as HTMLElement;
    }

    /** 获取设置按钮 */
    function getSettingsBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-settings]') as HTMLElement;
    }

    /**
     * 含配对 delete/add 行的样例：两行 token 数相等（各 1 个），
     * 避免 highlightContentWordLevel 的 LCS 回溯在配对 token 数不等时越界
     */
    const pairedDiffs: FileDiff[] = [
      {
        path: 'src/app.ts',
        additions: 1,
        deletions: 1,
        lines: [
          { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
          { type: 'delete', content: 'aaa;', oldLine: 2 },
          { type: 'add', content: 'bbb;', newLine: 2 },
        ],
      },
    ];

    it('点击视图按钮应切到单栏并持久化 unified，再点回 side', () => {
      showDiffPopup(sampleDiffs, 0);

      const body = getOverlay()!.querySelector('.gm-diff-popup-body') as HTMLElement;
      getViewBtn().click();

      expect(body.classList.contains('gm-diff-popup-unified')).toBe(true);
      expect(getViewBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(true);
      expect(localStorage.getItem('gm.diffPopupView')).toBe('unified');
      // 单栏线性渲染：左列行数 = mock diff.lines 长度，无补位
      expect(body.querySelectorAll('.gm-diff-popup-col-left .gm-diff-popup-row').length).toBe(3);
      expect(body.querySelectorAll('.gm-diff-popup-cell-empty').length).toBe(0);

      getViewBtn().click();

      expect(body.classList.contains('gm-diff-popup-unified')).toBe(false);
      expect(localStorage.getItem('gm.diffPopupView')).toBe('side');
      // 并排模式恢复补位结构
      expect(body.querySelectorAll('.gm-diff-popup-cell-empty').length).toBe(2);
    });

    it('点击忽略空白按钮应激活并持久化 1，再点回 0（无 refetch 时仅本地切换）', () => {
      showDiffPopup(sampleDiffs, 0);

      getIgnoreWsBtn().click();

      expect(getIgnoreWsBtn().classList.contains('gm-diff-popup-ignorews-btn-active')).toBe(true);
      expect(localStorage.getItem('gm.diffPopupIgnoreWs')).toBe('1');

      getIgnoreWsBtn().click();

      expect(getIgnoreWsBtn().classList.contains('gm-diff-popup-ignorews-btn-active')).toBe(false);
      expect(localStorage.getItem('gm.diffPopupIgnoreWs')).toBe('0');
    });

    it('忽略空白开启且提供 refetch 时应重拉差异并替换弹窗内数据', async () => {
      const refetched: FileDiff[] = [
        { path: 'src/only.ts', additions: 1, deletions: 0, lines: [{ type: 'add', content: 'x', newLine: 1 }] },
      ];
      const refetch = vi.fn((_ws: boolean) => Promise.resolve(refetched));
      showDiffPopup(sampleDiffs, 0, { hash: 'abc', directory: '/repo', refetch });

      getIgnoreWsBtn().click();
      // 等待 refetch promise 落地后的重渲染
      await new Promise((r) => setTimeout(r, 0));

      expect(refetch).toHaveBeenCalledWith(true);
      expect(getPathText()).toBe('src/only.ts');
      expect(getCountText()).toBe('1/1');
    });

    it('点击高亮按钮应激活并持久化 1，配对行内容出现 mark 高亮，再点回 0', () => {
      showDiffPopup(pairedDiffs, 0);

      // 默认关：无 mark
      expect(getOverlay()!.querySelectorAll('mark.gm-diff-popup-word-hl').length).toBe(0);

      getHighlightBtn().click();

      expect(getHighlightBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(true);
      expect(localStorage.getItem('gm.diffPopupHighlight')).toBe('1');
      // 配对 delete 'aaa;' / add 'bbb;' 的内容 span 内出现 mark
      const marks = getOverlay()!.querySelectorAll('.gm-diff-line-content mark.gm-diff-popup-word-hl');
      expect(marks.length).toBeGreaterThan(0);

      getHighlightBtn().click();

      expect(getHighlightBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(false);
      expect(localStorage.getItem('gm.diffPopupHighlight')).toBe('0');
      expect(getOverlay()!.querySelectorAll('mark.gm-diff-popup-word-hl').length).toBe(0);
    });

    it('点击设置按钮应弹出菜单且含显示行号项，点该项切换 hide-linenums 并持久化', () => {
      showDiffPopup(sampleDiffs, 0);

      const body = getOverlay()!.querySelector('.gm-diff-popup-body') as HTMLElement;
      getSettingsBtn().click();

      const menu = getOverlay()!.querySelector('.gm-diff-popup-settings-menu') as HTMLElement;
      expect(menu, '点设置应弹出菜单').toBeTruthy();
      const item = menu.querySelector('.gm-diff-popup-settings-item') as HTMLElement;
      expect(item, '菜单应含设置项').toBeTruthy();
      expect(item.textContent).toContain('显示行号');

      // 默认显示行号：点该项 → 隐藏并持久化 0
      item.click();
      expect(body.classList.contains('gm-diff-popup-hide-linenums')).toBe(true);
      expect(localStorage.getItem('gm.diffPopupLineNums')).toBe('0');

      // 再点该项 → 恢复显示并持久化 1
      item.click();
      expect(body.classList.contains('gm-diff-popup-hide-linenums')).toBe(false);
      expect(localStorage.getItem('gm.diffPopupLineNums')).toBe('1');
    });

    it('持久化 viewMode 为 unified 时打开弹窗应自动进入单栏', () => {
      localStorage.setItem('gm.diffPopupView', 'unified');

      showDiffPopup(sampleDiffs, 0);

      const body = getOverlay()!.querySelector('.gm-diff-popup-body') as HTMLElement;
      expect(body.classList.contains('gm-diff-popup-unified')).toBe(true);
      expect(getViewBtn().classList.contains('gm-diff-popup-wrap-btn-active')).toBe(true);
      expect(body.querySelectorAll('.gm-diff-popup-cell-empty').length).toBe(0);
    });
  });

  describe('差异导航与设置扩充', () => {
    /**
     * 含配对 delete/add 行的样例：两行无公共字符（'aaa;' ↔ 'bbb;'），
     * 行内字符级 LCS 标记后整行都会包高亮 span
     */
    const pairedDiffs: FileDiff[] = [
      {
        path: 'src/app.ts',
        additions: 1,
        deletions: 1,
        lines: [
          { type: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
          { type: 'delete', content: 'aaa;', oldLine: 2 },
          { type: 'add', content: 'bbb;', newLine: 2 },
        ],
      },
    ];

    beforeEach(() => {
      // 每个用例从干净的持久化状态开始，避免用例间串扰
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    /** 获取上一个差异按钮 */
    function getPrevChangeBtn(): HTMLButtonElement {
      return getOverlay()!.querySelector('[data-diff-popup-prev-change]') as HTMLButtonElement;
    }

    /** 获取下一个差异按钮 */
    function getNextChangeBtn(): HTMLButtonElement {
      return getOverlay()!.querySelector('[data-diff-popup-next-change]') as HTMLButtonElement;
    }

    /** 获取设置按钮 */
    function getSettingsBtn(): HTMLElement {
      return getOverlay()!.querySelector('[data-diff-popup-settings]') as HTMLElement;
    }

    /**
     * 打开设置菜单并返回菜单项文案列表
     * （设置按钮 onclick 已 stopPropagation，无需额外处理）
     */
    function openMenuAndGetLabels(): HTMLElement[] {
      getSettingsBtn().click();
      const menu = getOverlay()!.querySelector('.gm-diff-popup-settings-menu') as HTMLElement;
      expect(menu, '点设置应弹出菜单').toBeTruthy();
      return Array.from(
        menu.querySelectorAll('.gm-diff-popup-settings-item')
      ) as HTMLElement[];
    }

    it('打开弹窗后差异导航按钮存在且可用，点击下一个应高亮变更块起始行', () => {
      showDiffPopup(sampleDiffs, 0);

      const overlay = getOverlay()!;
      expect(overlay.querySelector('[data-diff-popup-prev-change]'), '工具栏应有上一个差异按钮').toBeTruthy();
      expect(overlay.querySelector('[data-diff-popup-next-change]'), '工具栏应有下一个差异按钮').toBeTruthy();
      // src/app.ts 含 add/delete 变更块：按钮应可用
      expect(getPrevChangeBtn().disabled).toBe(false);
      expect(getNextChangeBtn().disabled).toBe(false);

      getNextChangeBtn().click();

      // 块起始行（连续变更行合并锚点）应加高亮 class
      const active = overlay.querySelectorAll('.gm-diff-popup-change-active');
      expect(active.length).toBe(1);
    });

    it('连续点击差异导航不越界不循环，行为保持在锚点边界内', () => {
      showDiffPopup(sampleDiffs, 0);

      // src/app.ts 单一变更块：连点多次应始终停在唯一锚点上（不越界不报错）
      getNextChangeBtn().click();
      getNextChangeBtn().click();
      getNextChangeBtn().click();
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-change-active').length).toBe(1);

      // 上一个差异按钮：回到同一锚点后仍在边界内
      getPrevChangeBtn().click();
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-change-active').length).toBe(1);
    });

    it('Alt+ArrowDown 应与下一个差异按钮同效，高亮变更块', () => {
      showDiffPopup(sampleDiffs, 0);

      pressKey('ArrowDown', { altKey: true });
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-change-active').length).toBe(1);

      // Alt+ArrowUp 回跳：同样保持高亮在锚点行
      pressKey('ArrowUp', { altKey: true });
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-change-active').length).toBe(1);
    });

    it('设置菜单应含 3 项，点显示空白符持久化 1 且行文本出现中点，再点回 0', () => {
      showDiffPopup(sampleDiffs, 0);

      const items = openMenuAndGetLabels();
      expect(items.length).toBe(3);
      expect(items[0]!.textContent).toContain('显示行号');
      expect(items[1]!.textContent).toContain('显示空白符');
      expect(items[2]!.textContent).toContain('行内差异高亮');

      // 默认 'const a = 1;' 中的空格为原样：点「显示空白符」项 → 空格替换为 U+00B7
      items[1]!.click();
      expect(localStorage.getItem('gm.diffPopupWhitespace')).toBe('1');
      const bodyText = getOverlay()!.querySelector('.gm-diff-popup-body')!.textContent ?? '';
      expect(bodyText).toContain('\u00B7');

      // 再点该项 → 持久化回 0
      getSettingsBtn().click();
      const items2 = openMenuAndGetLabels();
      items2[1]!.click();
      expect(localStorage.getItem('gm.diffPopupWhitespace')).toBe('0');
      const bodyText2 = getOverlay()!.querySelector('.gm-diff-popup-body')!.textContent ?? '';
      expect(bodyText2).not.toContain('\u00B7');
    });

    it('点行内差异高亮持久化 1 且配对行出现字符级高亮 span，再点回 0', () => {
      showDiffPopup(pairedDiffs, 0);

      // 默认关：无字符级高亮
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-char-hl').length).toBe(0);

      const items = openMenuAndGetLabels();
      items[2]!.click();
      expect(localStorage.getItem('gm.diffPopupInline')).toBe('1');
      // 配对 delete 'aaa;' ↔ add 'bbb;' 行内容出现字符级高亮 span
      const spans = getOverlay()!.querySelectorAll('.gm-diff-popup-char-hl');
      expect(spans.length).toBeGreaterThan(0);

      // 再点该项 → 持久化回 0 且高亮消失
      getSettingsBtn().click();
      const items2 = openMenuAndGetLabels();
      items2[2]!.click();
      expect(localStorage.getItem('gm.diffPopupInline')).toBe('0');
      expect(getOverlay()!.querySelectorAll('.gm-diff-popup-char-hl').length).toBe(0);
    });
  });
});
