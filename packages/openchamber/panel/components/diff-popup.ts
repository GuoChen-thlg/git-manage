/**
 * IDE 风格文件 diff 弹窗（并排 side-by-side 对比）
 * 对齐 IntelliJ IDEA 的 Compare with Branch / Show Diff 并排视图：
 * - 全屏遮罩 + 居中对话框，顶部工具栏：路径在左，导航区（上一个 / n/m 计数链接 / 下一个）与关闭按钮在右
 * - 导航区对齐 IDEA 的 ◀ [n/m files] ▶：计数链接夹在两个箭头之间，点击弹出文件列表
 * - 边缘禁用不循环：首尾与单文件时对应按钮 disabled 置灰，键盘 ←/→ 在边缘不切换（对齐 IDEA
 *   DiffFileNavigationAction 的 "prevent accidental actions on iteration edges"）
 * - body 为左右两个独立滚动列容器（各带横向滚动条），垂直滚动互相同步、行高对齐
 * - 左列旧文件（context/delete），右列新文件（context/add）
 * - 一侧为空白补位时渲染略暗的占位行，保持左右行高对齐
 * - 键盘：←/→ 切换文件；↑/↓ 两列同步垂直滚动；Escape 先关文件列表再关弹窗
 * - 单例：重复打开时先关闭上一个弹窗
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ src/a.ts                                   ‹ 1/3 ›        [×] │
 * │─────────────────────────────────┬────────────────────────────│
 * │ 12   const a = 1                │ 12   const a = 1           │
 * │ 13 - const b = 2                │                            │
 * │                                 │ 13 + const b = 3           │
 * │ 14   return a                   │ 14   return a              │
 * └─────────────────────────────────┴────────────────────────────┘
 */

import { html } from '../html';
import { t } from '../i18n';
import { tokenize } from '../syntax';
import { getIcon } from '../icons';
import { DiffLine, FileDiff } from '../state';

/** 并排对齐的一行（左右各一侧，null 表示该侧为空白补位） */
export interface SideBySideRow {
  /** 左侧（旧文件）：context/delete 行；null 为补位 */
  left: DiffLine | null;
  /** 右侧（新文件）：context/add 行；null 为补位 */
  right: DiffLine | null;
}

/** 弹窗可选项：传入后启用「忽略空白」重拉能力 */
export interface DiffPopupOptions {
  /** 提交哈希：重拉 ignoreWhitespace 差异时透传给 service */
  hash?: string;
  /** 仓库目录：重拉时透传给 service */
  directory?: string;
  /** 重拉函数：开启「忽略空白」时调用（应带 ignoreWhitespace: true 请求 git-commit-diffs） */
  refetch?: (ignoreWhitespace: boolean) => Promise<FileDiff[]>;
}

/** 覆盖层元素 id（单例，重复打开时先关闭旧弹窗） */
const OVERLAY_ID = 'gm-diff-popup-overlay';

/**
 * 把 unified diff 行序列对齐成并排两列行。
 * 对齐规则：
 * - context 行两侧相同，输出 { left: line, right: line }
 * - 一个变更块 = 连续 delete 行 + 紧随其后的连续 add 行，
 *   按索引配对 max(deletes, adds) 行，缺的一侧用 null 补位
 * - 孤立 delete（后面无 add）→ { left: line, right: null }
 * - 孤立 add → { left: null, right: line }
 * - 输出顺序与输入顺序一致
 * @param lines 单个文件的差异行（标准 unified diff 顺序）
 * @returns 与输入等序的并排对齐行数组
 */
export function buildSideBySideRows(lines: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
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
      for (let k = 0; k < count; k++) {
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

/** 单词级高亮 token：按「单词 / 空白 / 其他标点」切分 */
const WORD_TOKEN_RE = /[\w]+|\s+|[^\w\s]+/u;

/**
 * 把一行文本切成 token 数组（单词 / 空白 / 标点各成 token）
 * @param text 行文本
 * @returns token 数组
 */
function splitWordTokens(text: string): string[] {
  return text.match(WORD_TOKEN_RE) ?? [];
}

/**
 * 求两个 token 序列的最长公共子序列（DP 表）
 * @param a 左序列
 * @param b 右序列
 * @returns LCS 长度 DP 表（(a.length+1)×(b.length+1)）
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) dp.push(new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]! + 1
        : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp;
}

/**
 * 给配对行（delete ↔ add）做单词级 LCS 高亮：未匹配的 token 包高亮 mark。
 * 注意：必须用一次回溯同时产出双侧标记（highlightContentWordLevelPair），
 * 单侧独立计算 LCS 在相同 token 多处出现时会选位错开、两侧保留序列不一致。
 * @param content 本侧行文本
 * @param otherText 配对行文本（空串表示无配对、整体不高亮）
 * @param otherIsSource true 时本侧是"另一侧"（标记取 pair 的另一侧）
 * @returns DocumentFragment：token span + mark 高亮
 */
function highlightContentWordLevel(content: string, otherText: string): DocumentFragment {
  const frag = document.createDocumentFragment();

  if (!otherText) {
    // 无配对行：不高亮，原样输出 token
    for (const token of splitWordTokens(content)) {
      const span = document.createElement('span');
      span.textContent = token;
      frag.appendChild(span);
    }
    return frag;
  }

  const a = splitWordTokens(content);
  const b = splitWordTokens(otherText);
  const dp = lcsTable(a, b);
  // 一次正向回溯同时标双侧：匹配 token 双侧保留，否则各自标记并前进；
  // 保证两侧未匹配序列严格互为差异，不会出现同 token 选位错开
  const markA = new Array<boolean>(a.length).fill(true);
  const markB = new Array<boolean>(b.length).fill(true);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      markA[i] = false;
      markB[j] = false;
      i += 1;
      j += 1;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i += 1;
    } else {
      j += 1;
    }
  }

  for (let k = 0; k < a.length; k++) {
    if (markA[k]) {
      const mark = document.createElement('mark');
      mark.className = 'gm-diff-popup-word-hl';
      mark.textContent = a[k]!;
      frag.appendChild(mark);
    } else {
      const span = document.createElement('span');
      span.textContent = a[k]!;
      frag.appendChild(span);
    }
  }
  return frag;
}

/** 字符级高亮结果：整行拆成「普通文本 / 高亮文本」交替段 */
interface CharSeg {
  text: string;
  highlighted: boolean;
}

/**
 * 求两字符串的字符级 LCS，回溯产出本侧「高亮/普通」分段（仅标记本侧）。
 * 与 highlightContentWordLevel 的双侧同步回溯同理：只做本侧标记，配对侧独立计算同算法，
 * 字符级粒度下两侧标记天然对应同一段差异，无需联合标记。
 * @param content 本侧行文本
 * @param otherText 配对行文本（空串表示无配对、整体不高亮）
 * @returns 交替分段数组
 */
function computeCharSegs(content: string, otherText: string): CharSeg[] {
  if (!otherText) return [{ text: content, highlighted: false }];
  // 转码点数组避免代理对拆开（emoji 等按完整字符比对）
  const a = Array.from(content);
  const b = Array.from(otherText);
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) dp.push(new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]! + 1
        : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const marked = new Array<boolean>(a.length).fill(true);
  let i = a.length;
  let j = b.length;
  // 反向回溯：LCS 匹配字符保留（不高亮），其余标记
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      marked[i - 1] = false;
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  // 相邻同标记段合并
  const segs: CharSeg[] = [];
  for (let k = 0; k < a.length; k++) {
    const last = segs[segs.length - 1];
    if (last && last.highlighted === marked[k]) {
      last.text += a[k];
    } else {
      segs.push({ text: a[k]!, highlighted: marked[k]! });
    }
  }
  return segs;
}

/**
 * 把分段数组渲染成节点序列：高亮段包 gm-diff-popup-char-hl span，其余为纯文本节点
 * @param segs 分段数组
 * @returns DocumentFragment
 */
function renderCharSegs(segs: CharSeg[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of segs) {
    if (seg.highlighted) {
      const span = document.createElement('span');
      span.className = 'gm-diff-popup-char-hl';
      span.textContent = seg.text;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(seg.text));
    }
  }
  return frag;
}

/** 弹窗关闭句柄 */
export interface DiffPopupHandle {
  /** 关闭弹窗并解绑监听（幂等） */
  dispose: () => void;
}

/** 当前打开弹窗的关闭函数（单例互斥，重复打开时先关旧的） */
let activeClose: (() => void) | null = null;

/**
 * 把一行 diff 文本按语法高亮切成带 gm-syntax-* class 的 span 序列。
 * tokeniser 见 syntax.ts；颜色由 styles.css 的 .gm-syntax-* 规则读 --gm-syntax-* 变量上色。
 * @param content 行文本
 * @returns DocumentFragment，含多个 <span class="gm-syntax-xxx">
 */
function highlightContent(content: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const token of tokenize(content)) {
    const span = document.createElement('span');
    span.className = token.kind === 'plain' ? 'gm-syntax-plain' : `gm-syntax-${token.kind}`;
    span.textContent = token.text;
    frag.appendChild(span);
  }
  return frag;
}

/**
 * 空白可视化：空格 → '·'(U+00B7)、tab → '→'。
 * 只处理字面空白字符，不动其他内容；换行符在行级 diff 中不出现，无需处理。
 * @param text 原文本
 * @param visible 是否开启可视化（关闭时原样返回）
 * @returns 处理后的文本
 */
function visualizeWhitespace(text: string, visible: boolean): string {
  if (!visible) return text;
  return text.replace(/ /g, '\u00B7').replace(/\t/g, '\u2192');
}

/**
 * 递归把片段/元素树中所有文本节点按空白可视化替换（textContent 重写，不动 DOM 结构）。
 * 用于语法高亮 span、单词级 mark 内文本统一处理。
 * @param node 根节点
 * @param visible 是否开启可视化
 */
function applyWhitespaceVisible(node: Node, visible: boolean): void {
  if (!visible) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.nodeValue ?? '';
    const next = visualizeWhitespace(raw, true);
    if (next !== raw) node.nodeValue = next;
    return;
  }
  for (const child of Array.from(node.childNodes)) {
    applyWhitespaceVisible(child, visible);
  }
}

/**
 * 渲染空白补位行（该侧无对应内容），行号与内容全部留空
 * @returns 占位行元素（含 gm-diff-popup-cell-empty 标记）
 */
function createPlaceholderLine(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gm-diff-line gm-diff-popup-cell-empty';
  for (const cls of ['gm-diff-line-num', 'gm-diff-line-num', 'gm-diff-line-prefix', 'gm-diff-line-content']) {
    const span = document.createElement('span');
    span.className = cls;
    el.appendChild(span);
  }
  return el;
}

/** 内容渲染偏好：空白可视化 / 行内字符级高亮 / 单词级高亮 */
interface ContentRenderOptions {
  /** 空白可视化（'·' / '→'） */
  showWhitespace: boolean;
  /** 行内字符级差异高亮（开启时优先于单词级，直接对整行做字符级 LCS） */
  inlineDiff: boolean;
  /** 单词级差异高亮（inlineDiff 关闭时生效） */
  wordHighlight: boolean;
}

/**
 * 按偏好渲染一行差异内容：
 * - inlineDiff 开启：配对行存在时对整行做字符级 LCS（跳过 token 级，效果对齐 IDEA）
 * - 否则 wordHighlight 开启：单词级 LCS（mark 包未匹配 token）
 * - 都关闭：语法高亮 token 序列
 * 最终统一做空白可视化（含 mark/span 内文本）。
 * @param content 本侧行文本
 * @param otherText 配对行文本（空串表示无配对）
 * @param opts 渲染偏好
 * @returns DocumentFragment
 */
function renderLineContent(content: string, otherText: string, opts: ContentRenderOptions): DocumentFragment {
  let frag: DocumentFragment;
  if (opts.inlineDiff && otherText) {
    frag = renderCharSegs(computeCharSegs(content, otherText));
  } else if (opts.wordHighlight && otherText) {
    frag = highlightContentWordLevel(content, otherText);
  } else {
    frag = highlightContent(content);
  }
  applyWhitespaceVisible(frag, opts.showWhitespace);
  return frag;
}

/**
 * 渲染并排弹窗中某一侧的差异行
 * span 顺序与 file-diff.ts 的 createDiffLine 一致：
 * 旧行号、新行号、前缀、内容
 * @param line 差异行
 * @param side 所在侧：left 取旧行号与 - 前缀，right 取新行号与 + 前缀
 * @param opts 内容渲染偏好（配对文本内含其中）
 * @returns 差异行元素
 */
function createSideLine(line: DiffLine, side: 'left' | 'right', opts: ContentRenderOptions, otherText = ''): HTMLElement {
  let lineClass: string;
  let prefix: string;
  let oldNum: string;
  let newNum: string;

  if (side === 'left') {
    // 左列只会出现 context/delete 行
    lineClass = line.type === 'delete' ? 'gm-diff-line gm-diff-line-delete' : 'gm-diff-line gm-diff-line-context';
    prefix = line.type === 'delete' ? '-' : ' ';
    oldNum = line.oldLine != null ? String(line.oldLine) : ' ';
    newNum = ' ';
  } else {
    // 右列只会出现 context/add 行
    lineClass = line.type === 'add' ? 'gm-diff-line gm-diff-line-add' : 'gm-diff-line gm-diff-line-context';
    prefix = line.type === 'add' ? '+' : ' ';
    oldNum = ' ';
    newNum = line.newLine != null ? String(line.newLine) : ' ';
  }

  const el = html`
    <div class="${lineClass}">
      <span class="gm-diff-line-num">${oldNum}</span>
      <span class="gm-diff-line-num">${newNum}</span>
      <span class="gm-diff-line-prefix">${prefix}</span>
      <span class="gm-diff-line-content"></span>
    </div>
  `;
  // 语法高亮：content 按 token 拆成 span 序列，颜色走 --gm-syntax-* 变量；
  // 按偏好叠加单词级 / 字符级差异高亮与空白可视化
  const contentEl = el.querySelector('.gm-diff-line-content')!;
  contentEl.appendChild(renderLineContent(line.content, otherText, opts));
  return el;
}

/**
 * 渲染一个 50% 宽的单元格；line 为 null 时渲染空白补位行
 * @param line 该侧的差异行，null 表示补位
 * @param side 所在侧（left/right）
 * @param opts 内容渲染偏好（配对文本内含其中）
 * @returns 单元格元素
 */
function createCell(line: DiffLine | null, side: 'left' | 'right', opts: ContentRenderOptions, otherText = ''): HTMLElement {
  const cell = document.createElement('div');
  // 背景铺满整栏：type 修饰 class 打在 cell 层（cell 宽=列宽），.diff-line 只作内容层；
  // 弹窗作用域内 .gm-diff-line 自身背景由 CSS 关掉，避免行宽随内容导致背景止于文本
  let typeClass = '';
  if (line) {
    if (line.type === 'add') typeClass = ' gm-diff-popup-line-add';
    else if (line.type === 'delete') typeClass = ' gm-diff-popup-line-delete';
  }
  cell.className = `gm-diff-popup-cell gm-diff-popup-cell-${side}${typeClass}`;
  cell.appendChild(line ? createSideLine(line, side, opts, otherText) : createPlaceholderLine());
  return cell;
}

/**
 * 渲染单栏（unified）模式的一行：左列线性展示 delete/add/context
 * span 顺序与并排一致：[旧行号, 新行号, 前缀, 内容]
 * @param line 差异行
 * @param opts 内容渲染偏好（配对文本内含其中）
 * @returns 行元素（含 gm-diff-popup-cell 包装）
 */
function createUnifiedCell(line: DiffLine, opts: ContentRenderOptions, otherText = ''): HTMLElement {
  const cell = document.createElement('div');
  // 背景铺满整栏：与并排模式同一机制，type 修饰 class 打在 cell 层
  let typeClass = '';
  if (line.type === 'add') typeClass = ' gm-diff-popup-line-add';
  else if (line.type === 'delete') typeClass = ' gm-diff-popup-line-delete';
  cell.className = `gm-diff-popup-cell gm-diff-popup-cell-left${typeClass}`;
  cell.appendChild(createSideLine(line, line.type === 'add' ? 'right' : 'left', opts, otherText));
  return cell;
}

/**
 * 打开 IDE 风格文件 diff 并排弹窗
 * 参数非法（空列表或起始索引越界）时不渲染任何 DOM，返回 no-op 句柄；
 * 合法调用时按单例规则先关闭上一个弹窗
 * @param diffs 变更文件列表
 * @param startIndex 起始展示的文件索引
 * @param options 可选项：hash/directory/refetch（启用「忽略空白」重拉）
 * @returns 弹窗句柄，dispose 关闭弹窗并解绑监听（幂等）
 */
export function showDiffPopup(diffs: FileDiff[], startIndex: number, options: DiffPopupOptions = {}): DiffPopupHandle {
  if (!diffs || diffs.length === 0 || startIndex < 0 || startIndex >= diffs.length) {
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'invalid_args',
      count: diffs ? diffs.length : 0,
      startIndex,
    }));
    return { dispose: () => { /* 参数非法时不渲染 DOM，无需清理 */ } };
  }

  // 单例：重复打开先关旧的（activeClose 负责解绑旧监听，兜底按 id 移除残留 DOM）
  if (activeClose) activeClose();
  document.getElementById(OVERLAY_ID)?.remove();

  let closed = false;
  /** 当前展示的文件索引 */
  let currentIndex = startIndex;

  // 自动换行状态（持久化 localStorage 'gm.diffPopupWrap'，'1' 开启；读写失败按默认关闭）
  let wrap = false;
  try {
    wrap = localStorage.getItem('gm.diffPopupWrap') === '1';
  } catch {
    wrap = false;
  }

  /** 视图模式：'side' 并排 / 'unified' 单栏（持久化 'gm.diffPopupView'） */
  let viewMode: 'side' | 'unified' = 'side';
  try {
    viewMode = localStorage.getItem('gm.diffPopupView') === 'unified' ? 'unified' : 'side';
  } catch {
    viewMode = 'side';
  }

  /** 忽略空白（持久化 'gm.diffPopupIgnoreWs'；开启时数据经 refetch 重拉） */
  let ignoreWs = false;
  try {
    ignoreWs = localStorage.getItem('gm.diffPopupIgnoreWs') === '1';
  } catch {
    ignoreWs = false;
  }

  /** 单词级高亮（持久化 'gm.diffPopupHighlight'，纯前端计算） */
  let highlightWords = false;
  try {
    highlightWords = localStorage.getItem('gm.diffPopupHighlight') === '1';
  } catch {
    highlightWords = false;
  }

  /** 显示行号（持久化 'gm.diffPopupLineNums'，默认 '1' 开启） */
  let lineNums = true;
  try {
    lineNums = localStorage.getItem('gm.diffPopupLineNums') !== '0';
  } catch {
    lineNums = true;
  }

  /** 空白可视化（持久化 'gm.diffPopupWhitespace'，默认 '0' 关闭） */
  let showWhitespace = false;
  try {
    showWhitespace = localStorage.getItem('gm.diffPopupWhitespace') === '1';
  } catch {
    showWhitespace = false;
  }

  /** 行内字符级差异高亮（持久化 'gm.diffPopupInline'，默认 '0' 关闭） */
  let inlineDiff = false;
  try {
    inlineDiff = localStorage.getItem('gm.diffPopupInline') === '1';
  } catch {
    inlineDiff = false;
  }

  /** 当前文件的差异块锚点（行索引列表，render 时重建；-1 表示尚无指向） */
  let changeAnchors: number[] = [];
  /** 当前指向的差异块在 anchors 中的下标（-1 未指向） */
  let changePointer = -1;
  /** 最近一次 render 的左右列行元素缓存（差异块跳转/高亮定位用） */
  let leftRowsCache: HTMLElement[] = [];
  let rightRowsCache: HTMLElement[] = [];

  /** 忽略空白重拉进行中标志：期间重拉按钮 disabled 防重复请求 */
  let refetching = false;
  /** 忽略空白开启时的局部 diffs（弹窗内部数据源；关闭时回退到传入 diffs） */
  let localDiffs: FileDiff[] | null = null;

  /** 文件列表弹层元素（null 表示未打开） */
  let filelistEl: HTMLElement | null = null;
  /** 文件列表打开期间的 document 点击监听（关闭列表时解绑） */
  let onFilelistDocClick: ((e: MouseEvent) => void) | null = null;

  // 工具栏对齐 IDEA（DiffRequestProcessor.getNavigationActions）：
  // 路径（左）+ 弹性间隔 + 差异块导航(↑↓) + 功能开关(view/ignoreWs/highlight/wrap) + ‹ n/m › + 设置 + ×
  // IDEA 源码顺序：PreviousDiff, NextDiff, [sep], Diff.PrevChange, GoToChange, Diff.NextChange
  const overlay = html`
    <div id="${OVERLAY_ID}" class="gm-diff-popup-overlay">
      <div class="gm-diff-popup">
        <div class="gm-diff-popup-toolbar">
          <span class="gm-diff-popup-path"></span>
          <span class="gm-diff-popup-spacer"></span>
          <button type="button" data-diff-popup-prev-change class="gm-diff-popup-nav-btn" title="${t('file.prevChange')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 18.75v-13.5"/>
              <path d="M6.75 10.5 12 5.25l5.25 5.25"/>
            </svg>
          </button>
          <button type="button" data-diff-popup-next-change class="gm-diff-popup-nav-btn" title="${t('file.nextChange')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5.25v13.5"/>
              <path d="M6.75 13.5 12 18.75l5.25-5.25"/>
            </svg>
          </button>
          <button type="button" data-diff-popup-view class="gm-diff-popup-wrap-btn" title="${t('file.toggleView')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="8" height="16" rx="1"/>
              <rect x="13" y="4" width="8" height="16" rx="1"/>
            </svg>
          </button>
          <button type="button" data-diff-popup-ignore-ws class="gm-diff-popup-wrap-btn" title="${t('file.toggleIgnoreWs')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16"/>
              <path d="M4 12h9"/>
              <path d="M4 18h16"/>
              <path d="M17 10l4 4M21 10l-4 4"/>
            </svg>
          </button>
          <button type="button" data-diff-popup-highlight class="gm-diff-popup-wrap-btn" title="${t('file.toggleHighlight')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3l6 6-7 7H5v-6z"/>
              <path d="M4 21h16"/>
            </svg>
          </button>
          <button type="button" data-diff-popup-wrap class="gm-diff-popup-wrap-btn" title="${t('file.toggleWrap')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16"/>
              <path d="M4 12h12a3 3 0 0 1 0 6h-3"/>
              <path d="M10 15l-3 3 3 3" transform="translate(0,-3)"/>
            </svg>
          </button>
          <div class="gm-diff-popup-nav">
            <button type="button" data-diff-popup-prev class="gm-diff-popup-nav-btn" title="${t('file.prevFile')}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 5.25 8.25 12 15 18.75"/>
              </svg>
            </button>
            <span data-diff-popup-count class="gm-diff-popup-count" title="${t('file.diffFilesList')}"></span>
            <button type="button" data-diff-popup-next class="gm-diff-popup-nav-btn" title="${t('file.nextFile')}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 5.25 15.75 12 9 18.75"/>
              </svg>
            </button>
          </div>
          <button type="button" data-diff-popup-settings class="gm-diff-popup-wrap-btn" title="${t('file.diffSettings')}"></button>
          <button type="button" data-diff-popup-close class="gm-diff-popup-close" title="${t('sidebar.close')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 6l12 12"/>
              <path d="M18 6 6 18"/>
            </svg>
          </button>
        </div>
        <div class="gm-diff-popup-body"></div>
      </div>
    </div>
  `;

  const pathEl = overlay.querySelector('.gm-diff-popup-path') as HTMLElement;
  const countEl = overlay.querySelector('[data-diff-popup-count]') as HTMLElement;
  const bodyEl = overlay.querySelector('.gm-diff-popup-body') as HTMLElement;
  /** 左列滚动容器（旧文件行） */
  const colLeft = document.createElement('div');
  colLeft.className = 'gm-diff-popup-col gm-diff-popup-col-left';
  /** 右列滚动容器（新文件行） */
  const colRight = document.createElement('div');
  colRight.className = 'gm-diff-popup-col gm-diff-popup-col-right';
  bodyEl.appendChild(colLeft);
  bodyEl.appendChild(colRight);
  const prevBtn = overlay.querySelector('[data-diff-popup-prev]') as HTMLButtonElement;
  const nextBtn = overlay.querySelector('[data-diff-popup-next]') as HTMLButtonElement;
  const wrapBtn = overlay.querySelector('[data-diff-popup-wrap]') as HTMLButtonElement;
  const viewBtn = overlay.querySelector('[data-diff-popup-view]') as HTMLButtonElement;
  const ignoreWsBtn = overlay.querySelector('[data-diff-popup-ignore-ws]') as HTMLButtonElement;
  const highlightBtn = overlay.querySelector('[data-diff-popup-highlight]') as HTMLButtonElement;
  const settingsBtn = overlay.querySelector('[data-diff-popup-settings]') as HTMLButtonElement;
  const prevChangeBtn = overlay.querySelector('[data-diff-popup-prev-change]') as HTMLButtonElement;
  const nextChangeBtn = overlay.querySelector('[data-diff-popup-next-change]') as HTMLButtonElement;
  // 齿轮图标：复用面板现有 gearSettings 图标
  settingsBtn.innerHTML = getIcon('gearSettings');

  /** 关闭文件列表弹层并解绑 document 点击监听（幂等） */
  const closeFileList = (): void => {
    if (!filelistEl) return;
    filelistEl.remove();
    filelistEl = null;
    if (onFilelistDocClick) {
      document.removeEventListener('click', onFilelistDocClick);
      onFilelistDocClick = null;
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'filelist_close',
    }));
  };

  /** 设置菜单弹层元素（null 表示未打开） */
  let settingsMenuEl: HTMLElement | null = null;
  /** 设置菜单打开期间的 document 点击监听（关闭菜单时解绑） */
  let onSettingsDocClick: ((e: MouseEvent) => void) | null = null;

  /** 关闭设置菜单弹层并解绑 document 点击监听（幂等） */
  const closeSettingsMenu = (): void => {
    if (!settingsMenuEl) return;
    settingsMenuEl.remove();
    settingsMenuEl = null;
    if (onSettingsDocClick) {
      document.removeEventListener('click', onSettingsDocClick);
      onSettingsDocClick = null;
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'settings_close',
    }));
  };

  /** 打开设置菜单弹层（挂在 overlay 内、设置按钮正下方；风格对齐文件列表弹层） */
  const openSettingsMenu = (): void => {
    if (closed || settingsMenuEl) return;
    const menu = document.createElement('div');
    menu.className = 'gm-diff-popup-settings-menu';

    /**
     * 构造一个 checkbox 设置项（「显示行号」等同款交互）
     * @param labelKey 文案 i18n key
     * @param checked 当前勾选态
     * @param onToggle 切换回调（返回切换后的新值）
     */
    const addCheckItem = (labelKey: string, checked: boolean, onToggle: (next: boolean) => void): void => {
      const item = document.createElement('div');
      item.className = 'gm-diff-popup-settings-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked;
      const label = document.createElement('span');
      label.textContent = t(labelKey);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !checkbox.checked;
        checkbox.checked = next;
        onToggle(next);
      });
      item.appendChild(checkbox);
      item.appendChild(label);
      menu.appendChild(item);
    };

    // 「显示行号」：点击切换 → body class 驱动 CSS 隐藏行号列
    addCheckItem('file.showLineNums', lineNums, (next) => {
      lineNums = next;
      try {
        localStorage.setItem('gm.diffPopupLineNums', lineNums ? '1' : '0');
      } catch {
        // localStorage 不可用时忽略，状态仅本次弹窗生效
      }
      bodyEl.classList.toggle('gm-diff-popup-hide-linenums', !lineNums);
      console.debug(JSON.stringify({
        prefix: '[diff-popup]',
        event: 'linenums_toggle',
        lineNums,
      }));
    });
    // 「显示空白符」：toggle → 持久化 → 重渲染（内容节点重画）
    addCheckItem('file.showWhitespace', showWhitespace, (next) => {
      showWhitespace = next;
      try {
        localStorage.setItem('gm.diffPopupWhitespace', showWhitespace ? '1' : '0');
      } catch {
        // localStorage 不可用时忽略
      }
      console.debug(JSON.stringify({
        prefix: '[diff-popup]',
        event: 'whitespace_toggle',
        showWhitespace,
      }));
      render();
    });
    // 「行内差异高亮」：toggle → 持久化 → 重渲染
    addCheckItem('file.inlineDiff', inlineDiff, (next) => {
      inlineDiff = next;
      try {
        localStorage.setItem('gm.diffPopupInline', inlineDiff ? '1' : '0');
      } catch {
        // localStorage 不可用时忽略
      }
      console.debug(JSON.stringify({
        prefix: '[diff-popup]',
        event: 'inline_diff_toggle',
        inlineDiff,
      }));
      render();
    });
    settingsMenuEl = menu;

    // 定位：overlay 为 fixed 全屏，坐标相对 overlay 计算（jsdom 下 rect 为 0，退化到右上角也不影响功能）
    const overlayRect = overlay.getBoundingClientRect();
    const btnRect = settingsBtn.getBoundingClientRect();
    menu.style.top = `${btnRect.bottom - overlayRect.top + 4}px`;
    menu.style.right = `${overlayRect.right - btnRect.right}px`;
    overlay.appendChild(menu);

    // 点击菜单外任意位置关闭；settings 按钮自身点击由其 toggle 处理，这里跳过
    onSettingsDocClick = (e) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menu.contains(target) || settingsBtn.contains(target)) return;
      closeSettingsMenu();
    };
    document.addEventListener('click', onSettingsDocClick);

    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'settings_open',
      lineNums,
    }));
  };

  /** 关闭弹窗并解绑监听（幂等） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    closeFileList();
    closeSettingsMenu();
    document.removeEventListener('keydown', onKeydown);
    colLeft.removeEventListener('scroll', onColScrollLeft);
    colRight.removeEventListener('scroll', onColScrollRight);
    overlay.remove();
    if (activeClose === close) activeClose = null;
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'close',
      index: currentIndex,
    }));
  };

  /** document 级键盘处理：仅弹窗打开期间存在，close 时必须解绑 */
  const onKeydown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    const tag = target && 'tagName' in target ? String(target.tagName).toLowerCase() : '';
    // 焦点在输入控件或 contenteditable 上时不拦截，交还给输入行为
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (target && typeof target.getAttribute === 'function') {
      if (target.getAttribute('contenteditable') !== null || target.isContentEditable) return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      // 文件列表/设置菜单开着时 Escape 只关最上层弹层，否则才关弹窗
      if (settingsMenuEl) {
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
    // ←/→ 始终消费按键（边缘也不泄漏给背景编辑器），但仅在可用时切换文件
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      step(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    // Alt+↑/↓ 差异块跳转（普通 ↑/↓ 滚动分支前判断，避免被滚动语义吃掉）
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      jumpChange(e.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    // ↑/↓ 垂直滚动：两列同步滚动（不切换文件语义）
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? -48 : 48;
      colLeft.scrollTop += delta;
      colRight.scrollTop += delta;
      return;
    }
  };

  /**
   * 切换到上一个/下一个文件；边缘禁用不循环（首尾/单文件时无任何动作）
   * @param delta 步进：1 下一个，-1 上一个
   */
  const step = (delta: number): void => {
    if (closed) return;
    const next = currentIndex + delta;
    if (next < 0 || next >= currentDiffs().length) {
      // 迭代边缘：不切换、不循环（对齐 IDEA 的边缘防误触设计）
      console.debug(JSON.stringify({
        prefix: '[diff-popup]',
        event: 'step_edge',
        index: currentIndex,
        delta,
      }));
      return;
    }
    currentIndex = next;
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'step',
      index: currentIndex,
    }));
    render();
  };

  /**
   * 跳转到指定文件（文件列表项点击等场景）
   * @param index 目标文件索引（越界时忽略）
   */
  const goToIndex = (index: number): void => {
    if (closed) return;
    if (index < 0 || index >= currentDiffs().length) return;
    currentIndex = index;
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'goto',
      index,
      path: currentDiffs()[index].path,
    }));
    render();
  };

  /**
   * 当前生效的差异列表：忽略空白重拉成功后为局部数据，否则为打开时传入的列表
   * @returns 差异列表
   */
  const currentDiffs = (): FileDiff[] => localDiffs ?? diffs;

  /** 打开文件列表弹层（挂在 overlay 内、n/m 计数正下方，右缘与计数对齐） */
  const openFileList = (): void => {
    if (closed || filelistEl) return;
    const list = document.createElement('div');
    list.className = 'gm-diff-popup-filelist';
    currentDiffs().forEach((item, i) => {
      const row = document.createElement('div');
      row.setAttribute('data-diff-popup-file-index', String(i));
      row.className = i === currentIndex
        ? 'gm-diff-popup-filelist-item gm-diff-popup-filelist-item-active'
        : 'gm-diff-popup-filelist-item';
      row.textContent = item.path;
      row.title = item.path;
      row.addEventListener('click', () => {
        goToIndex(i);
        closeFileList();
      });
      list.appendChild(row);
    });

    // 定位：overlay 为 fixed 全屏，坐标相对 overlay 计算（jsdom 下 rect 为 0，退化到右上角也不影响功能）
    const overlayRect = overlay.getBoundingClientRect();
    const countRect = countEl.getBoundingClientRect();
    list.style.top = `${countRect.bottom - overlayRect.top + 4}px`;
    list.style.right = `${overlayRect.right - countRect.right}px`;
    overlay.appendChild(list);
    filelistEl = list;

    // 点击列表外任意位置关闭列表；count 自身点击由其 toggle 处理，这里跳过
    onFilelistDocClick = (e) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (list.contains(target) || countEl.contains(target)) return;
      closeFileList();
    };
    document.addEventListener('click', onFilelistDocClick);

    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'filelist_open',
      count: currentDiffs().length,
      index: currentIndex,
    }));
  };

  /**
   * 按当前索引重建工具栏路径/计数/按钮禁用态与 body 差异内容
   * 响应全部偏好：viewMode（并排/单栏）、wrap、highlightWords、lineNums
   */
  const render = (): void => {
    if (closed) return;
    const allDiffs = currentDiffs();
    // 重拉后列表可能变短：索引越界时收敛到最后一个文件
    if (currentIndex >= allDiffs.length) currentIndex = allDiffs.length - 1;
    if (currentIndex < 0) currentIndex = 0;
    const diff = allDiffs[currentIndex]!;
    pathEl.textContent = diff.path;
    pathEl.title = diff.path;
    countEl.textContent = `${currentIndex + 1}/${allDiffs.length}`;

    // 边缘禁用：首尾与单文件时对应方向按钮 disabled（原生 disabled 使点击无效）
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === allDiffs.length - 1;

    // 差异块跳转指针：切文件即重置（render 即视为新文件入口），锚点在构建行后重建
    changePointer = -1;
    changeAnchors = [];

    // 文件列表打开时同步当前项高亮
    if (filelistEl) {
      for (const item of Array.from(filelistEl.querySelectorAll('[data-diff-popup-file-index]'))) {
        const idx = Number(item.getAttribute('data-diff-popup-file-index'));
        item.classList.toggle('gm-diff-popup-filelist-item-active', idx === currentIndex);
      }
    }

    // 偏好同步：自动换行 / 单栏视图 / 忽略空白 / 单词高亮（body class 驱动 CSS，按钮 class 驱动激活态）
    bodyEl.classList.toggle('gm-diff-popup-wrap', wrap);
    bodyEl.classList.toggle('gm-diff-popup-unified', viewMode === 'unified');
    bodyEl.classList.toggle('gm-diff-popup-hide-linenums', !lineNums);
    wrapBtn.classList.toggle('gm-diff-popup-wrap-btn-active', wrap);
    viewBtn.classList.toggle('gm-diff-popup-wrap-btn-active', viewMode === 'unified');
    ignoreWsBtn.classList.toggle('gm-diff-popup-ignorews-btn-active', ignoreWs);
    ignoreWsBtn.disabled = refetching;
    highlightBtn.classList.toggle('gm-diff-popup-wrap-btn-active', highlightWords);

    // 空态跨双列：先清掉列容器，再直接放 body；非空态则保证列容器在位
    const isEmpty = !diff.lines || diff.lines.length === 0;
    if (isEmpty) {
      colLeft.remove();
      colRight.remove();
      bodyEl.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'gm-diff-popup-empty';
      empty.textContent = t('file.noDiff');
      bodyEl.appendChild(empty);
      prevChangeBtn.disabled = true;
      nextChangeBtn.disabled = true;
      return;
    }
    bodyEl.innerHTML = '';
    bodyEl.appendChild(colLeft);
    bodyEl.appendChild(colRight);
    colLeft.innerHTML = '';
    colRight.innerHTML = '';

    const lines = diff.lines;
    const renderOpts: ContentRenderOptions = { showWhitespace, inlineDiff, wordHighlight: highlightWords };

    if (viewMode === 'unified') {
      // 单栏模式：diff.lines 线性渲染进左列（右列隐藏由 CSS 驱动）；
      // 配对补位由行号空位体现，不做配对补行
      const unifiedRows: HTMLElement[] = [];
      for (const line of lines) {
        const row = document.createElement('div');
        row.className = 'gm-diff-popup-row';
        // 单栏模式无并排配对信息：不做行内差异高亮（与 IDEA 单栏一致，仅整行着色）
        const otherText = '';
        row.appendChild(createUnifiedCell(line, renderOpts, otherText));
        colLeft.appendChild(row);
        unifiedRows.push(row);
      }
      leftRowsCache = unifiedRows;
      rightRowsCache = [];
      changeAnchors = buildChangeAnchors(lines, true);
      prevChangeBtn.disabled = changeAnchors.length === 0;
      nextChangeBtn.disabled = changeAnchors.length === 0;
      // 单栏无行高对齐需求：跳过 syncRowHeights
      return;
    }

    // 并排模式：左右两栏各自独立滚动，左行入左列、右行入右列（行内仍是单个 cell 包装）
    const leftRows: HTMLElement[] = [];
    const rightRows: HTMLElement[] = [];
    for (const row of buildSideBySideRows(lines)) {
      // 差异高亮配对文本：两侧都存在时互相提供对方文本（字符级/单词级共用）
      const leftOther = row.left && row.right ? row.right.content : '';
      const rightOther = row.left && row.right ? row.left.content : '';

      const leftRow = document.createElement('div');
      leftRow.className = 'gm-diff-popup-row';
      leftRow.appendChild(createCell(row.left, 'left', renderOpts, leftOther));
      colLeft.appendChild(leftRow);
      leftRows.push(leftRow);

      const rightRow = document.createElement('div');
      rightRow.className = 'gm-diff-popup-row';
      rightRow.appendChild(createCell(row.right, 'right', renderOpts, rightOther));
      colRight.appendChild(rightRow);
      rightRows.push(rightRow);
    }
    leftRowsCache = leftRows;
    rightRowsCache = rightRows;
    changeAnchors = buildChangeAnchors(lines, false);
    prevChangeBtn.disabled = changeAnchors.length === 0;
    nextChangeBtn.disabled = changeAnchors.length === 0;

    // 先强制 reflow 让 wrap 折行效果进入布局再测量（同一任务内读到的是折行前旧布局）
    void bodyEl.offsetHeight;
    syncRowHeights(leftRows, rightRows);
  };

  /**
   * 从 buildSideBySideRows 输出计算差异块锚点：
   * 连续 add/delete 行合并为一个块，锚点 = 块起始行在两列行数组中的索引。
   * 单栏模式直接在 diff.lines 上按同一规则取块起始索引。
   * @param lines 当前文件的差异行
   * @param unified 是否单栏模式
   * @returns 锚点行索引列表（升序）
   */
  const buildChangeAnchors = (lines: DiffLine[], unified: boolean): number[] => {
    const anchors: number[] = [];
    if (unified) {
      for (let i = 0; i < lines.length; i++) {
        const isChange = lines[i]!.type === 'add' || lines[i]!.type === 'delete';
        const prevIsChange = i > 0 && (lines[i - 1]!.type === 'add' || lines[i - 1]!.type === 'delete');
        if (isChange && !prevIsChange) anchors.push(i);
      }
      return anchors;
    }
    // 并排模式：两侧行同索引，任一侧该行含 add/delete 即块成员
    const rows = buildSideBySideRows(lines);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const isChange = (row.left && row.left.type !== 'context') || (row.right && row.right.type !== 'context');
      const prev = i > 0 ? rows[i - 1]! : null;
      const prevIsChange = !!prev
        && ((prev.left && prev.left.type !== 'context') || (prev.right && prev.right.type !== 'context'));
      if (isChange && !prevIsChange) anchors.push(i);
    }
    return anchors;
  };

  /** 清除所有行的差异块高亮 class */
  const clearChangeActive = (): void => {
    for (const el of overlay.querySelectorAll('.gm-diff-popup-change-active')) {
      el.classList.remove('gm-diff-popup-change-active');
    }
  };

  /**
   * 跳转到上一个/下一个差异块：不循环到头（边缘保持不动），目标行高亮并滚到列可视区中央。
   * 首次跳转：从指针最近的可解释位置出发（-1 时视为"第一个块之前"，↓ 取第 0 块、↑ 取最后一块）
   * @param delta 1 下一个块，-1 上一个块
   */
  const jumpChange = (delta: number): void => {
    if (closed || changeAnchors.length === 0) return;
    let next = changePointer + delta;
    if (next < 0 || next >= changeAnchors.length) {
      // 边缘不循环：首个块再往上 / 末个块再往下均保持原地
      console.debug(JSON.stringify({
        prefix: '[diff-popup]',
        event: 'jump_change_edge',
        pointer: changePointer,
        delta,
      }));
      return;
    }
    changePointer = next;
    const rowIndex = changeAnchors[changePointer]!;
    clearChangeActive();

    // 单栏：行全在左列；并排：优先落在含实际变更内容的一侧（delete 落左、add 落右）
    const viewModeUnified = bodyEl.classList.contains('gm-diff-popup-unified');
    const col = viewModeUnified
      ? colLeft
      : (colLeft.children[rowIndex]?.querySelector('.gm-diff-line-delete') ? colLeft : colRight);
    const rows = col === colLeft ? leftRowsCache : rightRowsCache;
    const targetRow = rows[rowIndex];
    if (targetRow) {
      targetRow.classList.add('gm-diff-popup-change-active');
      // 目标行滚到列可视区中央（两列同步 scrollTop，走既有同步机制）
      const rowTop = targetRow.offsetTop;
      const rowH = targetRow.offsetHeight;
      const colH = col.clientHeight;
      const scrollTop = rowH > 0 && colH > 0 ? Math.max(0, rowTop - (colH - rowH) / 2) : col.scrollTop;
      col.scrollTop = scrollTop;
      const other = col === colLeft ? colRight : colLeft;
      other.scrollTop = scrollTop;
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'jump_change',
      pointer: changePointer,
      row: rowIndex,
    }));
  };

  /**
   * 按索引同步两侧行高：取两侧 offsetHeight 的较大值设为双方 minHeight，
   * 保证 wrap 折行时左右同一索引的行底边对齐。
   * jsdom 中 offsetHeight 恒为 0，测量自动跳过（无副作用）。
   * @param leftRows 左列行元素列表
   * @param rightRows 右列行元素列表
   */
  const syncRowHeights = (leftRows: HTMLElement[], rightRows: HTMLElement[]): void => {
    const count = Math.min(leftRows.length, rightRows.length);
    for (let i = 0; i < count; i++) {
      const h = Math.max(leftRows[i]!.offsetHeight, rightRows[i]!.offsetHeight);
      if (h <= 0) continue; // jsdom 等无布局环境：跳过
      leftRows[i]!.style.minHeight = `${h}px`;
      rightRows[i]!.style.minHeight = `${h}px`;
    }
  };

  /** 垂直滚动同步防递归 flag：正在由程序同步时不再回写另一列 */
  let syncingScroll = false;

  /** 左列滚动 → 同步右列 scrollTop */
  const onColScrollLeft = (): void => {
    if (syncingScroll) return;
    syncingScroll = true;
    colRight.scrollTop = colLeft.scrollTop;
    syncingScroll = false;
  };

  /** 右列滚动 → 同步左列 scrollTop */
  const onColScrollRight = (): void => {
    if (syncingScroll) return;
    syncingScroll = true;
    colLeft.scrollTop = colRight.scrollTop;
    syncingScroll = false;
  };

  colLeft.addEventListener('scroll', onColScrollLeft);
  colRight.addEventListener('scroll', onColScrollRight);

  document.body.appendChild(overlay);

  // 按钮原生 disabled 拦截点击；step 内再做一次边缘判断兜底
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  // 差异块跳转按钮：与 Alt+↑/↓ 同一入口 jumpChange
  prevChangeBtn.addEventListener('click', () => jumpChange(-1));
  nextChangeBtn.addEventListener('click', () => jumpChange(1));
  // n/m 计数链接：切换文件列表；stopPropagation 避免冒泡触发 document 级"点外关闭"
  countEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (filelistEl) closeFileList();
    else openFileList();
  });
  // 自动换行开关：toggle 状态 → 持久化 → 重新渲染当前 diff → 按钮激活态随 render 同步
  wrapBtn.addEventListener('click', () => {
    wrap = !wrap;
    try {
      localStorage.setItem('gm.diffPopupWrap', wrap ? '1' : '0');
    } catch {
      // 隐私模式等 localStorage 不可用时忽略，状态仅本次弹窗生效
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'wrap_toggle',
      wrap,
    }));
    render();
  });
  // 视图切换开关：并排 ↔ 单栏，toggle 状态 → 持久化 → 重渲染
  viewBtn.addEventListener('click', () => {
    viewMode = viewMode === 'side' ? 'unified' : 'side';
    try {
      localStorage.setItem('gm.diffPopupView', viewMode);
    } catch {
      // localStorage 不可用时忽略，状态仅本次弹窗生效
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'view_toggle',
      viewMode,
    }));
    render();
  });
  // 忽略空白开关：toggle 状态 → 持久化 → 经 refetch 重拉差异（未提供 refetch 时仅切状态）
  ignoreWsBtn.addEventListener('click', () => {
    ignoreWs = !ignoreWs;
    try {
      localStorage.setItem('gm.diffPopupIgnoreWs', ignoreWs ? '1' : '0');
    } catch {
      // localStorage 不可用时忽略，状态仅本次弹窗生效
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'ignore_ws_toggle',
      ignoreWs,
    }));
    // 未提供重拉通道（无 options.refetch）：只做本地状态切换 + 重渲染
    if (!options.refetch) {
      render();
      return;
    }
    // 重拉进行中：按钮 disabled（render 同步），成功换数据重渲染，失败 logError 保留原数据
    refetching = true;
    render();
    options.refetch(ignoreWs)
      .then((next) => {
        if (closed) return;
        // 拷贝成局部数据源，避免污染调用方传入的列表；关闭忽略空白时回退原数据
        localDiffs = ignoreWs ? next.map((d) => ({ ...d, lines: [...d.lines] })) : null;
        console.debug(JSON.stringify({
          prefix: '[diff-popup]',
          event: 'ignore_ws_refetched',
          count: next.length,
        }));
      })
      .catch((err: unknown) => {
        console.error(JSON.stringify({
          prefix: '[diff-popup]',
          event: 'ignore_ws_refetch_error',
          error: String(err),
        }));
      })
      .finally(() => {
        if (closed) return;
        refetching = false;
        render();
      });
  });
  // 单词高亮开关：纯前端 toggle → 持久化 → 重渲染
  highlightBtn.addEventListener('click', () => {
    highlightWords = !highlightWords;
    try {
      localStorage.setItem('gm.diffPopupHighlight', highlightWords ? '1' : '0');
    } catch {
      // localStorage 不可用时忽略，状态仅本次弹窗生效
    }
    console.debug(JSON.stringify({
      prefix: '[diff-popup]',
      event: 'highlight_toggle',
      highlightWords,
    }));
    render();
  });
  // 设置按钮：toggle 设置菜单；stopPropagation 避免冒泡触发 document 级"点外关闭"
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (settingsMenuEl) closeSettingsMenu();
    else openSettingsMenu();
  });
  overlay.querySelector('[data-diff-popup-close]')?.addEventListener('click', close);
  // 点击遮罩（非对话框内容）关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
  activeClose = close;

  render();

  console.debug(JSON.stringify({
    prefix: '[diff-popup]',
    event: 'show',
    count: diffs.length,
    startIndex,
    path: diffs[startIndex].path,
  }));

  return { dispose: close };
}