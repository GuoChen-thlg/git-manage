import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, stateManager, getState, setState, subscribeState, subscribeFields } from '../state';

describe('state', () => {
  beforeEach(() => {
    // 重置状态
    stateManager.setState(s => {
      s.branches = [];
      s.allCommits = [];
      s.filteredCommits = [];
      s.selectedCommit = null;
      s.selectedBranch = null;
      s.commitDetail = null;
      s.diffs = [];
      s.gitStatus = null;
      s.branchFilter = '';
      s.commitSearch = '';
      s.logBranch = null;
      s.loading = false;
      s.favorites = new Set<string>();
      s.selectedCommits = new Set<string>();
      s.filterAuthor = '';
      s.filterDateFrom = '';
      s.filterDateTo = '';
      s.filterPaths = [];
      s.searchRegex = false;
      s.searchCaseSensitive = false;
      s.branchPanelHidden = false;
      s.sortMode = 'default';
      s.displaySettings = { showAuthor: true, showDate: true, showHash: true, showLongEdges: true, showTagNames: true, compactReferences: false, preferCommitDate: false, referencesOnLeft: false };
    });
  });

  describe('createInitialState', () => {
    it('应该创建初始状态', () => {
      const state = createInitialState();
      
      expect(state.branches).toEqual([]);
      expect(state.allCommits).toEqual([]);
      expect(state.filteredCommits).toEqual([]);
      expect(state.selectedCommit).toBeNull();
      expect(state.selectedCommits).toBeInstanceOf(Set);
      expect(state.selectedCommits.size).toBe(0);
      expect(state.selectedBranch).toBeNull();
      expect(state.commitDetail).toBeNull();
      expect(state.diffs).toEqual([]);
      expect(state.gitStatus).toBeNull();
      expect(state.branchFilter).toBe('');
      expect(state.commitSearch).toBe('');
      expect(state.logBranch).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.favorites).toBeInstanceOf(Set);
      expect(state.favorites.size).toBe(0);
      expect(state.filterAuthor).toBe('');
      expect(state.filterDateFrom).toBe('');
      expect(state.filterDateTo).toBe('');
      expect(state.filterPaths).toEqual([]);
      // 侧边栏图标功能新增字段的初始值
      expect(state.branchPanelHidden).toBe(false);
      expect(state.sortMode).toBe('default');
            expect(state.displaySettings).toEqual({
        showAuthor: true,
        showDate: true,
        showHash: true,
        showLongEdges: true,
        showTagNames: true,
        compactReferences: false,
        preferCommitDate: false,
        referencesOnLeft: false,
      });
      // 工具栏搜索标志新增字段的初始值
      expect(state.searchRegex).toBe(false);
      expect(state.searchCaseSensitive).toBe(false);
    });
  });

  describe('搜索标志状态字段', () => {
    it('搜索正则与大小写敏感标志默认值应为 false', () => {
      const state = createInitialState();
      expect(state.searchRegex).toBe(false);
      expect(state.searchCaseSensitive).toBe(false);
    });
  });

  describe('侧边栏图标功能状态字段', () => {
    it('初始状态应包含分支面板收起、排序模式、显示设置默认值', () => {
      const state = createInitialState();
      expect(state.branchPanelHidden).toBe(false);
      expect(state.sortMode).toBe('default');
      expect(state.displaySettings.showAuthor).toBe(true);
      expect(state.displaySettings.showDate).toBe(true);
      expect(state.displaySettings.showHash).toBe(true);
    });

    it('setState 应能修改 displaySettings.showAuthor', () => {
      setState(s => {
        s.displaySettings = { ...s.displaySettings, showAuthor: false };
      });

      const state = getState();
      expect(state.displaySettings.showAuthor).toBe(false);
      // 其余列开关不受影响
      expect(state.displaySettings.showDate).toBe(true);
      expect(state.displaySettings.showHash).toBe(true);
    });

    it('setState 应能赋值 sortMode', () => {
      setState(s => {
        s.sortMode = 'date-asc';
      });
      expect(getState().sortMode).toBe('date-asc');

      setState(s => {
        s.sortMode = 'author-asc';
      });
      expect(getState().sortMode).toBe('author-asc');

      setState(s => {
        s.sortMode = 'message-asc';
      });
      expect(getState().sortMode).toBe('message-asc');
    });

    it('setState 应能切换 branchPanelHidden', () => {
      setState(s => {
        s.branchPanelHidden = true;
      });
      expect(getState().branchPanelHidden).toBe(true);

      setState(s => {
        s.branchPanelHidden = false;
      });
      expect(getState().branchPanelHidden).toBe(false);
    });
  });

  describe('stateManager', () => {
    it('应该获取当前状态', () => {
      const state = stateManager.getState();
      expect(state).toBeDefined();
      expect(state.branches).toEqual([]);
    });

    it('应该更新状态', () => {
      stateManager.setState(s => {
        s.branchFilter = 'test-filter';
      });
      
      const state = stateManager.getState();
      expect(state.branchFilter).toBe('test-filter');
    });

    it('应该通知监听器', () => {
      let notified = false;
      
      const unsubscribe = stateManager.subscribe(() => {
        notified = true;
      });
      
      stateManager.setState(s => {
        s.loading = true;
      });
      
      expect(notified).toBe(true);
      unsubscribe();
    });

    it('应该取消订阅', () => {
      let count = 0;
      
      const unsubscribe = stateManager.subscribe(() => {
        count++;
      });
      
      stateManager.setState(s => { s.loading = true; });
      expect(count).toBe(1);
      
      unsubscribe();
      stateManager.setState(s => { s.loading = false; });
      expect(count).toBe(1); // 不再增加
    });
  });

  describe('getState', () => {
    it('应该返回当前状态', () => {
      const state = getState();
      expect(state).toBeDefined();
      expect(state.branches).toEqual([]);
    });
  });

  describe('setState', () => {
    it('应该更新状态', () => {
      setState(s => {
        s.branchFilter = 'new-filter';
      });
      
      const state = getState();
      expect(state.branchFilter).toBe('new-filter');
    });
  });

  describe('subscribeState', () => {
    it('应该订阅状态变更', () => {
      let notified = false;
      
      const unsubscribe = subscribeState(() => {
        notified = true;
      });
      
      setState(s => { s.loading = true; });
      expect(notified).toBe(true);
      
      unsubscribe();
    });
  });

  describe('subscribeFields', () => {
    it('被订阅字段变化时应触发回调', () => {
      let received: string[] | null = null;
      const unsubscribe = subscribeFields(['branchFilter'], (changed) => {
        received = changed;
      });

      setState(s => { s.branchFilter = 'main'; });
      expect(received).toEqual(['branchFilter']);

      unsubscribe();
    });

    it('未订阅字段变化时不应触发回调', () => {
      let count = 0;
      const unsubscribe = subscribeFields(['branchFilter'], () => {
        count++;
      });

      setState(s => { s.loading = true; });
      setState(s => { s.commitSearch = 'foo'; });
      expect(count).toBe(0);

      unsubscribe();
    });

    it('订阅字段值未变时不应触发回调', () => {
      let count = 0;
      const unsubscribe = subscribeFields(['branchFilter'], () => {
        count++;
      });

      setState(s => { s.branchFilter = 'same'; });
      expect(count).toBe(1);

      setState(s => { s.branchFilter = 'same'; });
      expect(count).toBe(1); // 引用未变（原始值相等），不触发

      unsubscribe();
    });

    it('数组字段不可变替换时应触发回调', () => {
      let received: string[] | null = null;
      const unsubscribe = subscribeFields(['branches'], (changed) => {
        received = changed;
      });

      // 不可变替换（新数组引用）
      setState(s => { s.branches = [{ name: 'main', isCurrent: true, isRemote: false }]; });
      expect(received).toEqual(['branches']);

      unsubscribe();
    });

    it('数组字段原地修改（引用不变）时不应触发回调', () => {
      let count = 0;
      // 先放入可修改数组
      setState(s => { s.branches = [{ name: 'old', isCurrent: false, isRemote: false }]; });

      const unsubscribe = subscribeFields(['branches'], () => {
        count++;
      });

      // 原地 push，引用不变
      setState(s => { s.branches.push({ name: 'new', isCurrent: false, isRemote: false }); });
      expect(count).toBe(0);

      unsubscribe();
    });

    it('多个字段同时变化时应回调并列出所有变化字段', () => {
      let received: string[] | null = null;
      const unsubscribe = subscribeFields(['branchFilter', 'commitSearch', 'logBranch'], (changed) => {
        received = changed;
      });

      setState(s => {
        s.branchFilter = 'a';
        s.commitSearch = 'b';
        s.logBranch = 'c';
      });
      expect(received).toEqual(['branchFilter', 'commitSearch', 'logBranch']);

      unsubscribe();
    });

    it('Set 字段不可变替换时应触发回调', () => {
      let count = 0;
      const unsubscribe = subscribeFields(['selectedCommits'], () => {
        count++;
      });

      setState(s => { s.selectedCommits = new Set(['abc']); });
      expect(count).toBe(1);

      setState(s => { s.selectedCommits = new Set(['abc']); });
      expect(count).toBe(2); // 新 Set 引用，触发

      unsubscribe();
    });

    it('取消订阅后不应再触发回调', () => {
      let count = 0;
      const unsubscribe = subscribeFields(['branchFilter'], () => {
        count++;
      });

      setState(s => { s.branchFilter = 'one'; });
      expect(count).toBe(1);

      unsubscribe();
      setState(s => { s.branchFilter = 'two'; });
      expect(count).toBe(1); // 已取消订阅
    });
  });
});
