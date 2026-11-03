/**
 * 面板状态对象
 * 从 script.ts 原样迁移，字段含义见各注释
 */

import type { Branch, Commit, CommitDetail, FileDiff } from './protocol';

/** 面板全局状态（单例） */
export const state = {  branches: [] as Branch[],
  commits: [] as Commit[],
  selectedBranch: null as string | null,
  // Cmd/Ctrl 多选的分支集合，删除等批量操作用
  selectedBranches: new Set<string>(),
  selectedCommit: null as string | null,
  detail: null as CommitDetail | null,
  diffs: [] as FileDiff[],
  collapsed: { local: false, remote: true },
  error: null as string | null,
  // 界面状态（与现有面板对齐）
  branchPanelHidden: false,
  branchFilter: '',
  search: '',
  useRegex: false,
  caseSensitive: false,
  filterBranch: null as string | null,
  filterUser: null as string | null,
  filterDateFrom: null as string | null,
  filterDateTo: null as string | null,
  filterPath: null as string | null,
  favorite: new Set<string>(),
  myBranches: new Set<string>(),
  onlyMyBranches: false,
  // 底部页签
  bottomTab: null as string | null,
  commandLogs: [] as Array<{ id?: number; command: string; ok?: boolean; durationMs?: number; stderr?: string; stdout?: string }>,
  worktrees: [] as Array<{ path: string; branch?: string; isMain?: boolean }>,
  // 视图选项
  columns: { author: true, date: true, hash: true },
  sortMode: 'default' as 'default' | 'date-desc' | 'date-asc' | 'author',
  showGraph: true,
};

/**
 * 重置状态为初始值（测试 boot 之间隔离用；生产环境模块只加载一次，不会调用）
 * @returns 新的初始状态对象内容
 */
export function resetState(): void {
  Object.assign(state, createState());
  // Set 类字段需重建引用
  state.selectedBranches = new Set();
  state.favorite = new Set();
  state.myBranches = new Set();
}

/** 初始状态模板 */
function createState() {
  return {
    branches: [] as Branch[],
    commits: [] as Commit[],
    selectedBranch: null as string | null,
    selectedCommit: null as string | null,
    detail: null as CommitDetail | null,
    diffs: [] as FileDiff[],
    collapsed: { local: false, remote: true },
    error: null as string | null,
    branchPanelHidden: false,
    branchFilter: '',
    search: '',
    useRegex: false,
    caseSensitive: false,
    filterBranch: null as string | null,
    filterUser: null as string | null,
    filterDateFrom: null as string | null,
    filterDateTo: null as string | null,
    filterPath: null as string | null,
    onlyMyBranches: false,
    bottomTab: null as string | null,
    commandLogs: [] as Array<{ id?: number; command: string; ok?: boolean; durationMs?: number; stderr?: string; stdout?: string }>,
    worktrees: [] as Array<{ path: string; branch?: string; isMain?: boolean }>,
    columns: { author: true, date: true, hash: true },
    sortMode: 'default' as 'default' | 'date-desc' | 'date-asc' | 'author',
    showGraph: true,
  };
}
