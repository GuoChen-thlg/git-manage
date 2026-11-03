/**
 * file-diff 组件单元测试
 * 覆盖：空态、setState 触发 diffs 变化后的文件列表渲染、点击文件打开 diff 弹窗、
 * hover/右键交互、dispose 行为
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFileDiffPanel } from '../components/file-diff';
import { setState, createInitialState, stateManager } from '../state';
import type { FileDiff } from '../state';
import type { ServiceClient } from '../service';
import {
  expectThemedClass,
} from './theme-helpers';

/** 已创建组件的清理列表（afterEach 依次 dispose） */
let disposers: Array<() => void> = [];

/**
 * 构造 service 占位 mock
 * file-diff 仅在右键菜单中把 service 透传出去，本测试不触发右键菜单
 */
function createServiceMock(): ServiceClient {
  return {} as unknown as ServiceClient;
}

/** 获取标题元素（container 第一个子元素） */
function getTitle(container: HTMLElement): HTMLElement {
  return container.children[0] as HTMLElement;
}

/** 获取标题中的计数文本 */
function getTitleCount(container: HTMLElement): string {
  return getTitle(container).querySelector('span')?.textContent ?? '';
}

/** 获取文件列表容器（container 第二个子元素：标题 + 列表） */
function getListContainer(container: HTMLElement): HTMLElement {
  return container.children[1] as HTMLElement;
}

/** 获取 diff 弹窗覆盖层（未打开时为 null） */
function getPopupOverlay(): HTMLElement | null {
  return document.getElementById('gm-diff-popup-overlay');
}

/**
 * 关闭可能残留的 diff 弹窗
 * 先按 Escape 走正常关闭（解绑弹窗的 document 键盘监听），兜底直接移除节点，避免污染后续用例
 */
function closeDiffPopup(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  getPopupOverlay()?.remove();
}

/** 创建面板并登记清理 */
function createPanel(): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const panel = createFileDiffPanel(container, createServiceMock(), '/repo');
  disposers.push(panel.dispose);
  return { container, dispose: panel.dispose };
}

/**
 * 派发不冒泡的悬停事件
 * mouseenter/mouseleave 不冒泡，必须在子元素上派发，父容器的捕获阶段监听器才会执行
 */
function dispatchMouse(el: HTMLElement, type: 'mouseenter' | 'mouseleave'): void {
  el.dispatchEvent(new MouseEvent(type, { bubbles: false }));
}

/**
 * 捕获事件监听器内部抛出的异常
 * jsdom 不会把监听器异常抛给事件派发者，只会触发 window 的 error 事件，
 * 这里阻止其上报并收集，便于断言“原实现不应抛错”
 */
function captureListenerErrors(): { errors: Error[]; restore: () => void } {
  const errors: Error[] = [];
  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    errors.push(event.error as Error);
  };
  window.addEventListener('error', onError);
  return { errors, restore: () => window.removeEventListener('error', onError) };
}

/** 派发一次右键菜单事件并返回该事件（用于断言 defaultPrevented） */
function dispatchContextMenu(el: HTMLElement): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 10,
    clientY: 20,
  });
  el.dispatchEvent(event);
  return event;
}

/** 获取状态管理器内部的监听器集合（用于断言订阅是否被解除） */
function getListenerSet(): Set<unknown> {
  return (stateManager as unknown as { listeners: Set<unknown> }).listeners;
}

/** 两个变更文件的固定样例 */
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

/** 覆盖各状态标记规则的差异文件路径（顺序与 expectedStatus 一一对应） */
const statusDiffs: FileDiff[] = [
  { path: 'src/marker.new.ts', additions: 1, deletions: 0, lines: [] },
  { path: 'src/marker.added.ts', additions: 2, deletions: 0, lines: [] },
  { path: 'src/marker.deleted.ts', additions: 0, deletions: 1, lines: [] },
  { path: 'src/marker.removed.ts', additions: 0, deletions: 2, lines: [] },
  { path: 'src/marker.modified.ts', additions: 3, deletions: 1, lines: [] },
  { path: 'src/marker.changed.ts', additions: 4, deletions: 1, lines: [] },
  { path: 'src/marker.renamed.ts', additions: 1, deletions: 1, lines: [] },
  // 无任何标记：走兜底返回 'M'
  { path: 'src/plain.ts', additions: 5, deletions: 2, lines: [] },
  // 同时命中 .modified. 与 .renamed.：应以先命中的 .modified. 为准
  { path: 'src/mixed.modified.renamed.ts', additions: 6, deletions: 3, lines: [] },
];

/** 各路径期望的状态标记与 class 后缀 */
const expectedStatus: Array<[string, string]> = [
  ['A', 'gm-file-diff-status-add'],
  ['A', 'gm-file-diff-status-add'],
  ['D', 'gm-file-diff-status-del'],
  ['D', 'gm-file-diff-status-del'],
  ['M', 'gm-file-diff-status-mod'],
  ['M', 'gm-file-diff-status-mod'],
  ['R', 'gm-file-diff-status-ren'],
  ['M', 'gm-file-diff-status-mod'],
  ['M', 'gm-file-diff-status-mod'],
];


describe('file-diff', () => {
  beforeEach(() => {
    // 重置全局状态
    setState(s => Object.assign(s, createInitialState()));
  });

  afterEach(() => {
    // 清理组件订阅与残留 DOM
    for (const dispose of disposers) dispose();
    disposers = [];
    // 关闭可能残留的 diff 弹窗（含其 document 键盘监听）
    closeDiffPopup();
    document.body.innerHTML = '';
  });

  describe('空态', () => {
    it('初始 diffs 为空时应该显示标题计数 0 与列表空态', () => {
      const { container } = createPanel();

      expect(getTitle(container).textContent).toContain('变更文件');
      expect(getTitleCount(container)).toBe('0');
      expect(getListContainer(container).textContent).toContain('暂无变更文件');
      expect(getListContainer(container).querySelectorAll('[data-path]').length).toBe(0);
      // 页内预览已移除：不应存在预览节点
      expect(container.querySelector('.gm-file-diff-preview')).toBeNull();
    });
  });

  describe('diffs 变化渲染文件列表', () => {
    it('setState 写入 diffs 后应该渲染文件列表并更新标题计数', () => {
      const { container } = createPanel();

      setState(s => {
        s.diffs = sampleDiffs;
      });

      expect(getTitleCount(container)).toBe('2');

      const items = getListContainer(container).querySelectorAll('[data-path]');
      expect(items.length).toBe(2);

      const first = items[0] as HTMLElement;
      expect(first.getAttribute('data-path')).toBe('src/app.ts');
      expect(first.textContent).toContain('src/app.ts');
      expect(first.textContent).toContain('+3');
      expect(first.textContent).toContain('-1');

      const second = items[1] as HTMLElement;
      expect(second.getAttribute('data-path')).toBe('src/util.new.ts');
      expect(second.textContent).toContain('+5');
    });

    it('diffs 清空后应该回到列表空态且标题计数归零', () => {
      const { container } = createPanel();

      setState(s => {
        s.diffs = sampleDiffs;
      });
      expect(getTitleCount(container)).toBe('2');

      setState(s => {
        s.diffs = [];
      });
      expect(getTitleCount(container)).toBe('0');
      expect(getListContainer(container).textContent).toContain('暂无变更文件');
      expect(getListContainer(container).querySelectorAll('[data-path]').length).toBe(0);
    });
  });

  describe('点击文件打开 diff 弹窗', () => {
    it('点击文件条目应打开弹窗并展示该文件路径与计数', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const item = getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement;
      item.click();

      const overlay = getPopupOverlay();
      expect(overlay).toBeTruthy();
      expect(overlay!.querySelector('.gm-diff-popup-path')!.textContent).toBe('src/app.ts');
      expect(overlay!.querySelector('[data-diff-popup-count]')!.textContent).toBe('1/2');
      // 首文件：上一个禁用、下一个可用
      expect((overlay!.querySelector('[data-diff-popup-prev]') as HTMLButtonElement).disabled).toBe(true);
      expect((overlay!.querySelector('[data-diff-popup-next]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('弹窗应按并排结构渲染差异行前缀、内容与行号', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const item = getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement;
      item.click();

      const overlay = getPopupOverlay()!;
      // sampleDiffs[0] 三行（context/add/delete）：双列结构，左列 3 行 + 右列 3 行
      const rowsLeft = Array.from(overlay.querySelectorAll('.gm-diff-popup-col-left .gm-diff-popup-row')) as HTMLElement[];
      const rowsRight = Array.from(overlay.querySelectorAll('.gm-diff-popup-col-right .gm-diff-popup-row')) as HTMLElement[];
      expect(rowsLeft.length).toBe(3);
      expect(rowsRight.length).toBe(3);

      // 第 1 行：context 左右同显；左列只显示旧行号，右列只显示新行号
      const ctxLeft = rowsLeft[0]!.children[0]!.querySelector('.gm-diff-line') as HTMLElement;
      const ctxRight = rowsRight[0]!.children[0]!.querySelector('.gm-diff-line') as HTMLElement;
      expect(ctxLeft.children[0].textContent).toBe('1');
      expect(ctxLeft.children[1].textContent).toBe(' ');
      expect(ctxLeft.children[2].textContent).toBe(' ');
      expect(ctxLeft.children[3].textContent).toBe('const a = 1;');
      expect(ctxRight.children[0].textContent).toBe(' ');
      expect(ctxRight.children[1].textContent).toBe('1');
      expect(ctxRight.children[2].textContent).toBe(' ');
      expect(ctxRight.children[3].textContent).toBe('const a = 1;');
      expectThemedClass(ctxLeft, 'gm-diff-line-context');
      expectThemedClass(ctxRight, 'gm-diff-line-context');

      // 第 2 行：左侧补位、右侧 add（前缀 +、只有新侧行号）
      expect(rowsLeft[1]!.children[0]!.querySelector('.gm-diff-popup-cell-empty')).toBeTruthy();
      const addLine = rowsRight[1]!.children[0]!.querySelector('.gm-diff-line') as HTMLElement;
      expect(addLine.children[0].textContent).toBe(' ');
      expect(addLine.children[1].textContent).toBe('2');
      expect(addLine.children[2].textContent).toBe('+');
      expect(addLine.children[3].textContent).toBe('const b = 2;');
      expectThemedClass(addLine, 'gm-diff-line-add');

      // 第 3 行：左侧 delete（前缀 -、只有旧行号）、右侧补位
      const delLine = rowsLeft[2]!.children[0]!.querySelector('.gm-diff-line') as HTMLElement;
      expect(delLine.children[0].textContent).toBe('2');
      expect(delLine.children[1].textContent).toBe(' ');
      expect(delLine.children[2].textContent).toBe('-');
      expect(delLine.children[3].textContent).toBe('const c = 3;');
      expectThemedClass(delLine, 'gm-diff-line-delete');
      expect(rowsRight[2]!.children[0]!.querySelector('.gm-diff-popup-cell-empty')).toBeTruthy();
    });

    it('差异文件没有行内容时弹窗应显示无差异内容', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const item = getListContainer(container).querySelector('[data-path="src/util.new.ts"]') as HTMLElement;
      item.click();

      const overlay = getPopupOverlay()!;
      expect(overlay.querySelector('.gm-diff-popup-path')!.textContent).toBe('src/util.new.ts');
      expect(overlay.querySelector('.gm-diff-popup-body')!.textContent).toContain('无差异内容');
    });

    it('diffs 再次变化时应更新标题计数并重绘文件列表', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      (getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement).click();
      expect(getPopupOverlay()).toBeTruthy();

      // diffs 引用变化触发订阅：标题计数与文件列表局部更新
      setState(s => {
        s.diffs = [sampleDiffs[1]];
      });
      expect(getTitleCount(container)).toBe('1');
      const items = getListContainer(container).querySelectorAll('[data-path]');
      expect(items.length).toBe(1);
      expect((items[0] as HTMLElement).getAttribute('data-path')).toBe('src/util.new.ts');
    });
  });

  describe('dispose', () => {
    it('dispose 后应该不再响应 diffs 变化', () => {
      const { container, dispose } = createPanel();
      setState(s => {
        s.diffs = [sampleDiffs[0]];
      });
      expect(getTitleCount(container)).toBe('1');

      dispose();
      setState(s => {
        s.diffs = [sampleDiffs[1]];
      });

      // 订阅已取消：DOM 保持 dispose 前的内容
      expect(getTitleCount(container)).toBe('1');
      expect(getListContainer(container).querySelector('[data-path="src/app.ts"]')).toBeTruthy();
      expect(getListContainer(container).querySelector('[data-path="src/util.new.ts"]')).toBeNull();
    });

    it('dispose 后应解除状态订阅，避免监听器泄漏', () => {
      const listeners = getListenerSet();
      const base = listeners.size;

      const { dispose } = createPanel();
      expect(listeners.size).toBe(base + 1);

      dispose();
      expect(listeners.size).toBe(base);
    });
  });

  describe('渲染结构清理', () => {
    it('渲染面板时应先清空容器再插入标题与列表', () => {
      const { container } = createPanel();

      // 清空后再插入：只应有标题、列表两个节点，不应残留占位文本节点
      expect(container.childNodes.length).toBe(2);
      expect(container.firstChild).toBe(getTitle(container));
    });

    it('点击文件后不应在页内产生预览节点', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      (getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement).click();

      // 页内预览已移除：容器仍只有标题 + 列表两个子节点，差异内容由弹窗承载（挂在 body 下）
      expect(container.childNodes.length).toBe(2);
      expect(container.querySelector('.gm-file-diff-preview')).toBeNull();
      expect(getPopupOverlay()).toBeTruthy();
    });

    it('文件列表重绘时应先清空旧条目再插入新条目', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const list = getListContainer(container);
      expect(list.childNodes.length).toBe(2);
      expect(list.firstChild).toBe(list.children[0]);
    });
  });

  describe('状态标记与颜色', () => {
    it('不同状态标记的文件应渲染对应标记字符与颜色', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = statusDiffs;
      });

      const items = getListContainer(container).querySelectorAll('[data-path]');
      expect(items.length).toBe(statusDiffs.length);

      items.forEach((item, index) => {
        const statusSpan = (item as HTMLElement).children[0] as HTMLElement;
        const [label, cls] = expectedStatus[index];
        expect(statusSpan.textContent).toBe(label);
        expectThemedClass(statusSpan, cls);
      });
    });
  });

  describe('差异行颜色', () => {
    it('弹窗内上下文行、新增行、删除行应分别渲染各自的前景色', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      (getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement).click();

      const overlay = getPopupOverlay()!;
      const contextLine = overlay.querySelector('.gm-diff-popup-cell-left .gm-diff-line-context') as HTMLElement;
      const addLine = overlay.querySelector('.gm-diff-popup-cell-right .gm-diff-line-add') as HTMLElement;
      const deleteLine = overlay.querySelector('.gm-diff-popup-cell-left .gm-diff-line-delete') as HTMLElement;

      expect(contextLine).toBeTruthy();
      expect(addLine).toBeTruthy();
      expect(deleteLine).toBeTruthy();
      expectThemedClass(contextLine, 'gm-diff-line-context');
      expectThemedClass(addLine, 'gm-diff-line-add');
      expectThemedClass(deleteLine, 'gm-diff-line-delete');
    });
  });

  describe('鼠标悬停交互', () => {
    it('鼠标移入文件条目应高亮，移入列表空白处不应抛错', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const list = getListContainer(container);
      const item = list.querySelector('[data-path="src/app.ts"]') as HTMLElement;
      const { errors, restore } = captureListenerErrors();

      try {
        dispatchMouse(item, 'mouseenter');
        expect(item.classList.contains('gm-file-diff-item-hover')).toBe(true);

        // 目标没有 data-path：原实现应直接跳过，既不抛错也不改样式
        dispatchMouse(list, 'mouseenter');
        expect(errors).toHaveLength(0);
        expect(item.classList.contains('gm-file-diff-item-hover')).toBe(true);
      } finally {
        restore();
      }
    });

    it('鼠标移出选中与未选中条目应分别渲染选中色与透明', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const list = getListContainer(container);
      const selected = list.querySelector('[data-path="src/app.ts"]') as HTMLElement;
      const other = list.querySelector('[data-path="src/util.new.ts"]') as HTMLElement;
      const { errors, restore } = captureListenerErrors();

      try {
        // 未选中条目：悬停高亮后移出应恢复
        dispatchMouse(other, 'mouseenter');
        expect(other.classList.contains('gm-file-diff-item-hover')).toBe(true);
        dispatchMouse(other, 'mouseleave');
        expect(other.classList.contains('gm-file-diff-item-hover')).toBe(false);
        expect(other.classList.contains('gm-file-diff-item-selected')).toBe(false);

        // 选中条目：移出后保持选中态
        selected.click();
        dispatchMouse(selected, 'mouseenter');
        expect(selected.classList.contains('gm-file-diff-item-hover')).toBe(true);
        dispatchMouse(selected, 'mouseleave');
        expect(selected.classList.contains('gm-file-diff-item-selected')).toBe(true);

        // 列表空白处：目标没有 data-path，不应抛错
        dispatchMouse(list, 'mouseleave');
        expect(errors).toHaveLength(0);
      } finally {
        restore();
      }
    });
  });

  describe('点击交互', () => {
    it('点击条目应高亮选中项并把其他条目设为透明', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const list = getListContainer(container);
      const first = list.querySelector('[data-path="src/app.ts"]') as HTMLElement;
      const second = list.querySelector('[data-path="src/util.new.ts"]') as HTMLElement;
      const { errors, restore } = captureListenerErrors();

      try {
        first.click();

        expect(errors).toHaveLength(0);
        expect(first.classList.contains('gm-file-diff-item-selected')).toBe(true);
        expect(second.classList.contains('gm-file-diff-item-selected')).toBe(false);
      } finally {
        restore();
      }
    });

    it('点击列表空白处不应打开弹窗且保持高亮不变', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const list = getListContainer(container);
      const first = list.querySelector('[data-path="src/app.ts"]') as HTMLElement;
      first.click();
      // 先关闭条目点击打开的弹窗，隔离"空白处不打开弹窗"的断言
      closeDiffPopup();

      const { errors, restore } = captureListenerErrors();
      try {
        // 目标没有 data-path：findPathFromEvent 应返回 null 并跳过整个分支
        list.click();

        expect(errors).toHaveLength(0);
        expect(getPopupOverlay()).toBeNull();
        expect(first.classList.contains('gm-file-diff-item-selected')).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('右键菜单', () => {
    it('右键文件条目应阻止默认行为并弹出文件菜单', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      const item = getListContainer(container).querySelector('[data-path="src/app.ts"]') as HTMLElement;
      const { errors, restore } = captureListenerErrors();

      try {
        const event = dispatchContextMenu(item);

        expect(errors).toHaveLength(0);
        expect(event.defaultPrevented).toBe(true);
        expect(document.getElementById('git-file-context-menu')).toBeTruthy();
      } finally {
        restore();
      }
    });

    it('右键找不到对应差异记录的路径时不应弹出菜单', () => {
      const { container } = createPanel();
      setState(s => {
        s.diffs = sampleDiffs;
      });

      // DOM 中残留了已被移出 diffs 的条目
      const list = getListContainer(container);
      const ghost = document.createElement('div');
      ghost.setAttribute('data-path', 'ghost/removed.ts');
      list.appendChild(ghost);

      const { errors, restore } = captureListenerErrors();
      try {
        const event = dispatchContextMenu(ghost);

        expect(errors).toHaveLength(0);
        // 路径非空仍会阻止默认行为
        expect(event.defaultPrevented).toBe(true);
        expect(document.getElementById('git-file-context-menu')).toBeNull();
      } finally {
        restore();
      }
    });

    it('右键列表空白处不应阻止默认行为也不弹菜单', () => {
      const { container } = createPanel();

      const list = getListContainer(container);
      const { errors, restore } = captureListenerErrors();
      try {
        const event = dispatchContextMenu(list);

        expect(errors).toHaveLength(0);
        expect(event.defaultPrevented).toBe(false);
        expect(document.getElementById('git-file-context-menu')).toBeNull();
      } finally {
        restore();
      }
    });
  });
});
