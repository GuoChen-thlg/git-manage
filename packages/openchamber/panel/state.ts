/**
 * 面板状态管理
 * 集中管理所有 UI 状态
 */

/** 分支信息 */
export interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  remote?: string;
  upstream?: string;
  commit?: string;
  message?: string;
  hasUnpushed?: boolean;
  unpushedCount?: number;
  hasUnpulled?: boolean;
  unpulledCount?: number;
}

/** 提交信息 */
export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents: string[];
}

/** 差异行 */
export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  newLine?: number;
  oldLine?: number;
}

/** 文件差异 */
export interface FileDiff {
  path: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

/** Git 状态文件 */
export interface GitStatusFile {
  path: string;
  status: string;
  staged: boolean;
}

/** Git 状态结果 */
export interface GitStatusResult {
  currentBranch: string;
  files: GitStatusFile[];
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  hasUntrackedFiles: boolean;
}

/** 面板状态 */
export interface PanelState {
  branches: Branch[];
  allCommits: CommitInfo[];
  filteredCommits: CommitInfo[];
  selectedCommit: CommitInfo | null;
  /** 多选提交哈希集合（不可变替换） */
  selectedCommits: Set<string>;
  selectedBranch: Branch | null;
  /** 多选分支名集合（Cmd/Ctrl 点击累加，用于两分支比较；不可变替换） */
  selectedBranches: Set<string>;
  /** 是否只显示我的分支（分支独有提交全部由当前作者创作） */
  showOnlyMyBranches: boolean;
  /** 我的分支名集合（按需异步计算，未启用筛选时为空） */
  myBranches: Set<string>;
  commitDetail: CommitInfo | null;
  diffs: FileDiff[];
  gitStatus: GitStatusResult | null;
  branchFilter: string;
  commitSearch: string;
  logBranch: string | null;
  loading: boolean;
  favorites: Set<string>;
  filterAuthor: string;
  filterDateFrom: string;
  filterDateTo: string;
  /** 路径过滤（仓库相对路径，多选；对齐 IDEA Paths 过滤，空数组 = 不过滤 */
  filterPaths: string[];
  /** 分支面板是否被侧边栏"隐藏 Git 分支"按钮收起 */
  branchPanelHidden: boolean;
  /** 提交列表排序模式：default=原始日期降序 */
  sortMode: 'default' | 'date-asc' | 'author-asc' | 'message-asc';
  /** 显示设置（spec 3.3 Columns 最小集） */
  displaySettings: { showAuthor: boolean; showDate: boolean; showHash: boolean };
  /** 搜索是否使用正则表达式模式 */
  searchRegex: boolean;
  /** 搜索是否大小写敏感 */
  searchCaseSensitive: boolean;
}

/** 创建初始状态 */
export function createInitialState(): PanelState {
  return {
    branches: [],
    allCommits: [],
    filteredCommits: [],
    selectedCommit: null,
    selectedCommits: new Set<string>(),
    selectedBranch: null,
    selectedBranches: new Set<string>(),
    showOnlyMyBranches: false,
    myBranches: new Set<string>(),
    commitDetail: null,
    diffs: [],
    gitStatus: null,
    branchFilter: "",
    commitSearch: "",
    logBranch: null,
    loading: false,
    favorites: new Set<string>(),
    filterAuthor: "",
    filterDateFrom: "",
    filterDateTo: "",
    filterPaths: [],
    branchPanelHidden: false,
    sortMode: "default",
    displaySettings: { showAuthor: true, showDate: true, showHash: true },
    searchRegex: false,
    searchCaseSensitive: false,
  };
}

/** 状态变更回调 */
type StateChangeCallback = (state: PanelState) => void;

/** 状态管理器 */
class StateManager {
  private state: PanelState;
  private listeners: Set<StateChangeCallback> = new Set();

  constructor(initialState: PanelState) {
    this.state = initialState;
  }

  /** 获取当前状态 */
  getState(): PanelState {
    return this.state;
  }

  /** 更新状态 */
  setState(updater: (state: PanelState) => void): void {
    updater(this.state);
    this.notifyListeners();
  }

  /** 订阅状态变更 */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /** 通知监听器 */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

/** 导出单例状态管理器 */
export const stateManager = new StateManager(createInitialState());

/** 便捷获取状态 */
export const getState = () => stateManager.getState();

/** 便捷更新状态 */
export const setState = (updater: (state: PanelState) => void) => stateManager.setState(updater);

/** 便捷订阅状态 */
export const subscribeState = (callback: StateChangeCallback) => stateManager.subscribe(callback);

/** 指定字段快照 */
function pickFields<K extends keyof PanelState>(fields: readonly K[]): Pick<PanelState, K> {
  const state = getState();
  const snap = {} as Pick<PanelState, K>;
  for (const field of fields) {
    snap[field] = state[field];
  }
  return snap;
}

/**
 * 订阅指定字段的变化
 * 仅当被订阅字段发生引用/值变化时触发回调，用于组件局部渲染
 * @param fields - 要监听的字段名列表
 * @param callback - 字段变化时的回调，参数为发生变化的字段列表
 * @returns 取消订阅函数
 */
export function subscribeFields<K extends keyof PanelState>(
  fields: readonly K[],
  callback: (changedFields: K[]) => void
): () => void {
  let prev = pickFields(fields);
  return subscribeState((state) => {
    const changed: K[] = [];
    for (const field of fields) {
      if (prev[field] !== state[field]) {
        changed.push(field);
      }
    }
    if (changed.length === 0) return;
    prev = pickFields(fields);
    callback(changed);
  });
}
