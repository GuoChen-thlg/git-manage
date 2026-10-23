/**
 * 弹窗组件
 * 各种对话框：新建分支、重命名、日期过滤等
 */

import { html } from '../html';
import { getState, setState, Branch } from '../state';
import { ServiceClient } from '../service';
import { t } from '../i18n';

/** 显示重命名对话框 */
export function showRenameDialog(branch: Branch, service: ServiceClient, directory: string): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('dialog.renameBranch')}: ${branch.name}</div>
        <input id="rename-input" type="text" value="${branch.name}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="rename-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.cancel')}</button>
          <button id="rename-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('dialog.ok')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#rename-input') as HTMLInputElement;
  input.focus();
  input.select();

  const close = () => overlay.remove();

  overlay.querySelector('#rename-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#rename-ok')?.addEventListener('click', async () => {
    const newName = input.value.trim();
    if (!newName || newName === branch.name) {
      close();
      return;
    }
    try {
      await service.renameBranch(directory, branch.name, newName);
      const branches = await service.getBranches(directory);
      setState(s => { s.branches = branches; });
    } catch (e) {
      console.error('[git-manager] 重命名分支失败:', e);
    }
    close();
  });
}

/** 显示新建分支对话框 @param startPoint 起点提交（可选）：选中提交时基于该提交建分支，省略则基于当前 HEAD */
export function showCreateBranchDialog(service: ServiceClient, directory: string, startPoint?: string): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('dialog.createBranchTitle')}</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${t('dialog.startPoint')}：${startPoint ? startPoint.slice(0, 8) : t('dialog.currentHead')}</div>
        <input id="new-branch-input" type="text" placeholder="${t('dialog.inputBranchName')}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="create-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.cancel')}</button>
          <button id="create-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('dialog.create')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#new-branch-input') as HTMLInputElement;
  input.focus();

  const close = () => overlay.remove();

  overlay.querySelector('#create-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const doCreate = async () => {
    const name = input.value.trim();
    if (!name) return;
    void service.debugLog?.('create-branch-submit', { name, startPoint: startPoint ?? null });
    try {
      await service.createNewBranch(directory, name, startPoint);
      const branches = await service.getBranches(directory);
      setState(s => { s.branches = branches; });
    } catch (e) {
      console.error('[git-manager] 创建分支失败:', e);
    }
    close();
  };

  overlay.querySelector('#create-ok')?.addEventListener('click', doCreate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doCreate();
  });
}

/** 显示日期过滤对话框 */
export function showDateFilterDialog(): void {
  const state = getState();

  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('dialog.dateFilter')}</div>
        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t('dialog.startDate')}</div>
          <input id="date-from" type="date" value="${state.filterDateFrom}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t('dialog.endDate')}</div>
          <input id="date-to" type="date" value="${state.filterDateTo}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="date-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.cancel')}</button>
          <button id="date-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.clear')}</button>
          <button id="date-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('dialog.ok')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('#date-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#date-clear')?.addEventListener('click', () => {
    setState(s => {
      s.filterDateFrom = '';
      s.filterDateTo = '';
    });
    close();
  });

  overlay.querySelector('#date-ok')?.addEventListener('click', () => {
    const from = (overlay.querySelector('#date-from') as HTMLInputElement).value;
    const to = (overlay.querySelector('#date-to') as HTMLInputElement).value;
    setState(s => {
      s.filterDateFrom = from;
      s.filterDateTo = to;
    });
    close();
  });
}

/** 显示重置对话框 */
export function showResetDialog(hash: string, service: ServiceClient, directory: string): void {
  // 重置模式限定为 git reset 的三种模式字面量，与 service.reset 的 mode 参数联合类型对齐
  let selectedMode: 'soft' | 'mixed' | 'hard' = 'mixed';

  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 360px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('dialog.resetTo', { hash })}</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 8px;">${t('dialog.selectResetMode')}</div>
        <div id="reset-modes" style="margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #ccc; padding: 4px 0; cursor: pointer;">
            <input type="radio" name="reset-mode" value="soft" style="margin: 0;" />
            ${t('dialog.resetSoft')}
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #ccc; padding: 4px 0; cursor: pointer;">
            <input type="radio" name="reset-mode" value="mixed" checked style="margin: 0;" />
            ${t('dialog.resetMixed')}
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #ccc; padding: 4px 0; cursor: pointer;">
            <input type="radio" name="reset-mode" value="hard" style="margin: 0;" />
            ${t('dialog.resetHard')}
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="reset-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.cancel')}</button>
          <button id="reset-ok" style="padding: 4px 12px; background: #b71c1c; border: 1px solid #c62828; border-radius: 3px; color: #fff; cursor: pointer;">${t('dialog.reset')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('#reset-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#reset-modes')?.addEventListener('click', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'reset-mode') {
      // radio 的 value 由本对话框模板固定为三种模式之一，运行时断言收窄为联合类型
      selectedMode = target.value as 'soft' | 'mixed' | 'hard';
    }
  });

  overlay.querySelector('#reset-ok')?.addEventListener('click', async () => {
    try {
      await service.reset(directory, hash, selectedMode);
      const branches = await service.getBranches(directory);
      setState(s => { s.branches = branches; });
    } catch (e) {
      console.error('[git-manager] 重置分支失败:', e);
    }
    close();
  });
}

/**
 * 显示"跳转到引用"对话框
 * 跳转逻辑由调用方通过 onSubmit 注入，本函数只负责输入收集与结果反馈：
 * onSubmit 返回 true 关闭对话框；返回 false 在对话框内显示未找到提示且保持打开
 * @param onSubmit 提交查询的回调，入参为去除首尾空白后的查询串，返回是否跳转成功
 */
export function showGotoDialog(onSubmit: (query: string) => boolean): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('goto.title')}</div>
        <input id="goto-input" type="text" placeholder="${t('goto.placeholder')}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 8px;" />
        <div id="goto-error" style="display: none; font-size: 11px; color: #f44336; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="goto-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('dialog.cancel')}</button>
          <button id="goto-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('goto.ok')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#goto-input') as HTMLInputElement;
  const errorEl = overlay.querySelector('#goto-error') as HTMLElement;
  input.focus();

  const close = () => overlay.remove();

  /** 隐藏"未找到"提示 */
  const clearError = () => {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  };

  /** 确认跳转：空输入不提交，失败时显示提示且不关闭 */
  const submit = () => {
    const query = input.value.trim();
    if (!query) return;
    if (onSubmit(query)) {
      close();
      return;
    }
    errorEl.textContent = t('goto.notFound');
    errorEl.style.display = 'block';
  };

  overlay.querySelector('#goto-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 输入变化后清除上一次的失败提示
  input.addEventListener('input', clearError);

  overlay.querySelector('#goto-ok')?.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

/**
 * 显示自定义日期范围对话框
 * 确定：from > to 时自动交换顺序（输出 [dialog] 前缀结构化日志），空值表示该侧不限；
 * 清除：以空串区间回调（两侧都不限）；
 * 取消 / Escape / 点遮罩：关闭且不回调
 * @param onApply 应用区间的回调（确定或清除时触发，入参为 ISO 日期或空串）
 * @returns 关闭函数（幂等，可提前关闭对话框）
 */
export function showDateRangeDialog(
  onApply: (range: { from: string; to: string }) => void,
): () => void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('filter.date')}</div>
        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t('filter.dateFrom')}</div>
          <input id="daterange-from" type="date" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t('filter.dateTo')}</div>
          <input id="daterange-to" type="date" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="daterange-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('filter.ok')}</button>
          <button id="daterange-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.clear')}</button>
          <button id="daterange-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.cancel')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let closed = false;

  /** 关闭对话框并注销 Escape 监听（幂等：重复调用无副作用） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /** Escape 键关闭（不回调） */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  overlay.querySelector('#daterange-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 确定：起止倒置时交换（打日志），空值放行（该侧不限），回调后关闭
  overlay.querySelector('#daterange-ok')?.addEventListener('click', () => {
    const fromInput = overlay.querySelector('#daterange-from') as HTMLInputElement;
    const toInput = overlay.querySelector('#daterange-to') as HTMLInputElement;
    let from = fromInput.value;
    let to = toInput.value;
    if (from && to && from > to) {
      console.debug(JSON.stringify({ prefix: '[dialog]', event: 'date_range_swap', from, to }));
      [from, to] = [to, from];
    }
    onApply({ from, to });
    close();
  });

  // 清除：回调空串区间（两侧都不限）
  overlay.querySelector('#daterange-clear')?.addEventListener('click', () => {
    onApply({ from: '', to: '' });
    close();
  });

  return close;
}

/** 路径选择数量上限（对齐 IDEA MAX_FOLDERS=100） */
const MAX_SELECTABLE_PATHS = 100;

/**
 * 解析多行路径文本：按行拆分 → trim → 过滤空串 → 保序去重
 * @param raw 多行原始文本（每行一个仓库相对路径）
 * @returns 去重后的路径数组（可能为空数组）
 */
function parsePathLines(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of raw.split('\n')) {
    const path = line.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    result.push(path);
  }
  return result;
}

/**
 * 多行路径编辑对话框（对齐 IDEA "Edit Folders…"）
 * 结构与 showDateRangeDialog 一致：遮罩 + 居中卡片，Escape / 点遮罩关闭且不回调
 * 确定：解析后回调（去空行、trim、去重），超过 100 项时行内提示且不回调不关闭；
 * 清除：以空数组回调后关闭；取消：仅关闭不回调
 * @param selected 当前已选路径（textarea 预填，每行一个）
 * @param onApply 确定：解析后的路径数组（去空行、trim、去重）；清除：空数组；取消：不回调
 */
export function showPathFilterDialog(
  selected: string[],
  onApply: (paths: string[]) => void,
): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('filter.path')}</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t('filter.editPaths')}</div>
        <textarea id="pathfilter-input" placeholder="${t('dialog.pathPlaceholder')}" style="width: 100%; height: 120px; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 8px; resize: vertical; font-family: inherit;">${selected.join('\n')}</textarea>
        <div id="pathfilter-hint" style="display: none; font-size: 11px; color: #ffb300; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="pathfilter-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('filter.ok')}</button>
          <button id="pathfilter-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.clear')}</button>
          <button id="pathfilter-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.cancel')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let closed = false;

  /** 关闭对话框并注销 Escape 监听（幂等：重复调用无副作用） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /** Escape 键关闭（不回调） */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  const input = overlay.querySelector('#pathfilter-input') as HTMLTextAreaElement;
  const hintEl = overlay.querySelector('#pathfilter-hint') as HTMLElement;

  /** 显示行内提示（如超限） */
  const showHint = (message: string): void => {
    hintEl.textContent = message;
    hintEl.style.display = 'block';
  };

  /** 隐藏行内提示 */
  const hideHint = (): void => {
    hintEl.textContent = '';
    hintEl.style.display = 'none';
  };

  // 输入变化后清除上一次的超限提示
  input.addEventListener('input', hideHint);

  overlay.querySelector('#pathfilter-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 确定：解析多行输入后回调；超过 100 项仅行内提示（不回调、不关闭）
  overlay.querySelector('#pathfilter-ok')?.addEventListener('click', () => {
    const paths = parsePathLines(input.value);
    if (paths.length > MAX_SELECTABLE_PATHS) {
      showHint(t('filter.maxPaths'));
      console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_filter_overflow', count: paths.length }));
      return;
    }
    console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_filter_apply', paths }));
    onApply(paths);
    close();
  });

  // 清除：回调空数组（等价于取消路径过滤）
  overlay.querySelector('#pathfilter-clear')?.addEventListener('click', () => {
    console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_filter_clear' }));
    onApply([]);
    close();
  });
}

/** 路径勾选树节点（目录 / 文件） */
interface PathTreeNode {
  /** 完整相对路径，同时作为过滤 pathspec */
  path: string;
  /** 展示名（最后一段；孤儿路径为原串） */
  name: string;
  /** 是否目录 */
  isDir: boolean;
  /** 子节点（仅目录有） */
  children: PathTreeNode[];
}

/** 节点三态显示：on 全勾 / half 半选 / off 未勾 */
type PathCheckState = 'on' | 'half' | 'off';

/**
 * 由已跟踪文件列表构建目录树
 * 按 '/' 切分段逐层建节点；排序为目录在前、文件在后，各自字母序（码元序）
 * 兼容"同一路径先作文件、后又被更深层路径当作目录前缀"的冲突：后到的目录用途会把节点升级为目录
 * @param files 仓库相对路径列表（listFiles / git ls-files 输出）
 * @returns 根节点数组与 path→节点 索引
 */
function buildPathTree(files: string[]): { roots: PathTreeNode[]; byPath: Map<string, PathTreeNode> } {
  const roots: PathTreeNode[] = [];
  const byPath = new Map<string, PathTreeNode>();

  for (const file of files) {
    if (!file) continue;
    const segments = file.split('/');
    let parentNode: PathTreeNode | null = null;
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue; // 容错：连续 '/' 产生的空段
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isLast = i === segments.length - 1;
      let node = byPath.get(currentPath);
      if (!node) {
        node = { path: currentPath, name: segment, isDir: !isLast, children: [] };
        byPath.set(currentPath, node);
        if (parentNode) parentNode.children.push(node);
        else roots.push(node);
      } else if (!isLast) {
        node.isDir = true; // 该路径被更深文件用作目录前缀 → 升级为目录
      }
      parentNode = node;
    }
  }

  sortPathNodes(roots);
  return { roots, byPath };
}

/**
 * 目录在前、同组按字母序（码元序）递归排序
 * @param nodes 待排序节点数组（就地修改）
 */
function sortPathNodes(nodes: PathTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
  for (const node of nodes) {
    if (node.children.length > 0) sortPathNodes(node.children);
  }
}

/**
 * 列出路径的全部祖先路径（由外到内，不含自身）
 * @param path 仓库相对路径
 * @returns 祖先路径数组，如 'a/b/c' → ['a', 'a/b']
 */
function ancestorPathsOf(path: string): string[] {
  const segments = path.split('/');
  const result: string[] = [];
  let acc = '';
  for (let i = 0; i < segments.length - 1; i++) {
    if (!segments[i]) continue;
    acc = acc ? `${acc}/${segments[i]}` : segments[i];
    result.push(acc);
  }
  return result;
}

/**
 * 自底向上一次遍历计算整棵树的三态显示
 * "已勾" = 自身在集合中 或 任意祖先在集合中（派生勾选）；
 * 目录仅部分子项勾中 → 半选；全部子项均为全勾 → 显示为全勾
 * @param roots 根节点数组（含渲染到根层的孤儿路径）
 * @param selected 当前已选集合
 * @returns path → 显示状态
 */
function computeCheckStates(
  roots: PathTreeNode[],
  selected: Set<string>,
): Map<string, PathCheckState> {
  const states = new Map<string, PathCheckState>();

  const walk = (node: PathTreeNode): PathCheckState => {
    const covered = selected.has(node.path)
      || ancestorPathsOf(node.path).some(p => selected.has(p));
    let state: PathCheckState;
    if (covered) {
      state = 'on';
    } else if (node.children.length === 0) {
      state = 'off';
    } else {
      const childStates = node.children.map(walk);
      const checkedCount = childStates.filter(s => s !== 'off').length;
      if (checkedCount === 0) state = 'off';
      else if (checkedCount === childStates.length && childStates.every(s => s === 'on')) state = 'on';
      else state = 'half';
    }
    states.set(node.path, state);
    if (covered) {
      // 被祖先覆盖的子树：子节点派生为"勾"，仍需逐个登记状态供渲染取用
      node.children.forEach(walk);
    }
    return state;
  };

  roots.forEach(walk);
  return states;
}

/**
 * 沿 祖先→目标 路径逐层补齐兄弟节点（IDEA 反选规则的补集部分）
 * 每层把除"路径下一跳"外的兄弟全部入集合，最后一层除目标外全部入集合，
 * 从而在移除最近已勾祖先后，除目标节点外全部保持勾选显示
 * @param selected 当前已选集合（就地修改）
 * @param byPath path→节点 索引（中间层缺失时提前终止）
 * @param ancestor 被移除的最近已勾祖先
 * @param target 被点击的目标节点路径
 */
function fillSiblingsAlongPath(
  selected: Set<string>,
  byPath: Map<string, PathTreeNode>,
  ancestor: string,
  target: string,
): void {
  const segments = target.slice(ancestor.length + 1).split('/').filter(Boolean);
  let parentPath = ancestor;
  for (const segment of segments) {
    const parentNode = byPath.get(parentPath);
    if (!parentNode) break; // 中间层在树中缺失（孤儿路径）→ 无兄弟可补
    const nextHop = `${parentPath}/${segment}`;
    for (const child of parentNode.children) {
      if (child.path !== nextHop) selected.add(child.path);
    }
    parentPath = nextHop;
  }
}

/**
 * 路径勾选树对话框（对齐 IntelliJ IDEA VcsStructureChooser，标题 filter.selectPaths）
 * 数据源：service.listFiles = `git ls-files`，仅返回已跟踪文件——
 * 未跟踪文件没有提交历史，`git log -- 路径` 对其过滤本就无意义，故不在候选内
 * 勾选集合值即过滤 pathspec：目录整勾只存目录本身，不展开为海量子项
 * 三态显示：节点"已勾" = 自身在集合 或 任意祖先在集合（派生勾选）；仅部分子项勾中时父目录显示半选
 * 点击规则（IDEA）：
 * - 点未勾节点 → 整节点入集合
 * - 点在集合中的节点 → 出集合
 * - 点"被祖先覆盖而显示为勾"的节点 X（自身不在集合）→ 移除最近已勾祖先 A，
 *   再沿 A→X 路径逐层补齐兄弟（除下一跳外全部入集合），保证除 X 外全部保持勾选
 * 每次点击后集合大小 > 100（IDEA MAX_FOLDERS）→ 行内提示 filter.maxPaths 并回滚本次点击
 * 打开即调 listFiles 构建目录树；目录可展开/折叠（▸/▾），只渲染展开分支以控制大仓库 DOM
 * @param service 服务客户端（用 listFiles 拉仓库已跟踪文件）
 * @param directory 仓库目录
 * @param selected 当前已选路径（预勾选/预派生；不在列表中的路径渲染到根层，保证不丢值）
 * @param onApply 确定：选中数组（≤100）；清除：空数组；取消：不回调
 */
export function showPathTreeDialog(
  service: ServiceClient,
  directory: string,
  selected: string[],
  onApply: (paths: string[]) => void,
): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 360px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('filter.selectPaths')}</div>
        <div id="pathtree-list" style="height: 240px; overflow: auto; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; padding: 4px 0; box-sizing: border-box;"></div>
        <div id="pathtree-hint" style="display: none; font-size: 11px; color: #ffb300; margin-top: 6px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
          <button id="pathtree-ok" disabled style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t('filter.ok')}</button>
          <button id="pathtree-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.clear')}</button>
          <button id="pathtree-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.cancel')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  /** 已选集合：值即过滤 pathspec（目录整勾只存目录本身） */
  const selectedSet = new Set<string>(selected);
  /** 展开中的目录路径集合（只渲染展开分支） */
  const expanded = new Set<string>();
  let roots: PathTreeNode[] = [];
  let byPath = new Map<string, PathTreeNode>();
  /** selected 中不在列表中的路径：常驻渲染到根层，保证不丢值 */
  let orphanPaths: string[] = [];
  let loaded = false;
  let failed = false;
  let closed = false;

  const listEl = overlay.querySelector('#pathtree-list') as HTMLElement;
  const hintEl = overlay.querySelector('#pathtree-hint') as HTMLElement;
  const okBtn = overlay.querySelector('#pathtree-ok') as HTMLButtonElement;

  /** 关闭对话框并注销 Escape 监听（幂等：重复调用无副作用） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /** Escape 键关闭（不回调） */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  /** 显示行内提示（超限回滚时） */
  const showHint = (message: string): void => {
    hintEl.textContent = message;
    hintEl.style.display = 'block';
  };

  /** 隐藏行内提示 */
  const hideHint = (): void => {
    hintEl.textContent = '';
    hintEl.style.display = 'none';
  };

  /** 点击勾选区：按 IDEA 规则增删集合，超 100 行内提示并回滚本次点击 */
  const handleCheckClick = (path: string): void => {
    const snapshot = new Set(selectedSet);
    if (selectedSet.has(path)) {
      selectedSet.delete(path);
    } else {
      // 由外到内排列，reverse 后取最近（最深）的已勾祖先
      const coveredAncestor = ancestorPathsOf(path).reverse().find(p => selectedSet.has(p));
      if (coveredAncestor) {
        // 被祖先覆盖而显示为勾：移除最近已勾祖先，再沿路径补齐兄弟，仅目标取消勾选
        selectedSet.delete(coveredAncestor);
        fillSiblingsAlongPath(selectedSet, byPath, coveredAncestor, path);
      } else {
        selectedSet.add(path);
      }
    }
    if (selectedSet.size > MAX_SELECTABLE_PATHS) {
      // 回滚本次点击（IDEA MAX_FOLDERS=100）
      selectedSet.clear();
      for (const value of snapshot) selectedSet.add(value);
      showHint(t('filter.maxPaths'));
      console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_tree_overflow', size: snapshot.size }));
    } else {
      hideHint();
    }
    render();
  };

  /** 渲染单个节点行及其展开的子行 */
  const renderNode = (
    node: PathTreeNode,
    depth: number,
    states: Map<string, PathCheckState>,
    container: HTMLElement,
  ): void => {
    const state = states.get(node.path) ?? 'off';
    const expandable = node.isDir && node.children.length > 0;
    const isExpanded = expanded.has(node.path);

    const row = document.createElement('div');
    row.className = 'pathtree-row';
    row.dataset.path = node.path;
    row.dataset.depth = String(depth);
    row.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 2px 6px 2px ${6 + depth * 14}px; cursor: pointer; font-size: 12px; color: #ccc;`;

    const toggle = document.createElement('span');
    toggle.className = 'pathtree-toggle';
    toggle.style.cssText = 'width: 12px; flex: none; display: inline-block; text-align: center; user-select: none;';
    toggle.textContent = expandable ? (isExpanded ? '▾' : '▸') : '';
    row.appendChild(toggle);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = state === 'on';
    checkbox.indeterminate = state === 'half';
    row.appendChild(checkbox);

    const label = document.createElement('span');
    label.textContent = node.name; // textContent 赋值天然转义，路径不含注入风险
    row.appendChild(label);

    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('pathtree-toggle')) {
        if (!expandable) return;
        if (expanded.has(node.path)) expanded.delete(node.path);
        else expanded.add(node.path);
        render();
        return;
      }
      handleCheckClick(node.path);
    });

    container.appendChild(row);
    if (expandable && isExpanded) {
      for (const child of node.children) renderNode(child, depth + 1, states, container);
    }
  };

  /** 重渲染列表：每次交互后整表重建，只包含展开分支 */
  const render = (): void => {
    if (closed) return;
    listEl.innerHTML = '';
    if (failed) {
      const error = document.createElement('div');
      error.id = 'pathtree-error';
      error.style.cssText = 'padding: 8px; font-size: 12px; color: #f44336;';
      error.textContent = t('filter.loadPathsFailed');
      listEl.appendChild(error);
      return;
    }
    if (!loaded) return; // 加载中：容器留空

    // 根层 = 树根 + 孤儿路径（选中但不在列表中的值），同一规则排序
    const nodes: PathTreeNode[] = [...roots];
    for (const path of orphanPaths) {
      nodes.push({ path, name: path, isDir: false, children: [] });
    }
    sortPathNodes(nodes);

    if (nodes.length === 0) {
      const empty = document.createElement('div');
      empty.id = 'pathtree-empty';
      empty.style.cssText = 'padding: 8px; font-size: 12px; color: #888;';
      empty.textContent = t('filter.noPaths');
      listEl.appendChild(empty);
      okBtn.disabled = true;
      return;
    }
    okBtn.disabled = false;
    const states = computeCheckStates(nodes, selectedSet);
    for (const node of nodes) renderNode(node, 0, states, listEl);
  };

  overlay.querySelector('#pathtree-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 确定：回调当前集合（≤100）后关闭
  okBtn.addEventListener('click', () => {
    const paths = [...selectedSet];
    console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_tree_apply', count: paths.length }));
    onApply(paths);
    close();
  });

  // 清除：集合清空并回调空数组后关闭
  overlay.querySelector('#pathtree-clear')?.addEventListener('click', () => {
    selectedSet.clear();
    console.debug(JSON.stringify({ prefix: '[dialog]', event: 'path_tree_clear' }));
    onApply([]);
    close();
  });

  render(); // 初始占位（加载中留空），数据到达后重渲染

  // 打开即拉取已跟踪文件列表（git ls-files）并构建目录树
  service.listFiles(directory)
    .then((files) => {
      if (closed) return;
      const tree = buildPathTree(files ?? []);
      roots = tree.roots;
      byPath = tree.byPath;
      orphanPaths = [...selected].filter(p => !byPath.has(p));
      // 顶层目录默认展开：首屏可见一层层级，更深目录按需展开以控制 DOM
      for (const node of roots) {
        if (node.isDir && node.children.length > 0) expanded.add(node.path);
      }
      loaded = true;
      render();
    })
    .catch((e) => {
      if (closed) return;
      failed = true;
      console.error(JSON.stringify({ prefix: '[dialog]', event: 'list_files_error', directory, error: String(e) }));
      render();
    });
}

/**
 * 解析删除分支失败的错误信息（dialogs 与 context-menu 共用）
 * service 调用失败时 e.message 为 JSON 字符串（如 {"code":"NOT_MERGED","message":"..."}）；
 * 非 JSON（如网络层错误）时原样透出
 * @param e service.deleteBranch / onConfirm reject 的错误值
 * @returns 结构化 code（可缺省）与就地展示的文案
 */
export function parseDeleteBranchError(e: unknown): { code?: string; message: string } {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; message?: unknown };
    if (parsed && typeof parsed === 'object') {
      return {
        code: typeof parsed.code === 'string' ? parsed.code : undefined,
        message: typeof parsed.message === 'string' ? parsed.message : raw,
      };
    }
  } catch {
    // 非 JSON（网络层错误等）→ 原样显示
  }
  return { message: raw };
}

/**
 * 未合并强制删除分支对话框（对齐 IDEA GitDeleteBranchOperation）
 * 仅在服务端返回 NOT_MERGED 时由调用方打开，打开即强制模式（正文 forceDelete、按钮强制删除）：
 * 确认 → onConfirm(true)；resolve = 成功（对话框关闭）；
 * reject = 失败按 code 就地显示（NOT_FOUND / GIT_ERROR / 非 JSON 原样），对话框保持打开
 * @param branchName 分支名
 * @param onConfirm 执行强制删除；resolve = 成功（对话框关闭）；reject = 失败（错误就地显示，对话框保持打开）
 */
export function showDeleteBranchDialog(
  branchName: string,
  onConfirm: (force: boolean) => Promise<void>,
): void {
  const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div id="delete-branch-message" style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t('branch.forceDelete', { name: branchName })}</div>
        <div id="delete-branch-error" style="display: none; font-size: 11px; color: #f44336; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="delete-branch-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t('filter.cancel')}</button>
          <button id="delete-branch-ok" style="padding: 4px 12px; background: #b71c1c; border: 1px solid #c62828; border-radius: 3px; color: #fff; cursor: pointer;">${t('branch.forceDeleteButton')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  /** 确认进行中（防重复提交：按钮禁用 + 哨兵） */
  let pending = false;
  let closed = false;

  const errorEl = overlay.querySelector('#delete-branch-error') as HTMLElement;
  const okBtn = overlay.querySelector('#delete-branch-ok') as HTMLButtonElement;

  /** 关闭对话框并注销 Escape 监听（幂等：重复调用无副作用） */
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  /** Escape 键关闭（不回调） */
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  /** 错误区就地显示 */
  const showError = (message: string): void => {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  };

  /** 隐藏错误提示 */
  const hideError = (): void => {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  };

  /** 确认强制删除：先禁用按钮防重复；成功关闭，失败按 code 就地呈现且保持打开 */
  const submit = async (): Promise<void> => {
    if (pending) return;
    pending = true;
    okBtn.disabled = true;
    hideError();
    console.debug(JSON.stringify({ prefix: '[dialog]', event: 'branch_delete_confirm', branch: branchName, force: true }));
    try {
      await onConfirm(true);
      close();
    } catch (e) {
      const { code, message } = parseDeleteBranchError(e);
      if (code === 'NOT_FOUND') {
        showError(t('branch.notFound', { name: branchName }));
      } else if (code === 'GIT_ERROR') {
        showError(`${t('branch.deleteFailed')}: ${message}`);
      } else {
        // 非 JSON（网络层等）与未知 code 原样展示
        showError(message);
      }
      console.debug(JSON.stringify({
        prefix: '[dialog]',
        event: 'branch_delete_failed',
        branch: branchName,
        code: code ?? null,
        message,
      }));
    } finally {
      pending = false;
      if (!closed) okBtn.disabled = false;
    }
  };

  overlay.querySelector('#delete-branch-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  okBtn.addEventListener('click', () => { void submit(); });
}
