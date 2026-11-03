/**
 * 变更文件 diff 弹窗（IDEA 风格并排对比）
 * 从 script.ts 原样迁移。
 * 交互对齐 OpenChamber 面板：全屏遮罩 + 居中对话框，工具栏为 路径 + ‹ n/m › + ×；
 * 边缘禁用不循环；键盘 ←/→ 切换文件、↑/↓ 不拦截（交给内容滚动）、Escape 先关列表再关弹窗。
 */

import { el, logDebug, logError } from './dom';
import { call } from './messaging';
import { iconSvg } from './icons';
import { visualizeWhitespace } from './whitespace';
import type { DiffLine, FileDiff } from './protocol';

/** 弹窗遮罩元素 id（单例，重复打开时先关旧的） */
const DIFF_POPUP_OVERLAY_ID = 'diff-popup-overlay';
/** 当前打开弹窗的关闭函数（loadDetail 重载时据此关掉过期弹窗） */
let activeDiffClose: (() => void) | null = null;

/**
 * 关闭当前打开的弹窗（loadDetail 重载详情时调用）
 */
export function closeActiveDiffPopup(): void {
  if (activeDiffClose) activeDiffClose();
}

/**
 * 把 unified diff 行序列对齐成并排两列行
 * context 行两侧同显；一个变更块 = 连续 delete 后紧跟连续 add，按索引配对
 * max(deletes, adds) 行、缺侧 null 补位；孤立 delete/add 单侧输出
 * @param lines 单个文件的差异行（标准 unified diff 顺序）
 * @returns 与输入等序的并排对齐行数组
 */
export function buildSideBySideRows(lines: DiffLine[]): Array<{ left: DiffLine | null; right: DiffLine | null }> {
  const rows: Array<{ left: DiffLine | null; right: DiffLine | null }> = [];
  if (!lines || lines.length === 0) return rows;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // 上下文行：左右同显
    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i += 1;
      continue;
    }

    // 变更块：连续 delete 后紧跟连续 add，按索引配对
    if (line.type === 'delete') {
      const deletes: DiffLine[] = [];
      while (i < lines.length && lines[i]!.type === 'delete') {
        deletes.push(lines[i]!);
        i += 1;
      }
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i]!.type === 'add') {
        adds.push(lines[i]!);
        i += 1;
      }
      const count = Math.max(deletes.length, adds.length);
      for (let k = 0; k < count; k += 1) {
        rows.push({
          left: k < deletes.length ? deletes[k]! : null,
          right: k < adds.length ? adds[k]! : null,
        });
      }
      continue;
    }

    // 孤立 add（前面无 delete 块）：仅右侧有内容
    rows.push({ left: null, right: line });
    i += 1;
  }

  return rows;
}

/**
 * 渲染空白补位行（该侧无对应内容），三个 span 全空
 * @returns 占位行元素（含 diff-popup-cell-empty 标记）
 */
function createDiffPopupPlaceholder(): HTMLElement {
  const line = el('div', 'diff-line diff-popup-cell-empty');
  line.appendChild(el('span', 'ln', ''));
  line.appendChild(el('span', 'ln', ''));
  line.appendChild(el('span', 'code', ''));
  return line;
}

/** 弹窗设置「显示空白符」当前值：render 时由 prefs 同步（模块级，行构建函数读取） */
let diffPopupShowWhitespace = false;

/**
 * 把文本按单词/空白/标点切 token
 * @param text 原始文本
 * @returns token 数组（按出现顺序拼接可还原原文本）
 */
export function tokenizeDiffLine(text: string | null | undefined): string[] {
  return String(text == null ? '' : text).match(/[\w]+|\s+|[^\w\s]+/g) || [];
}

/**
 * 求两个 token 序列的最长公共子序列（DP，行内 token 数一般 <100，O(n*m) 可接受）
 * @param a token 数组
 * @param b token 数组
 * @returns 长度表（用于回溯标记匹配位置）
 */
export function lcsTable(a: string[], b: string[][] | string[]): number[][] {
  const table: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) {
    table.push(new Array(b.length + 1).fill(0));
  }
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] = a[i] === b[j]
        ? table[i + 1]![j + 1]! + 1
        : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  return table;
}

/** 单词级高亮结果：old/new 两侧各自的节点数组（textNode 或 mark 元素） */
interface WordDiffNodes { oldNodes: Node[]; newNodes: Node[] }

/**
 * 单词级差异高亮：对配对的 delete/add 行内容做 token 级 LCS，
 * 未匹配的 token 包 mark（diff-popup-word-hl），匹配 token 保留纯文本。
 * 全部用 DOM API 构建，不拼 HTML 字符串。
 * 两侧标记由一次回溯同时产出（保证保留序列严格一致）。
 * @param oldText 旧行文本
 * @param newText 新行文本
 * @returns { oldNodes, newNodes } 两侧节点数组
 */
export function highlightWordDiff(oldText: string, newText: string): WordDiffNodes {
  const a = tokenizeDiffLine(oldText);
  const b = tokenizeDiffLine(newText);
  const table = lcsTable(a, b);
  // 一次正向回溯同时标两侧：匹配 token 双侧保留，否则各自标记并前进
  const markA = new Array<boolean>(a.length);
  const markB = new Array<boolean>(b.length);
  for (let i = 0; i < a.length; i += 1) markA[i] = true;
  for (let j = 0; j < b.length; j += 1) markB[j] = true;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      markA[i] = false;
      markB[j] = false;
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      i += 1;
    } else {
      j += 1;
    }
  }

  /**
   * tokens+标记转 DOM 节点数组：标记项建 mark 元素，其余建 textNode
   * @param tokens 本侧 token
   * @param marks 标记位
   * @returns 节点数组
   */
  function toNodes(tokens: string[], marks: boolean[]): Node[] {
    const nodes: Node[] = [];
    for (let k = 0; k < tokens.length; k += 1) {
      if (marks[k]) {
        const mark = document.createElement('mark');
        mark.className = 'diff-popup-word-hl';
        // 显示空白符开启时，mark 内文本同样做空白可视化
        mark.textContent = diffPopupShowWhitespace
          ? visualizeWhitespace(tokens[k]) : tokens[k];
        nodes.push(mark);
      } else {
        nodes.push(document.createTextNode(diffPopupShowWhitespace
          ? visualizeWhitespace(tokens[k]!) : tokens[k]!));
      }
    }
    return nodes;
  }

  return { oldNodes: toNodes(a, markA), newNodes: toNodes(b, markB) };
}

/**
 * 行内字符级差异：对配对 delete/add 行文本做字符级 LCS，
 * 未匹配字符段包 span（diff-popup-char-hl），匹配段保留纯文本节点。
 * 全部 DOM API 构建，不拼 HTML 字符串。
 * @param text 本侧文本
 * @param otherText 对侧文本
 * @returns 节点数组（textNode / span 元素）
 */
export function highlightCharDiff(text: string | null | undefined, otherText: string | null | undefined): Node[] {
  // JS 字符串按 UTF-16 code unit 逐字符切分，emoji/生僻字会按代理对拆开，
  // 但 diff 场景两侧同错同标，视觉可接受；LCS DP 表按字符数建（行一般 <500 字符）
  const a = String(text == null ? '' : text).split('');
  const b = String(otherText == null ? '' : otherText).split('');
  const table = lcsTable(a, b);

  // 回溯标记本侧未匹配字符（mark 数组与 a 对齐）
  const marks = new Array<boolean>(a.length);
  for (let k = 0; k < a.length; k += 1) marks[k] = true;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      marks[i] = false;
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      i += 1;
    } else {
      j += 1;
    }
  }

  // 连续同态字符段合并成一个节点，减少 DOM 数量
  const nodes: Node[] = [];
  let seg = '';
  let segMark = false;
  function flush() {
    if (seg === '') return;
    const segText = diffPopupShowWhitespace ? visualizeWhitespace(seg) : seg;
    if (segMark) {
      const span = document.createElement('span');
      span.className = 'diff-popup-char-hl';
      span.textContent = segText;
      nodes.push(span);
    } else {
      nodes.push(document.createTextNode(segText));
    }
    seg = '';
  }
  for (let k = 0; k < a.length; k += 1) {
    if (marks[k] !== segMark) {
      flush();
      segMark = marks[k]!;
    }
    seg += a[k];
  }
  flush();
  return nodes;
}

/** 弹窗设置「行内差异高亮」当前值：render 时由 prefs 同步（模块级，行构建函数读取） */
// 保留赋值与同步（与原实现一致）；lint 不报未读：applyCharHighlight 分支读取前的行为由 render 控制
let diffPopupInlineDiff = false;
void diffPopupInlineDiff;

/**
 * 在 token 高亮节点数组内部做字符级差异标记（叠加 inlineDiff）
 * @param nodes highlightWordDiff 产出的节点数组（textNode/mark）
 * @param text 本侧原始文本
 * @param otherText 对侧原始文本
 * @returns 新节点数组：mark 内不同字符包 diff-popup-char-hl span，其余原样
 */
export function applyCharHighlight(nodes: Node[], text: string, otherText: string): Node[] {
  if (!nodes || !nodes.length) return nodes;
  // token 顺序拼接即还原原文本，逐节点与原文切片对应
  let pos = 0;
  const out: Node[] = [];
  nodes.forEach(function (node) {
    const nodeText = String((node as HTMLElement).textContent == null ? '' : (node as HTMLElement).textContent);
    if ((node as HTMLElement).tagName === 'MARK') {
      // mark 内做字符级 LCS：本侧片段对整体对侧文本求差异
      const inner = highlightCharDiff(
        String(text).slice(pos, pos + nodeText.length), otherText);
      (node as HTMLElement).textContent = '';
      inner.forEach(function (n) { (node as HTMLElement).appendChild(n); });
      out.push(node);
    } else {
      out.push(node);
    }
    pos += nodeText.length;
  });
  return out;
}

/**
 * 渲染并排弹窗某一侧的差异行
 * 左 cell：[旧行号, 空, 内容]，type 取 context/delete；
 * 右 cell：[空, 新行号, 内容]，type 取 context/add
 * 行内容为纯文本（不注入 HTML）；传入 wordNodes 时用其节点替换纯文本内容
 * @param line 差异行
 * @param side 所在侧（left/right）
 * @param wordNodes 可选：单词级高亮节点数组（textNode/mark），传入时替换内容 span 的纯文本
 * @returns 差异行元素
 */
function createDiffPopupLine(line: DiffLine, side: 'left' | 'right', wordNodes?: Node[]): HTMLElement {
  let lineClass: string;
  let oldNum = '';
  let newNum = '';
  if (side === 'left') {
    // 左列只会出现 context/delete 行
    lineClass = line.type === 'delete' ? 'diff-line delete' : 'diff-line context';
    oldNum = line.oldLine != null ? String(line.oldLine) : '';
  } else {
    // 右列只会出现 context/add 行
    lineClass = line.type === 'add' ? 'diff-line add' : 'diff-line context';
    newNum = line.newLine != null ? String(line.newLine) : '';
  }
  const row = el('div', lineClass);
  row.appendChild(el('span', 'ln', oldNum));
  row.appendChild(el('span', 'ln', newNum));
  const code = el('span', 'code', '');
  if (wordNodes && wordNodes.length) {
    wordNodes.forEach(function (n) { code.appendChild(n); });
  } else if (diffPopupShowWhitespace) {
    code.textContent = visualizeWhitespace(line.content);
  } else {
    code.textContent = line.content;
  }
  row.appendChild(code);
  return row;
}

/**
 * 渲染一个 50% 宽的单元格；line 为 null 时渲染空白补位行
 * @param line 该侧的差异行，null 表示补位
 * @param side 所在侧（left/right）
 * @returns 单元格元素
 */
function createDiffPopupCell(line: DiffLine | null, side: 'left' | 'right'): HTMLElement {
  // 背景铺满整栏：type 修饰 class 打在 cell 层（cell 宽=列宽），.diff-line 只作内容层；
  // 弹窗作用域内 .diff-line 自身背景由 CSS 关掉，避免 max-content 行宽导致背景止于文本
  let typeClass = '';
  if (line) {
    if (line.type === 'add') typeClass = ' diff-popup-line-add';
    else if (line.type === 'delete') typeClass = ' diff-popup-line-delete';
  }
  const cell = el('div', 'diff-popup-cell diff-popup-cell-' + side + typeClass);
  cell.appendChild(line ? createDiffPopupLine(line, side) : createDiffPopupPlaceholder());
  return cell;
}

/**
 * 单栏（unified）模式渲染一行：线性序列，span 顺序统一 [旧行号, 新行号, 内容]
 * delete 行显示旧行号（新行号位空）、add 行显示新行号（旧行号位空）、context 双行号
 * @param line 差异行（context/delete/add）
 * @returns 差异行元素
 */
function createDiffPopupUnifiedLine(line: DiffLine): HTMLElement {
  let lineClass: string;
  let oldNum = '';
  let newNum = '';
  if (line.type === 'delete') {
    lineClass = 'diff-line delete';
    oldNum = line.oldLine != null ? String(line.oldLine) : '';
  } else if (line.type === 'add') {
    lineClass = 'diff-line add';
    newNum = line.newLine != null ? String(line.newLine) : '';
  } else {
    lineClass = 'diff-line context';
    oldNum = line.oldLine != null ? String(line.oldLine) : '';
    newNum = line.newLine != null ? String(line.newLine) : '';
  }
  const row = el('div', lineClass);
  row.appendChild(el('span', 'ln', oldNum));
  row.appendChild(el('span', 'ln', newNum));
  const code = el('span', 'code',
    diffPopupShowWhitespace ? visualizeWhitespace(line.content) : line.content);
  row.appendChild(code);
  return row;
}

/** 弹窗偏好集合 */
interface DiffPrefs {
  wrap: boolean;
  viewMode: 'side' | 'unified';
  ignoreWs: boolean;
  highlightWords: boolean;
  showLineNums: boolean;
  showWhitespace: boolean;
  inlineDiff: boolean;
}

/**
 * 打开 IDEA 风格文件 diff 并排弹窗
 * 参数非法（空列表或起始索引越界）时只记日志，不渲染任何 DOM；
 * 合法调用时按单例规则先关闭上一个弹窗
 * @param diffs 变更文件列表
 * @param startIndex 起始展示的文件索引
 * @param commitHash 所属提交 hash（忽略空白开关重拉数据用；可空）
 * @returns 关闭函数（幂等）；参数非法时返回 null
 */
export function showDiffPopup(diffs: FileDiff[], startIndex: number, commitHash?: string | null): (() => void) | null {
  if (!diffs || diffs.length === 0 || startIndex < 0 || startIndex >= diffs.length) {
    logDebug('diff-popup', 'invalid_args', {
      count: diffs ? diffs.length : 0,
      startIndex: startIndex,
    });
    return null;
  }

  // 单例：重复打开先关旧的（activeDiffClose 解绑旧监听，兜底按 id 移除残留 DOM）
  if (activeDiffClose) activeDiffClose();
  const stale = document.getElementById(DIFF_POPUP_OVERLAY_ID);
  if (stale) stale.remove();

  let closed = false;
  /** 当前展示的文件索引 */
  let currentIndex = startIndex;
  /** 文件列表弹层元素（null 表示未打开） */
  let filelistEl: HTMLElement | null = null;
  /** 文件列表打开期间的 document 点击监听（关闭列表时解绑） */
  let onFilelistDocClick: ((ev: MouseEvent) => void) | null = null;
  /** 设置菜单弹层元素（null 表示未打开） */
  let settingsEl: HTMLElement | null = null;
  /** 设置菜单打开期间的 document 点击监听 */
  let onSettingsDocClick: ((ev: MouseEvent) => void) | null = null;
  /** 弹窗内部 diffs 数据：忽略空白开关重拉时只替换此份数据，不动全局 state.diffs */
  let localDiffs = diffs;
  /** 忽略空白开关重拉中标记：期间导航/开关按钮 disabled */
  let reloading = false;

  /** 弹窗偏好集合：所有开关统一走 prefs 读写与异步加载 */
  const prefs: DiffPrefs = {
    wrap: false,
    viewMode: 'side',
    ignoreWs: false,
    highlightWords: false,
    showLineNums: true,
    showWhitespace: false,
    inlineDiff: false,
  };
  /** 偏好持久化定义：get/set 方法名与默认值；主进程缺方法时回退默认 */
  const prefDefs: Array<{ key: keyof DiffPrefs; get: string; set: string; def: boolean | string }> = [
    { key: 'wrap', get: 'getDiffWrap', set: 'setDiffWrap', def: false },
    { key: 'viewMode', get: 'getDiffView', set: 'setDiffView', def: 'side' },
    { key: 'ignoreWs', get: 'getIgnoreWs', set: 'setIgnoreWs', def: false },
    { key: 'highlightWords', get: 'getHighlightWords', set: 'setHighlightWords', def: false },
    { key: 'showLineNums', get: 'getShowLineNums', set: 'setShowLineNums', def: true },
    { key: 'showWhitespace', get: 'getShowWhitespace', set: 'setShowWhitespace', def: false },
    { key: 'inlineDiff', get: 'getInlineDiff', set: 'setInlineDiff', def: false },
  ];
  /** 异步加载完成标记：防止回包后重复套用重渲染 */
  let prefsLoaded = false;

  // 工具栏：路径（左）+ 弹性间隔 + ‹ n/m ›（导航区）+ ×（关闭）
  const overlay = el('div', 'diff-popup-overlay');
  overlay.id = DIFF_POPUP_OVERLAY_ID;
  const box = el('div', 'diff-popup');
  const toolbar = el('div', 'diff-popup-toolbar');
  const pathEl = el('span', 'diff-popup-path');
  const spacer = el('span', 'diff-popup-spacer');
  const nav = el('div', 'diff-popup-nav');

  // 自动换行开关按钮：图标用内联 SVG（两条水平线 + 回折箭头），跟随 currentColor
  const wrapBtn = el('button', 'diff-popup-nav-btn diff-popup-wrap-btn');
  (wrapBtn as HTMLButtonElement).type = 'button';
  wrapBtn.setAttribute('data-diff-popup-wrap', '');
  wrapBtn.title = '自动换行';
  wrapBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M2 4h12"/><path d="M2 8h9"/>'
    + '<path d="M11 6.5 13.5 8 11 9.5"/><path d="M2 12h12"/>'
    + '</svg>';

  // 视图切换按钮：并排 / 单栏（unified）切换，图标用 __ICONS__ 里的差异视图图标
  const viewBtn = el('button', 'diff-popup-nav-btn diff-popup-view-btn');
  (viewBtn as HTMLButtonElement).type = 'button';
  viewBtn.setAttribute('data-diff-popup-view', '');
  viewBtn.title = '并排查看器';
  viewBtn.innerHTML = iconSvg('diff') || iconSvg('split') ||
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="1.5" y="2.5" width="13" height="11" rx="1"/>'
    + '<path d="M8 2.5v11"/></svg>';

  // 忽略空白开关按钮：激活时重拉当前文件差异（ignoreWhitespace: true）
  const ignoreWsBtn = el('button', 'diff-popup-nav-btn diff-popup-ignorews-btn');
  (ignoreWsBtn as HTMLButtonElement).type = 'button';
  ignoreWsBtn.setAttribute('data-diff-popup-ignore-ws', '');
  ignoreWsBtn.title = '忽略空白';
  ignoreWsBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M2 5h7M2 8h9M2 11h5"/>'
    + '<path d="M11 8h3" stroke-dasharray="1.5 1.5"/></svg>';

  // 单词级高亮开关按钮：激活时对配对 delete/add 行做 token LCS 高亮
  const highlightBtn = el('button', 'diff-popup-nav-btn diff-popup-highlight-btn');
  (highlightBtn as HTMLButtonElement).type = 'button';
  highlightBtn.setAttribute('data-diff-popup-highlight', '');
  highlightBtn.title = '高亮显示单词';
  highlightBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M8.5 2.5 13.5 7.5 7 14H3.5v-3.5z"/><path d="M2 14h12" opacity="0.5"/></svg>';

  // 设置按钮：齿轮图标，弹出「显示行号」小菜单（对齐 IDEA 齿轮在最右）
  const settingsBtn = el('button', 'diff-popup-nav-btn diff-popup-settings-btn');
  (settingsBtn as HTMLButtonElement).type = 'button';
  settingsBtn.setAttribute('data-diff-popup-settings', '');
  settingsBtn.title = '设置';
  settingsBtn.innerHTML = iconSvg('settings') ||
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<circle cx="8" cy="8" r="2.2"/>'
    + '<path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>'
    + '</svg>';

  const prevBtn = el('button', 'diff-popup-nav-btn');
  (prevBtn as HTMLButtonElement).type = 'button';
  prevBtn.setAttribute('data-diff-popup-prev', '');
  prevBtn.title = '上一个文件';
  prevBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M10 3.5 5.5 8l4.5 4.5"/></svg>';

  // 差异块导航按钮：跳到上一个/下一个变更块（对齐 IDEA「上一个/下一个变更」）
  const prevChangeBtn = el('button', 'diff-popup-nav-btn');
  (prevChangeBtn as HTMLButtonElement).type = 'button';
  prevChangeBtn.setAttribute('data-diff-popup-prev-change', '');
  prevChangeBtn.title = '上一个差异（Alt+↑）';
  prevChangeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M8 12.5v-9"/><path d="M4.5 7 8 3.5 11.5 7"/></svg>';

  const nextChangeBtn = el('button', 'diff-popup-nav-btn');
  (nextChangeBtn as HTMLButtonElement).type = 'button';
  nextChangeBtn.setAttribute('data-diff-popup-next-change', '');
  nextChangeBtn.title = '下一个差异（Alt+↓）';
  nextChangeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M8 3.5v9"/><path d="M4.5 9 8 12.5 11.5 9"/></svg>';

  const countEl = el('span', 'diff-popup-count');
  countEl.setAttribute('data-diff-popup-count', '');
  countEl.title = '转到变更文件';

  const nextBtn = el('button', 'diff-popup-nav-btn');
  (nextBtn as HTMLButtonElement).type = 'button';
  nextBtn.setAttribute('data-diff-popup-next', '');
  nextBtn.title = '下一个文件';
  nextBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M6 3.5 10.5 8 6 12.5"/></svg>';

  const closeBtn = el('button', 'diff-popup-close');
  (closeBtn as HTMLButtonElement).type = 'button';
  closeBtn.setAttribute('data-diff-popup-close', '');
  closeBtn.title = '关闭';
  closeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
    + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
    + ' xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M4 4l8 8M12 4l-8 8"/></svg>';

  // 工具栏顺序对齐 IDEA（DiffRequestProcessor.getNavigationActions）：
  // 差异块导航(↑↓) | 功能开关(view/ignoreWs/highlight/wrap) | 文件导航(‹ n/m ›) | settings
  // IDEA 源码顺序：PreviousDiff, NextDiff, [sep], Diff.PrevChange, GoToChange, Diff.NextChange, [sep]
  nav.appendChild(prevChangeBtn);
  nav.appendChild(nextChangeBtn);
  nav.appendChild(viewBtn);
  nav.appendChild(ignoreWsBtn);
  nav.appendChild(highlightBtn);
  nav.appendChild(wrapBtn);
  nav.appendChild(prevBtn);
  nav.appendChild(countEl);
  nav.appendChild(nextBtn);
  nav.appendChild(settingsBtn);
  toolbar.appendChild(pathEl);
  toolbar.appendChild(spacer);
  toolbar.appendChild(nav);
  toolbar.appendChild(closeBtn);

  const bodyEl = el('div', 'diff-popup-body');
  // 左右两栏独立滚动容器：各带自己的横向滚动条，垂直滚动由脚本同步
  const colLeft = el('div', 'diff-popup-col diff-popup-col-left');
  const colRight = el('div', 'diff-popup-col diff-popup-col-right');
  bodyEl.appendChild(colLeft);
  bodyEl.appendChild(colRight);
  box.appendChild(toolbar);
  box.appendChild(bodyEl);
  overlay.appendChild(box);

  /** 垂直滚动同步中标记：防止 scroll 事件互设 scrollTop 递归 */
  let syncingScroll = false;
  /** 列垂直滚动同步：一方滚动时把另一方 scrollTop 对齐 */
  function onColScroll(ev: Event) {
    if (syncingScroll) return;
    const source = ev.target;
    if (source !== colLeft && source !== colRight) return;
    const other = source === colLeft ? colRight : colLeft;
    syncingScroll = true;
    other.scrollTop = (source as HTMLElement).scrollTop;
    syncingScroll = false;
  }
  colLeft.addEventListener('scroll', onColScroll);
  colRight.addEventListener('scroll', onColScroll);

  /** 关闭文件列表弹层并解绑 document 点击监听（幂等） */
  function closeFileList() {
    if (!filelistEl) return;
    filelistEl.remove();
    filelistEl = null;
    if (onFilelistDocClick) {
      document.removeEventListener('click', onFilelistDocClick);
      onFilelistDocClick = null;
    }
    logDebug('diff-popup', 'filelist_close', {});
  }

  /** 关闭设置菜单并解绑 document 点击监听（幂等） */
  function closeSettingsMenu() {
    if (!settingsEl) return;
    settingsEl.remove();
    settingsEl = null;
    if (onSettingsDocClick) {
      document.removeEventListener('click', onSettingsDocClick);
      onSettingsDocClick = null;
    }
    logDebug('diff-popup', 'settings_close', {});
  }

  /** 关闭弹窗并解绑所有监听（幂等） */
  function close() {
    if (closed) return;
    closed = true;
    closeFileList();
    closeSettingsMenu();
    document.removeEventListener('keydown', onKeydown);
    colLeft.removeEventListener('scroll', onColScroll);
    colRight.removeEventListener('scroll', onColScroll);
    overlay.remove();
    if (activeDiffClose === close) activeDiffClose = null;
    logDebug('diff-popup', 'close', { index: currentIndex });
  }

  /** 变更块锚点指针：-1 表示无当前锚点（切文件后重置） */
  let changeAnchorIndex = -1;
  /** 当前文件变更块锚点缓存（render 时重建） */
  let changeAnchors: Array<{ leftIndex: number; rightIndex: number; unifiedIndex: number }> = [];

  /**
   * 收集当前 diff 的变更块锚点：连续 add/delete 行合并为一个块，
   * 锚点取「该块第一行在其列中的行索引」。并排模式用 buildSideBySideRows 对齐结果
   * （块在左列 delete 或右列 add 出现，取行号较大一侧保证两列滚动同步都对得上）；
   * 单栏模式用 lines 线性索引。
   * @param lines 当前文件差异行
   * @returns 锚点数组 [{ leftIndex, rightIndex, unifiedIndex }]
   */
  function collectChangeAnchors(lines: DiffLine[]) {
    const anchors: Array<{ leftIndex: number; rightIndex: number; unifiedIndex: number }> = [];
    if (prefs.viewMode === 'unified') {
      let i = 0;
      while (i < lines.length) {
        if (lines[i]!.type !== 'add' && lines[i]!.type !== 'delete') {
          i += 1;
          continue;
        }
        const start = i;
        while (i < lines.length
          && (lines[i]!.type === 'add' || lines[i]!.type === 'delete')) {
          i += 1;
        }
        anchors.push({ leftIndex: -1, rightIndex: -1, unifiedIndex: start });
      }
      return anchors;
    }

    const rows = buildSideBySideRows(lines);
    let k = 0;
    while (k < rows.length) {
      const row = rows[k]!;
      const isChange = (row.left && (row.left.type === 'delete' || row.left.type === 'add'))
        || (row.right && (row.right.type === 'delete' || row.right.type === 'add'));
      if (!isChange) {
        k += 1;
        continue;
      }
      const start = k;
      while (k < rows.length) {
        const r = rows[k]!;
        const ch = (r.left && (r.left.type === 'delete' || r.left.type === 'add'))
          || (r.right && (r.right.type === 'delete' || r.right.type === 'add'));
        if (!ch) break;
        k += 1;
      }
      anchors.push({ leftIndex: start, rightIndex: start, unifiedIndex: -1 });
    }
    return anchors;
  }

  /** 清除所有行的差异块高亮 class */
  function clearChangeActive() {
    const activeRows = document.querySelectorAll(
      '#' + DIFF_POPUP_OVERLAY_ID + ' .diff-popup-change-active');
    for (let i = 0; i < activeRows.length; i += 1) {
      activeRows[i]!.classList.remove('diff-popup-change-active');
    }
  }

  /**
   * 跳到上一个/下一个变更块：移动锚点指针后定位高亮并滚动到列可视区中央；
   * 到头不循环（对齐 IDEA）。单文件无变更块时按钮 disabled（render 内处理）。
   * @param delta 步进：1 下一个，-1 上一个
   */
  function jumpChange(delta: number) {
    if (closed || changeAnchors.length === 0) return;
    let next = changeAnchorIndex + delta;
    if (next < 0) next = 0;
    if (next >= changeAnchors.length) next = changeAnchors.length - 1;
    changeAnchorIndex = next;

    const anchor = changeAnchors[changeAnchorIndex]!;
    clearChangeActive();

    const rowPairs = colLeft.querySelectorAll('.diff-popup-row');
    const leftRow = rowPairs[anchor.leftIndex >= 0 ? anchor.leftIndex : -1] || null;
    const unifiedRows = colLeft.querySelectorAll('.diff-popup-row');
    let targetRow: Element | null = null;
    if (prefs.viewMode === 'unified') {
      targetRow = anchor.unifiedIndex >= 0 ? unifiedRows[anchor.unifiedIndex] ?? null : null;
    } else {
      targetRow = leftRow;
    }
    if (!targetRow) return;

    // 目标行高亮 + 两列同步滚动到可视区中央（并排模式两列索引相同）
    targetRow.classList.add('diff-popup-change-active');
    const centerTop = (targetRow as HTMLElement).offsetTop - colLeft.clientHeight / 2;
    colLeft.scrollTop = centerTop;
    colRight.scrollTop = centerTop;
    logDebug('diff-popup', 'jump_change', {
      index: changeAnchorIndex,
      count: changeAnchors.length,
      delta: delta,
    });
  }

  /** document 级键盘处理：仅弹窗打开期间存在，close 时必须解绑 */
  function onKeydown(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement | null;
    const tag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
    // 焦点在输入控件或 contenteditable 上时不拦截，交还给输入行为
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (target && typeof target.getAttribute === 'function') {
      if (target.getAttribute('contenteditable') !== null || target.isContentEditable) return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      // 弹层开着时 Escape 只关最上层弹层，否则才关弹窗
      if (settingsEl) {
        closeSettingsMenu();
        return;
      }
      if (filelistEl) {
        closeFileList();
        return;
      }
      close();
      return;
    }
    // ←/→ 始终消费按键（边缘也不泄漏给背景面板），但仅在可用时切换文件
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      step(ev.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    // Alt+↑/↓：差异块导航（在普通 ↑/↓ 滚动处理之前判断，防止误滚动）
    if (ev.altKey && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
      ev.preventDefault();
      jumpChange(ev.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    // ↑/↓ 手动驱动两列同步垂直滚动（不切换文件）
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      const delta = ev.key === 'ArrowUp' ? -48 : 48;
      colLeft.scrollTop += delta;
      colRight.scrollTop += delta;
    }
  }

  /**
   * 切换到上一个/下一个文件；边缘禁用不循环（首尾/单文件时无任何动作）
   * @param delta 步进：1 下一个，-1 上一个
   */
  function step(delta: number) {
    if (closed) return;
    const next = currentIndex + delta;
    if (next < 0 || next >= localDiffs.length) {
      // 迭代边缘：不切换、不循环（对齐 IDEA 的边缘防误触设计）
      logDebug('diff-popup', 'step_edge', { index: currentIndex, delta: delta });
      return;
    }
    currentIndex = next;
    logDebug('diff-popup', 'step', { index: currentIndex });
    render();
  }

  /**
   * 跳转到指定文件（文件列表项点击等场景）
   * @param index 目标文件索引（越界时忽略）
   */
  function goToIndex(index: number) {
    if (closed) return;
    if (index < 0 || index >= localDiffs.length) return;
    currentIndex = index;
    logDebug('diff-popup', 'goto', { index: index, path: localDiffs[index]!.path });
    render();
  }

  /** 打开文件列表弹层（挂在 overlay 内、n/m 计数正下方） */
  function openFileList() {
    if (closed || filelistEl) return;
    const list = el('div', 'diff-popup-filelist');
    localDiffs.forEach(function (item, i) {
      const filePath = item.path || item.file || '';
      const row = el('div', i === currentIndex
        ? 'diff-popup-filelist-item diff-popup-filelist-item-active'
        : 'diff-popup-filelist-item');
      row.setAttribute('data-diff-popup-file-index', String(i));
      row.textContent = filePath;
      row.title = filePath;
      row.onclick = function () {
        goToIndex(i);
        closeFileList();
      };
      list.appendChild(row);
    });

    // 定位：overlay 为 fixed 全屏，坐标相对 overlay 计算（jsdom 下 rect 为 0，退化到右上角也不影响功能）
    const overlayRect = overlay.getBoundingClientRect();
    const countRect = countEl.getBoundingClientRect();
    list.style.top = String(countRect.bottom - overlayRect.top + 4) + 'px';
    list.style.right = String(overlayRect.right - countRect.right) + 'px';
    overlay.appendChild(list);
    filelistEl = list;

    const onDocClick = function (ev: MouseEvent) {
      const target = ev.target;
      if (!target) return;
      if (list.contains(target as Node) || countEl.contains(target as Node)) return;
      closeFileList();
    };
    onFilelistDocClick = onDocClick;
    // 延迟注册外部点击，避免打开列表的这次点击被误判为「点外面」
    setTimeout(function () {
      if (closed || filelistEl !== list) return;
      document.addEventListener('click', onDocClick);
    }, 0);

    logDebug('diff-popup', 'filelist_open', { count: localDiffs.length, index: currentIndex });
  }

  /** 打开设置菜单（挂在 overlay 内、设置按钮下方）：目前只有「显示行号」一项 */
  function openSettingsMenu() {
    if (closed || settingsEl) return;
    const menu = el('div', 'diff-popup-settings-menu');
    const item = el('div', 'diff-popup-settings-item');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = prefs.showLineNums;
    checkbox.onchange = function () {
      prefs.showLineNums = checkbox.checked;
      void call('setShowLineNums', { value: checkbox.checked });
      logDebug('diff-popup', 'linenums_toggle', { value: checkbox.checked });
      render();
    };
    const label = el('span', 'diff-popup-settings-label', '显示行号');
    item.appendChild(checkbox);
    item.appendChild(label);
    // 点击 label 切换勾选（checkbox 点击已原生生效，避免双切）
    label.onclick = function (ev) {
      ev.preventDefault();
      checkbox.checked = !checkbox.checked;
      if (typeof checkbox.onchange === 'function') checkbox.onchange(new Event("change"));
    };
    menu.appendChild(item);

    // 「显示空白符」项：空白符可视化（空格→·、tab→→），纯前端重渲染
    const wsItem = el('div', 'diff-popup-settings-item');
    const wsCheckbox = document.createElement('input');
    wsCheckbox.type = 'checkbox';
    wsCheckbox.checked = prefs.showWhitespace;
    wsCheckbox.onchange = function () {
      prefs.showWhitespace = wsCheckbox.checked;
      void call('setShowWhitespace', { value: wsCheckbox.checked });
      logDebug('diff-popup', 'whitespace_toggle', { value: wsCheckbox.checked });
      render();
    };
    const wsLabel = el('span', 'diff-popup-settings-label', '显示空白符');
    wsItem.appendChild(wsCheckbox);
    wsItem.appendChild(wsLabel);
    wsLabel.onclick = function (ev) {
      ev.preventDefault();
      wsCheckbox.checked = !wsCheckbox.checked;
      if (typeof wsCheckbox.onchange === 'function') wsCheckbox.onchange(new Event("change"));
    };
    menu.appendChild(wsItem);

    // 「行内差异高亮」项：配对行字符级差异标色，纯前端重渲染
    const inlineItem = el('div', 'diff-popup-settings-item');
    const inlineCheckbox = document.createElement('input');
    inlineCheckbox.type = 'checkbox';
    inlineCheckbox.checked = prefs.inlineDiff;
    inlineCheckbox.onchange = function () {
      prefs.inlineDiff = inlineCheckbox.checked;
      void call('setInlineDiff', { value: inlineCheckbox.checked });
      logDebug('diff-popup', 'inline_toggle', { value: inlineCheckbox.checked });
      render();
    };
    const inlineLabel = el('span', 'diff-popup-settings-label', '行内差异高亮');
    inlineItem.appendChild(inlineCheckbox);
    inlineItem.appendChild(inlineLabel);
    inlineLabel.onclick = function (ev) {
      ev.preventDefault();
      inlineCheckbox.checked = !inlineCheckbox.checked;
      if (typeof inlineCheckbox.onchange === 'function') inlineCheckbox.onchange(new Event("change"));
    };
    menu.appendChild(inlineItem);

    // 定位：相对 overlay 计算（与 filelist 同风格，jsdom rect 为 0 退化也不影响功能）
    const overlayRect = overlay.getBoundingClientRect();
    const btnRect = settingsBtn.getBoundingClientRect();
    menu.style.top = String(btnRect.bottom - overlayRect.top + 4) + 'px';
    menu.style.right = String(overlayRect.right - btnRect.right) + 'px';
    overlay.appendChild(menu);
    settingsEl = menu;

    const onDocClick = function (ev: MouseEvent) {
      const target = ev.target;
      if (!target) return;
      if (menu.contains(target as Node) || settingsBtn.contains(target as Node)) return;
      closeSettingsMenu();
    };
    onSettingsDocClick = onDocClick;
    // 延迟注册外部点击，避免打开菜单的这次点击被误判为「点外面」
    setTimeout(function () {
      if (closed || settingsEl !== menu) return;
      document.addEventListener('click', onDocClick);
    }, 0);

    logDebug('diff-popup', 'settings_open', {
      showLineNums: prefs.showLineNums,
      showWhitespace: prefs.showWhitespace,
      inlineDiff: prefs.inlineDiff,
    });
  }

  /**
   * 忽略空白开关重拉当前文件差异：只替换弹窗内部数据（localDiffs），不动全局 state.diffs。
   * 拉取中导航与开关按钮 disabled；失败时 logError 并保持原数据。
   */
  function reloadIgnoreWs() {
    if (closed || reloading || !commitHash) return;
    reloading = true;
    updateDisabledStates();
    logDebug('diff-popup', 'ignorews_reload', { hash: commitHash, ignoreWs: prefs.ignoreWs });
    call<FileDiff[]>('getCommitDiffs', { hash: commitHash, ignoreWhitespace: prefs.ignoreWs })
      .then(function (result) {
        if (closed) return;
        if (result && result.length) {
          localDiffs = result;
          // 当前索引可能越界（文件数变化），收敛后重渲染
          if (currentIndex >= localDiffs.length) currentIndex = localDiffs.length - 1;
          if (currentIndex < 0) currentIndex = 0;
        }
      })
      .catch(function (err) {
        if (!closed) {
          logError('diff-popup', 'ignorews_reload_failed', {
            error: String(err && err.message ? err.message : err),
          });
        }
      })
      .then(function () {
        if (closed) return;
        reloading = false;
        updateDisabledStates();
        render();
      });
  }

  /** 按当前状态同步各开关按钮激活态与 disabled 态（含重拉 loading） */
  function updateDisabledStates() {
    const busy = reloading;
    (viewBtn as HTMLButtonElement).disabled = busy;
    (ignoreWsBtn as HTMLButtonElement).disabled = busy;
    (highlightBtn as HTMLButtonElement).disabled = busy;
    (wrapBtn as HTMLButtonElement).disabled = busy;
    viewBtn.classList.toggle('diff-popup-view-btn-active', prefs.viewMode === 'unified');
    ignoreWsBtn.classList.toggle('diff-popup-ignorews-btn-active', prefs.ignoreWs);
    highlightBtn.classList.toggle('diff-popup-highlight-btn-active', prefs.highlightWords);
    wrapBtn.classList.toggle('diff-popup-wrap-btn-active', prefs.wrap);
  }

  /** 按当前索引重建工具栏路径/计数/按钮禁用态与 body 并排内容 */
  function render() {
    if (closed) return;
    const diff = localDiffs[currentIndex];
    if (!diff) return;
    const filePath = diff.path || diff.file || '';
    pathEl.textContent = filePath;
    pathEl.title = filePath;
    countEl.textContent = String(currentIndex + 1) + '/' + localDiffs.length;

    // 边缘禁用：首尾与单文件时对应方向按钮 disabled（原生 disabled 使点击无效）
    (prevBtn as HTMLButtonElement).disabled = reloading || currentIndex === 0;
    (nextBtn as HTMLButtonElement).disabled = reloading || currentIndex === localDiffs.length - 1;
    updateDisabledStates();

    // 文件列表打开时同步当前项高亮
    if (filelistEl) {
      const items = filelistEl.querySelectorAll('[data-diff-popup-file-index]');
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]!;
        const idx = Number(item.getAttribute('data-diff-popup-file-index'));
        if (idx === currentIndex) item.classList.add('diff-popup-filelist-item-active');
        else item.classList.remove('diff-popup-filelist-item-active');
      }
    }

    // body 容器 class 统一在 render 内收敛（wrap / unified / hide-linenums）
    bodyEl.classList.toggle('diff-popup-wrap', prefs.wrap);
    bodyEl.classList.toggle('diff-popup-unified', prefs.viewMode === 'unified');
    bodyEl.classList.toggle('diff-popup-hide-linenums', !prefs.showLineNums);
    // 行构建函数读模块级开关：render 时由 prefs 同步一次
    diffPopupShowWhitespace = prefs.showWhitespace;
    diffPopupInlineDiff = prefs.inlineDiff;
    // 切文件/重渲染后重置差异块锚点指针（无当前锚点，下一次跳转从第一个开始）
    clearChangeActive();
    changeAnchorIndex = -1;

    bodyEl.innerHTML = '';
    // 列容器被 innerHTML 清空后需重新挂回；列内旧行也必须清掉，否则每次 render 行数翻倍
    colLeft.innerHTML = '';
    colRight.innerHTML = '';
    bodyEl.appendChild(colLeft);
    bodyEl.appendChild(colRight);
    const lines = diff.lines || [];
    if (!lines.length) {
      bodyEl.appendChild(el('div', 'diff-popup-empty', '（无文本差异，可能是二进制文件）'));
      changeAnchors = [];
      (prevChangeBtn as HTMLButtonElement).disabled = true;
      (nextChangeBtn as HTMLButtonElement).disabled = true;
      return;
    }
    // 重建当前文件的变更块锚点缓存，供工具栏按钮与 Alt+↑/↓ 使用
    changeAnchors = collectChangeAnchors(lines);
    (prevChangeBtn as HTMLButtonElement).disabled = changeAnchors.length === 0;
    (nextChangeBtn as HTMLButtonElement).disabled = changeAnchors.length === 0;

    /**
     * 同步左右两栏第 i 行的行高：取两侧 offsetHeight 较大者，
     * 同时设为该行 minHeight，保证 wrap 折行时左右行严格对齐。
     * jsdom 中 offsetHeight 恒为 0，max 为 0 时跳过设置（测试安全）
     * @param rowPairs 左右行元素对
     */
    function syncRowHeights(rowPairs: Array<{ left: HTMLElement; right: HTMLElement }>) {
      for (let k = 0; k < rowPairs.length; k += 1) {
        const leftH = rowPairs[k]!.left ? rowPairs[k]!.left.offsetHeight : 0;
        const rightH = rowPairs[k]!.right ? rowPairs[k]!.right.offsetHeight : 0;
        const maxH = leftH > rightH ? leftH : rightH;
        if (maxH > 0) {
          if (rowPairs[k]!.left) rowPairs[k]!.left.style.minHeight = maxH + 'px';
          if (rowPairs[k]!.right) rowPairs[k]!.right.style.minHeight = maxH + 'px';
        }
      }
    }

    if (prefs.viewMode === 'unified') {
      // 单栏模式：原始 diff.lines 线性渲染进左列，右列隐藏（CSS 驱动），无行高配对
      lines.forEach(function (line) {
        const row = el('div', 'diff-popup-row');
        // 复用 cell 包装让背景铺满整栏（与并排模式同一机制）
        let typeClass = '';
        if (line.type === 'add') typeClass = ' diff-popup-line-add';
        else if (line.type === 'delete') typeClass = ' diff-popup-line-delete';
        const cell = el('div', 'diff-popup-cell diff-popup-cell-left' + typeClass);
        cell.appendChild(createDiffPopupUnifiedLine(line));
        row.appendChild(cell);
        colLeft.appendChild(row);
      });
      return;
    }

    const rowPairs: Array<{ left: HTMLElement; right: HTMLElement }> = [];
    buildSideBySideRows(lines).forEach(function (row) {
      // 单词高亮：开关开启且该行为 delete/add 配对行时，对两侧内容做 token LCS 高亮
      let oldNodes: Node[] | null = null;
      let newNodes: Node[] | null = null;
      const isPairedChange = !!row.left && !!row.right
        && row.left.type === 'delete' && row.right.type === 'add';
      if (prefs.highlightWords && isPairedChange) {
        const hl = highlightWordDiff(row.left!.content, row.right!.content);
        oldNodes = hl.oldNodes;
        newNodes = hl.newNodes;
        // 行内字符级差异：在 token 高亮节点内部再做字符级标记（叠加效果对齐 IDEA）
        if (prefs.inlineDiff) {
          oldNodes = applyCharHighlight(oldNodes, row.left!.content, row.right!.content);
          newNodes = applyCharHighlight(newNodes, row.right!.content, row.left!.content);
        }
      } else if (prefs.inlineDiff && isPairedChange) {
        // 无 token 高亮时整行做字符级标记
        oldNodes = highlightCharDiff(row.left!.content, row.right!.content);
        newNodes = highlightCharDiff(row.right!.content, row.left!.content);
      }
      // 左行进左列、右行进右列；row 内保留单个 cell 包装，兼容现有样式与选择器
      const rowLeft = el('div', 'diff-popup-row');
      rowLeft.appendChild(createDiffPopupCell(row.left, 'left'));
      colLeft.appendChild(rowLeft);
      const rowRight = el('div', 'diff-popup-row');
      rowRight.appendChild(createDiffPopupCell(row.right, 'right'));
      colRight.appendChild(rowRight);
      // 高亮节点注入对应行的内容 span（createDiffPopupLine 内部已建纯文本，这里替换）
      if (oldNodes || newNodes) {
        applyWordNodes(rowLeft, oldNodes);
        applyWordNodes(rowRight, newNodes);
      }
      rowPairs.push({ left: rowLeft, right: rowRight });
    });

    // 行高对齐：wrap 折行时两侧行高可能不同，非 wrap 时保证空行占位行同高。
    // 先强制 reflow 让 wrap class 的折行效果进入布局，再测量；
    // 否则同一任务内读到的是折行前的旧布局（jsdom 中恒 0 自动跳过）
    void bodyEl.offsetHeight;
    syncRowHeights(rowPairs);
  }

  /**
   * 把单词高亮节点替换进行的第三个 span（code）：先清空再逐个挂载
   * @param rowEl 行元素（.diff-popup-row）
   * @param nodes 高亮节点数组，空则不动
   */
  function applyWordNodes(rowEl: HTMLElement, nodes: Node[] | null) {
    if (!nodes || !nodes.length) return;
    const codeSpan = rowEl.querySelector('.diff-line .code');
    if (!codeSpan) return;
    codeSpan.textContent = '';
    nodes.forEach(function (n) { codeSpan.appendChild(n); });
  }

  document.body.appendChild(overlay);

  // 按钮原生 disabled 拦截点击；step 内再做一次边缘判断兜底
  prevBtn.onclick = function () { step(-1); };
  nextBtn.onclick = function () { step(1); };
  // n/m 计数链接：切换文件列表；stopPropagation 避免冒泡触发 document 级「点外关闭」
  countEl.onclick = function (ev) {
    ev.stopPropagation();
    if (filelistEl) closeFileList();
    else openFileList();
  };
  closeBtn.onclick = close;

  // 自动换行开关：fire-and-forget 持久化，本地状态即时生效并重渲染
  wrapBtn.onclick = function () {
    prefs.wrap = !prefs.wrap;
    logDebug('diff-popup', 'wrap_toggle', { wrap: prefs.wrap });
    void call('setDiffWrap', { value: prefs.wrap });
    render();
  };
  // 点击遮罩（非对话框内容）关闭
  overlay.onclick = function (ev) {
    if (ev.target === overlay) close();
  };
  document.addEventListener('keydown', onKeydown);
  activeDiffClose = close;

  // 视图切换：并排 / 单栏（unified），fire-and-forget 持久化
  viewBtn.onclick = function () {
    let nextView: 'side' | 'unified' = 'unified';
    if (prefs.viewMode !== 'side') nextView = 'side';
    prefs.viewMode = nextView;
    logDebug('diff-popup', 'view_toggle', { viewMode: nextView });
    void call('setDiffView', { value: nextView });
    render();
  };

  // 忽略空白开关：切换后重拉当前文件差异（内部数据替换）
  ignoreWsBtn.onclick = function () {
    prefs.ignoreWs = !prefs.ignoreWs;
    logDebug('diff-popup', 'ignorews_toggle', { ignoreWs: prefs.ignoreWs });
    void call('setIgnoreWs', { value: prefs.ignoreWs });
    reloadIgnoreWs();
  };

  // 单词高亮开关：纯前端，重渲染即可
  highlightBtn.onclick = function () {
    prefs.highlightWords = !prefs.highlightWords;
    logDebug('diff-popup', 'highlight_toggle', { value: prefs.highlightWords });
    void call('setHighlightWords', { value: prefs.highlightWords });
    render();
  };

  // 设置按钮：打开/关闭设置菜单；stopPropagation 避免触发「点外关闭」
  settingsBtn.onclick = function (ev) {
    ev.stopPropagation();
    if (settingsEl) closeSettingsMenu();
    else openSettingsMenu();
  };

  // 差异块导航按钮：跳到上一个/下一个变更块
  prevChangeBtn.onclick = function () { jumpChange(-1); };
  nextChangeBtn.onclick = function () { jumpChange(1); };

  render();

  // 异步取回全部持久化偏好：不阻塞首帧（先按默认值渲染），回包后与当前值不同则套用并重渲染。
  // 主进程/mock 缺方法时按默认值容错（call reject 或返回 undefined 都不抛错）。
  // 回调计数风格（ES5），全部 settle 后只套用一次并重渲染一次。
  let pendingPrefs = prefDefs.length;
  prefDefs.forEach(function (def) {
    call(def.get, {}).then(function (value) {
      if (closed) return;
      if (value !== undefined && value !== null && value !== prefs[def.key]) {
        (prefs as unknown as Record<string, unknown>)[def.key] = value;
      }
    }).catch(function () {
      // 读取失败按默认值处理（mock 环境可能没有对应方法分支）
    }).then(function () {
      pendingPrefs -= 1;
      if (!closed && !prefsLoaded && pendingPrefs === 0) {
        prefsLoaded = true;
        render();
      }
    });
  });

  logDebug('diff-popup', 'show', {
    count: diffs.length,
    startIndex: startIndex,
    path: diffs[startIndex]!.path,
  });

  return close;
}
