/**
 * 面板前端脚本
 * 以字符串形式注入 webview 执行。此文件不参与 Node 编译，而是被拼进 HTML。
 *
 * 结构：请求管理 -> 渲染函数 -> 事件绑定 -> 初始化
 */

export const PANEL_SCRIPT = `
(function () {
  const vscode = acquireVsCodeApi();

  // ---- 请求管理 ----
  let seq = 0;
  const pending = new Map();

  /**
   * 调用主进程方法
   * @param method 方法名
   * @param params 参数
   * @returns 结果或抛错
   */
  function call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      vscode.postMessage({ type: 'request', id, method, params: params || {} });
    });
  }

  // ---- 状态 ----
  const state = {
    branches: [],
    commits: [],
    selectedBranch: null,
    // Cmd/Ctrl 多选的分支集合，删除等批量操作用
    selectedBranches: new Set(),
    selectedCommit: null,
    detail: null,
    diffs: [],
    collapsed: { local: false, remote: true },
    error: null,
    // 界面状态（与现有面板对齐）
    branchPanelHidden: false,
    branchFilter: '',
    search: '',
    useRegex: false,
    caseSensitive: false,
    filterBranch: null,
    filterUser: null,
    filterDateFrom: null,
    filterDateTo: null,
    filterPath: null,
    favorite: new Set(),
    myBranches: new Set(),
    onlyMyBranches: false,
    // 已展开差异的文件路径
    expandedFiles: new Set(),
    // 底部页签
    bottomTab: null,
    commandLogs: [],
    worktrees: [],
    // 视图选项
    columns: { author: true, date: true, hash: true },
    sortMode: 'default',
    showGraph: true,
  };

  // ---- 工具 ----
  /**
   * 写入日志：同时输出到 webview 控制台并转发到主进程输出通道
   * @param level 级别
   * @param prefix 模块前缀
   * @param message 描述
   * @param data 附加数据
   */
  function log(level, prefix, message, data) {
    try {
      vscode.postMessage({ type: 'log', level: level, prefix: prefix, message: message, data: data });
    } catch (err) {
      // 转发失败不影响主流程
    }
    const text = '[' + prefix + '] ' + message;
    if (level === 'error') console.error(text, data === undefined ? '' : data);
    else if (level === 'warn') console.warn(text, data === undefined ? '' : data);
    else console.log(text, data === undefined ? '' : data);
  }

  /** 调试日志 */
  function logDebug(prefix, message, data) { log('debug', prefix, message, data); }
  /** 错误日志 */
  function logError(prefix, message, data) { log('error', prefix, message, data); }


  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  let toastTimer = null;
  /**
   * 显示提示
   * @param message 文本
   * @param isError 是否为错误
   */
  function toast(message, isError) {
    let node = document.getElementById('toast');
    if (!node) {
      node = el('div');
      node.id = 'toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.className = 'show' + (isError ? ' error' : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.className = ''; }, 4000);
  }

  // ---- 下拉菜单 ----
  // 与 OpenChamber 的工具栏下拉一致：锚定触发按钮、点击外部关闭、Escape 关闭、
  // 视口下方空间不足时向上翻转

  /** 当前打开的下拉菜单 */
  let openDropdown = null;

  /**
   * 关闭下拉菜单
   * 必须同时移除 document 上的监听，否则每次打开都会残留一对，
   * 残留监听会在下次菜单刚打开时把它关掉（表现为「点不开」）
   */
  function closeDropdown() {
    if (!openDropdown) return;
    openDropdown.menu.remove();
    if (openDropdown.onOutside) document.removeEventListener('click', openDropdown.onOutside);
    if (openDropdown.onKey) document.removeEventListener('keydown', openDropdown.onKey);
    openDropdown = null;
  }

  /**
   * 显示下拉菜单
   * @param anchor 触发按钮
   * @param items 菜单条目
   * @param onSelect 选中回调
   */
  function showDropdown(anchor, items, onSelect) {
    // 用按钮文案判定是否同一按钮：工具栏重建后节点引用会变，不能靠引用比较
    const anchorKey = (anchor && anchor.textContent) || '';
    const sameAnchor = openDropdown && openDropdown.anchorKey === anchorKey;
    closeDropdown();
    if (sameAnchor) return;

    const menu = el('div', 'dd-menu');

    items.forEach(function (item) {
      if (item.kind === 'separator') {
        menu.appendChild(el('div', 'dd-sep'));
        return;
      }
      if (item.kind === 'group') {
        menu.appendChild(el('div', 'dd-group', item.label));
        return;
      }

      const row = el('div', 'dd-item' + (item.checked ? ' checked' : '') + (item.disabled ? ' disabled' : ''));
      row.appendChild(el('span', 'dd-check', item.checked ? '✓' : ''));
      row.appendChild(el('span', 'dd-label', item.label));
      if (!item.disabled) {
        row.onclick = function () {
          closeDropdown();
          onSelect(item.id);
        };
      }
      menu.appendChild(row);
    });

    document.body.appendChild(menu);
    logDebug('panel', 'dropdown_shown', {
      itemCount: items.length,
      labels: items.map(function (i) { return i.label; }),
    });

    // 定位：默认在按钮下方，空间不足时向上翻转
    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let top = rect.bottom + 2;
    if (top + menuRect.height > window.innerHeight - 4) {
      top = Math.max(4, rect.top - menuRect.height - 2);
    }
    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - 4) {
      left = Math.max(4, window.innerWidth - menuRect.width - 4);
    }
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    // 记录监听函数，closeDropdown 时统一解绑
    function onOutside(ev) {
      if (!menu.contains(ev.target)) closeDropdown();
    }
    function onKey(ev) {
      if (ev.key === 'Escape') closeDropdown();
    }

    openDropdown = { menu: menu, anchorKey: anchorKey, onOutside: onOutside, onKey: onKey };

    // 延迟注册外部点击，避免打开这次点击立即关闭
    setTimeout(function () {
      // 菜单可能已在延迟期间关闭，此时不再注册
      if (!openDropdown || openDropdown.menu !== menu) return;
      document.addEventListener('click', onOutside);
      document.addEventListener('keydown', onKey);
    }, 0);
  }

  // ---- 内置对话框 ----
  // Webview 中 window.prompt / window.confirm 被 VS Code 禁用（返回 undefined），
  // 必须用自绘对话框，否则所有依赖输入的操作都会静默失效。

  /**
   * 显示输入对话框
   * @param message 提示文案
   * @param defaultValue 预填值
   * @returns 输入内容；取消返回 null
   */
  function showPrompt(message, defaultValue) {
    return new Promise(function (resolve) {
      const overlay = el('div', 'dlg-overlay');
      const box = el('div', 'dlg-box');

      box.appendChild(el('div', 'dlg-message', message));
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'dlg-input';
      input.value = defaultValue || '';
      box.appendChild(input);

      const actions = el('div', 'dlg-actions');
      const cancel = el('button', 'dlg-btn', '取消');
      const ok = el('button', 'dlg-btn primary', '确定');
      actions.appendChild(cancel);
      actions.appendChild(ok);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      input.focus();
      input.select();

      function finish(value) {
        overlay.remove();
        resolve(value);
      }

      cancel.onclick = function () { finish(null); };
      ok.onclick = function () { finish(input.value); };
      input.onkeydown = function (ev) {
        if (ev.key === 'Enter') finish(input.value);
        else if (ev.key === 'Escape') finish(null);
      };
      overlay.onclick = function (ev) {
        if (ev.target === overlay) finish(null);
      };
    });
  }

  /**
   * 显示确认对话框
   * @param message 提示文案
   * @returns 是否确认
   */
  function showConfirm(message) {
    return new Promise(function (resolve) {
      const overlay = el('div', 'dlg-overlay');
      const box = el('div', 'dlg-box');

      box.appendChild(el('div', 'dlg-message', message));
      const actions = el('div', 'dlg-actions');
      const cancel = el('button', 'dlg-btn', '取消');
      const ok = el('button', 'dlg-btn primary', '确定');
      actions.appendChild(cancel);
      actions.appendChild(ok);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      ok.focus();

      function finish(value) {
        overlay.remove();
        resolve(value);
      }

      cancel.onclick = function () { finish(false); };
      ok.onclick = function () { finish(true); };
      overlay.onclick = function (ev) {
        if (ev.target === overlay) finish(false);
      };
    });
  }

  // ---- 渲染：左侧图标列 ----
  // 与现有面板一致：12 个图标，顺序对齐 IDEA 分支面板工具栏
  const SIDEBAR_ITEMS = [
    { key: 'hideBranches', icon: 'hideBranches', title: '收起分支面板', action: 'toggleBranchPanel' },
    { key: 'newBranch', icon: 'newBranch', title: '新建分支', action: 'newBranch' },
    { key: 'update', icon: 'updateSelected', title: '更新所选', action: 'updateSelected' },
    { key: 'delete', icon: 'deleteBranch', title: '删除分支', action: 'deleteBranch' },
    { key: 'compare', icon: 'compareBranch', title: '分支比较', action: 'compareBranch' },
    { key: 'myBranches', icon: 'search', title: '只显示我的分支', action: 'toggleMyBranches' },
    { key: 'fetch', icon: 'fetch', title: '获取远程更新', action: 'fetch' },
    { key: 'favorite', icon: 'favoriteOutline', title: '收藏分支', action: 'toggleFavorite' },
    { key: 'locate', icon: 'locate', title: '定位当前分支', action: 'locateCurrent' },
    { key: 'settings', icon: 'settings', title: '设置', action: 'settings' },
    { key: 'expandAll', icon: 'expandAll', title: '展开全部', action: 'expandAll' },
    { key: 'collapseAll', icon: 'collapseAll', title: '折叠全部', action: 'collapseAll' },
  ];

  /** 图标名到 SVG 的映射，由主进程注入 */
  function iconSvg(name) {
    const map = window.__ICONS__ || {};
    return map[name] || '';
  }

  /**
   * 创建图标按钮
   * @param name 图标名
   * @param title 悬停提示
   * @param onClick 点击处理
   */
  function iconButton(name, title, onClick) {
    const btn = el('button', 'icon-btn');
    btn.innerHTML = iconSvg(name);
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.onclick = onClick;
    return btn;
  }

  function renderSidebar() {
    const box = document.getElementById('sidebar');
    box.innerHTML = '';

    SIDEBAR_ITEMS.forEach(function (item) {
      // 收起/展开按钮随分支面板显隐切换图标
      let iconName = item.icon;
      if (item.action === 'toggleBranchPanel') {
        // 与 OpenChamber 一致：展开态用右箭头，收起态用左箭头
        iconName = state.branchPanelHidden ? 'showBranches' : 'hideBranches';
      }
      // 收藏图标随状态切换实心/空心，与 OpenChamber 一致
      if (item.action === 'toggleFavorite') {
        const target = state.selectedBranch || currentBranchName();
        iconName = target && state.favorite.has(target) ? 'favorite' : 'favoriteOutline';
      }
      const btn = iconButton(iconName, item.title, function () {
        // 把触发按钮传下去，菜单据此定位
        void runSidebarAction(item.action, btn);
      });
      if (item.action === 'toggleBranchPanel') {
        btn.title = state.branchPanelHidden ? '展开分支面板' : '收起分支面板';
      }
      if (item.action === 'locateCurrent' && !currentBranchName()) {
        btn.disabled = true;
      }
      // 目标为空或包含当前分支时不可删除，与 IDEA 动作置灰一致
      if (item.action === 'deleteBranch') {
        const targets = deleteTargets();
        const current = currentBranchName();
        btn.disabled = targets.length === 0 || (current !== null && targets.indexOf(current) >= 0);
      }
      box.appendChild(btn);
    });
  }

  /**
   * 取当前分支名
   * @returns 分支名或 null
   */
  function currentBranchName() {
    const current = state.branches.filter(function (b) { return b.isCurrent; });
    return current.length ? current[0].name : null;
  }

  /**
   * 取删除目标列表
   * 多选优先，其次单选；都没有时返回空数组
   * @returns 待删除分支名
   */
  function deleteTargets() {
    if (state.selectedBranches.size > 0) return Array.from(state.selectedBranches);
    return state.selectedBranch ? [state.selectedBranch] : [];
  }

  // ---- 渲染：顶部工具栏 ----
  // 与现有面板一致：左侧搜索 + 过滤项，右侧刷新/操作/设置/跳转
  function renderToolbar() {
    const box = document.getElementById('toolbar');
    // 记录焦点元素，重建后恢复，避免切换选项时输入被打断
    const active = document.activeElement;
    const hadSearchFocus = active && active.id === 'commit-search';
    const selectionStart = hadSearchFocus ? active.selectionStart : null;

    // 先取出搜索框节点再清空容器，否则节点被销毁、无法复用
    let search = document.getElementById('commit-search');
    box.innerHTML = '';

    if (!search) {
      search = document.createElement('input');
      search.id = 'commit-search';
      search.type = 'text';
      search.placeholder = '搜索提交信息或哈希';
      search.oninput = function () {
        state.search = search.value;
        updateSearchState();
        renderCommits();
      };
      search.onkeydown = function (ev) {
        // Enter 立即跳到首个匹配提交，Esc 清空
        if (ev.key === 'Enter') {
          const first = sortCommits(filterCommits(state.commits))[0];
          if (first) {
            state.selectedCommit = first.hash;
            renderCommits();
            void loadDetail(first.hash);
          }
        } else if (ev.key === 'Escape') {
          search.value = '';
          state.search = '';
          updateSearchState();
          renderCommits();
        }
      };
    }
    search.value = state.search || '';
    box.appendChild(search);

    // 正则 / 大小写
    // 正则开关用 .* 表达，符合常见编辑器习惯；大小写用 Cc 是通行写法
    box.appendChild(toolbarToggle('.*', '使用正则表达式', state.useRegex, function () {
      state.useRegex = !state.useRegex;
      renderToolbar();
      renderCommits();
    }));
    box.appendChild(toolbarToggle('Cc', '区分大小写', state.caseSensitive, function () {
      state.caseSensitive = !state.caseSensitive;
      renderToolbar();
      renderCommits();
    }));

    // 新节点上恢复焦点
    if (hadSearchFocus) {
      search.focus();
      if (selectionStart !== null && search.setSelectionRange) {
        try { search.setSelectionRange(selectionStart, selectionStart); } catch { /* 非文本框时忽略 */ }
      }
    }

    box.appendChild(el('span', 'tb-sep'));

    // 过滤项：均为下拉菜单，点击展开可选值（与 OpenChamber 一致）
    const branchBtn = toolbarButton('分支', state.filterBranch, function () {
      void pickFilterBranch(branchBtn);
    });
    box.appendChild(branchBtn);

    const userBtn = toolbarButton('用户', state.filterUser, function () {
      void pickFilterUser(userBtn);
    });
    box.appendChild(userBtn);

    // 日期显示为「起始 ~ 结束」摘要
    const dateValue = state.filterDateFrom || state.filterDateTo
      ? (state.filterDateFrom || '') + ' ~ ' + (state.filterDateTo || '')
      : null;
    const dateBtn = toolbarButton('日期', dateValue, function () {
      void pickFilterDate(dateBtn);
    });
    box.appendChild(dateBtn);

    // 路径为单选，直接显示，过长时由按钮省略
    const pathValue = state.filterPath || null;
    const pathBtn = toolbarButton('路径', pathValue, function () {
      void pickFilterPath(pathBtn);
    });
    box.appendChild(pathBtn);

    box.appendChild(el('span', 'tb-sep'));

    // 右侧操作：图标与顺序对齐 OpenChamber 面板的工具栏
    box.appendChild(iconButton('refresh', '刷新', function () { void loadAll(); }));
    box.appendChild(iconButton('cherryPick', 'Cherry-pick 选中提交', function () {
      if (!state.selectedCommit) { toast('请先选择提交', true); return; }
      void runCommitAction('cherryPick');
    }));
    const settingsBtn = iconButton('gearSettings', '视图选项', function () {
      void openViewOptions(settingsBtn);
    });
    box.appendChild(settingsBtn);
    box.appendChild(iconButton('search', '跳转到引用', function () { void gotoRef(); }));
  }

  /**
   * 工具栏开关按钮
   * @param text 按钮文案
   * @param title 提示
   * @param active 是否激活
   * @param onClick 点击处理
   */
  function toolbarToggle(text, title, active, onClick) {
    const btn = el('button', 'tb-btn' + (active ? ' active' : ''), text);
    btn.title = title;
    btn.onclick = onClick;
    return btn;
  }

  /**
   * 工具栏过滤按钮
   * @param label 文案
   * @param value 当前过滤值
   * @param onClick 点击处理
   */
  function toolbarButton(label, value, onClick) {
    const btn = el('button', 'tb-btn' + (value ? ' active' : ''), value ? label + ': ' + value : label);
    btn.onclick = onClick;
    return btn;
  }

  // ---- 渲染：分支 ----
  function renderBranches() {
    const box = document.getElementById('branches');
    box.innerHTML = '';

    const title = el('div', 'section-title');
    title.appendChild(el('span', '', '分支'));
    title.appendChild(el('span', 'spacer'));
    const reload = el('button', '', '刷新');
    reload.onclick = () => { void loadAll(); };
    title.appendChild(reload);
    box.appendChild(title);

    // 分支搜索框（对齐现有面板）
    const searchWrap = el('div', 'branch-search');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '搜索分支';
    searchInput.value = state.branchFilter || '';
    searchInput.oninput = function () {
      state.branchFilter = searchInput.value;
      renderBranchList();
    };
    searchWrap.appendChild(searchInput);
    box.appendChild(searchWrap);

    const list = el('div', 'list');
    list.id = 'branch-list';
    box.appendChild(list);
    renderBranchList();
  }

  /**
   * 按当前筛选条件渲染分支列表
   * 与搜索框分离，避免输入时整个面板重建导致焦点丢失
   */
  function renderBranchList() {
    const list = document.getElementById('branch-list');
    if (!list) return;
    list.innerHTML = '';

    const keyword = (state.branchFilter || '').toLowerCase();
    const favorites = state.favorite;

    // 只显示我的分支（对齐现有面板）
    const mySet = state.myBranches;

    /**
     * 判断分支是否通过筛选
     * @param b 分支
     */
    function visible(b) {
      if (keyword && b.name.toLowerCase().indexOf(keyword) < 0) return false;
      if (state.onlyMyBranches && mySet && !mySet.has(b.name)) return false;
      return true;
    }

    if (state.error) {
      list.appendChild(el('div', 'error', state.error));
      return;
    }
    if (!state.branches.length) {
      list.appendChild(el('div', 'empty', '没有分支'));
      return;
    }

    [['local', '本地分支'], ['remote', '远程分支']].forEach(function (pair) {
      const key = pair[0];
      const label = pair[1];
      const items = state.branches.filter(function (b) {
        return key === 'remote' ? b.isRemote : !b.isRemote;
      });
      const shown = items.filter(visible);
      shown.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!shown.length && keyword) return;

      const header = el('div', 'group-header', (state.collapsed[key] ? '▸ ' : '▾ ') + label + ' (' + shown.length + ')');
      header.onclick = function () {
        state.collapsed[key] = !state.collapsed[key];
        renderBranches();
      };
      list.appendChild(header);

      if (state.collapsed[key]) return;

      shown.forEach(function (branch) {
        const row = el('div', 'branch-item');
        if (branch.isCurrent) row.classList.add('current');
        if (state.selectedBranch === branch.name || state.selectedBranches.has(branch.name)) {
          row.classList.add('selected');
        }
        if (branch.isCurrent) row.appendChild(el('span', 'dot', '●'));
        // 收藏星标：点击切换收藏，不触发分支选中
        const star = el('span', 'star' + (favorites.has(branch.name) ? ' on' : ''), favorites.has(branch.name) ? '★' : '☆');
        star.title = favorites.has(branch.name) ? '取消收藏' : '收藏';
        star.onclick = function (ev) {
          ev.stopPropagation();
          void toggleFavoriteFor(branch.name);
        };
        row.appendChild(star);
        row.appendChild(el('span', 'name', branch.name));
        row.title = branch.message || branch.name;
        row.onclick = function (ev) {
          // Cmd/Ctrl 点击累加选择，与现有面板和 IDEA 一致
          const multi = ev && (ev.metaKey || ev.ctrlKey);
          if (multi) {
            if (state.selectedBranches.has(branch.name)) state.selectedBranches.delete(branch.name);
            else state.selectedBranches.add(branch.name);
            // 多选时不切换提交列表；仅剩一个时仍作为主选中分支
            const names = Array.from(state.selectedBranches);
            state.selectedBranch = names.length === 1 ? names[0] : null;
            renderSidebar();
            renderBranchList();
            return;
          }

          // 普通点击：单选，清空多选
          state.selectedBranches = new Set();
          state.selectedBranch = branch.name;
          // 图标列的可用态依赖选中分支，选中后需同步刷新
          renderSidebar();
          renderBranches();
          void loadCommits(branch.name);
        };
        list.appendChild(row);
      });
    });
  }

  // ---- 渲染：提交 ----
  function renderCommits() {
    const box = document.getElementById('commits');
    box.innerHTML = '';

    const title = el('div', 'section-title');
    title.appendChild(el('span', '', state.selectedBranch ? '提交 · ' + state.selectedBranch : '提交'));
    title.appendChild(el('span', 'spacer'));
    title.appendChild(el('span', '', filterCommits(state.commits).length + ' 条'));
    box.appendChild(title);

    const list = el('div', 'list');
    box.appendChild(list);

    const visible = sortCommits(filterCommits(state.commits));
    // 记录过滤结果，排查「过滤不生效」时直接看这里
    logDebug('panel', 'render_commits', {
      total: state.commits.length,
      visible: visible.length,
      filters: {
        search: state.search,
        regex: state.useRegex,
        caseSensitive: state.caseSensitive,
        branch: state.filterBranch,
        user: state.filterUser,
        dateFrom: state.filterDateFrom,
        dateTo: state.filterDateTo,
        path: state.filterPath,
      },
    });
    updateSearchState();
    if (!visible.length) {
      list.appendChild(el('div', 'empty', state.commits.length ? '没有匹配的提交' : '暂无提交'));
      return;
    }

    const graphRows = calculateGraphRows(visible);

    visible.forEach(function (commit, index) {
      const row = el('div', 'commit-item');
      if (state.selectedCommit === commit.hash) row.classList.add('selected');
      // 图线列
      if (state.showGraph) {
        const graphCell = el('span', 'graph');
        graphCell.innerHTML = graphSvg(graphRows[index]);
        row.appendChild(graphCell);
      }
      // 列显隐由视图选项控制
      if (state.columns.hash) row.appendChild(el('span', 'hash', commit.shortHash));
      row.appendChild(el('span', 'msg', commit.message.split('\\n')[0]));
      if (state.columns.date) {
        // 日期只取年月日时分，完整时间放 tooltip
        const short = String(commit.date || '').slice(0, 16);
        const dateEl = el('span', 'meta', short);
        dateEl.title = String(commit.date || '');
        row.appendChild(dateEl);
      }
      if (state.columns.author) row.appendChild(el('span', 'meta', commit.authorName));
      row.title = commit.message;
      row.dataset.hash = commit.hash;
      row.onclick = function () {
        state.selectedCommit = commit.hash;
        // 只切换选中样式，不重建列表：重建会把滚动位置重置到顶部
        highlightSelectedCommit();
        void loadDetail(commit.hash);
      };
      list.appendChild(row);
    });
  }

  /**
   * 只更新提交行的选中样式，避免重建列表导致滚动位置丢失
   */
  function highlightSelectedCommit() {
    const rows = document.querySelectorAll('.commit-item');
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.dataset.hash === state.selectedCommit) row.classList.add('selected');
      else row.classList.remove('selected');
    }
  }

  // ---- 渲染：详情 ----
  function renderDetail() {
    const box = document.getElementById('detail');
    box.innerHTML = '';

    const title = el('div', 'section-title');
    title.appendChild(el('span', '', '提交详情'));
    box.appendChild(title);

    const body = el('div', 'detail-body');
    box.appendChild(body);

    if (!state.selectedCommit) {
      body.appendChild(el('div', 'empty', '选择左侧提交查看详情'));
      return;
    }
    if (!state.detail) {
      body.appendChild(el('div', 'empty', '加载中…'));
      return;
    }

    const d = state.detail;
    body.appendChild(el('div', 'message', d.message));

    function field(label, value) {
      const row = el('div', 'field');
      row.appendChild(el('span', 'label', label));
      row.appendChild(el('span', '', value));
      body.appendChild(row);
    }
    field('提交', d.hash);
    field('作者', d.authorName + ' <' + d.authorEmail + '>');
    field('时间', d.date);

    // 操作按钮
    const actions = el('div', 'section-title');
    actions.style.borderTop = '1px solid var(--vscode-panel-border)';
    actions.style.marginTop = '8px';
    [['cherry-pick', 'cherryPick'], ['revert', 'Revert']].forEach(function (pair) {
      const btn = el('button', '', pair[1]);
      btn.onclick = function () { void runCommitAction(pair[0]); };
      actions.appendChild(btn);
    });
    body.appendChild(actions);

    if (state.diffs && state.diffs.length) {
      body.appendChild(el('div', 'section-title', '变更文件 (' + state.diffs.length + ')'));

      // 差异区单独滚动，避免长差异把整页撑开
      const diffBox = el('div', 'diff-box');
      state.diffs.forEach(function (diff) {
        const path = diff.path || diff.file || '';
        const expanded = state.expandedFiles.has(path);

        const row = el('div', 'file-row');
        row.appendChild(el('span', 'arrow', expanded ? '▾' : '▸'));
        row.appendChild(el('span', 'path', path));
        row.appendChild(el('span', 'stat', '+' + (diff.additions || 0) + ' −' + (diff.deletions || 0)));
        row.onclick = function () {
          if (state.expandedFiles.has(path)) state.expandedFiles.delete(path);
          else state.expandedFiles.add(path);
          renderDetail();
        };
        diffBox.appendChild(row);

        if (!expanded) return;

        // 差异内容：按行类型着色，显示新旧行号
        const lines = diff.lines || [];
        if (!lines.length) {
          diffBox.appendChild(el('div', 'empty', '（无文本差异，可能是二进制文件）'));
          return;
        }
        const pre = el('div', 'diff-lines');
        lines.forEach(function (line) {
          const rowEl = el('div', 'diff-line ' + line.type);
          rowEl.appendChild(el('span', 'ln', String(line.oldLine || '')));
          rowEl.appendChild(el('span', 'ln', String(line.newLine || '')));
          rowEl.appendChild(el('span', 'code', line.content));
          pre.appendChild(rowEl);
        });
        diffBox.appendChild(pre);
      });
      body.appendChild(diffBox);
    }
  }

  // ---- 数据加载 ----
  async function loadAll() {
    state.error = null;
    renderBranches();
    try {
      state.branches = await call('getBranches');
      // 收藏为本地状态，与分支一起加载，失败不影响主流程
      try {
        const favs = await call('getFavorites');
        state.favorite = new Set(favs || []);
      } catch (err) {
        state.favorite = new Set();
      }
      renderSidebar();
      renderBranches();
      await loadCommits(state.selectedBranch || undefined);
    } catch (err) {
      state.error = String(err.message || err);
      renderBranches();
    }
  }

  async function loadCommits(branch) {
    try {
      // 路径为单选，交给 git 的 pathspec
      const paths = state.filterPath ? [state.filterPath] : undefined;
      logDebug('panel', 'load_commits', { branch: branch, paths: paths });
      // 取全量历史；保留一个很高的安全上限，避免仓库异常大时一次性拉爆内存
      const loaded = await call('getCommitLog', { branch: branch, limit: 20000, paths: paths });
      state.commits = loaded || [];
      if (state.commits.length >= 20000) {
        log('warn', 'panel', 'commit_limit_reached', { count: state.commits.length });
      }
      logDebug('panel', 'load_commits_done', { count: state.commits.length });
      renderCommits();
    } catch (err) {
      logError('panel', 'load_commits_failed', { error: String(err && err.message ? err.message : err) });
      toast('读取提交失败：' + (err.message || err), true);
    }
  }

  async function loadDetail(hash) {
    state.detail = null;
    state.diffs = [];
    state.expandedFiles = new Set();
    renderDetail();
    try {
      const results = await Promise.all([
        call('getCommitDetail', { hash: hash }),
        call('getCommitDiffs', { hash: hash }),
      ]);
      state.detail = results[0];
      state.diffs = results[1] || [];
      renderDetail();
    } catch (err) {
      toast('读取提交详情失败：' + (err.message || err), true);
    }
  }

  async function runCommitAction(action) {
    if (!state.selectedCommit) return;
    try {
      await call(action, { hash: state.selectedCommit });
      toast('操作完成');
      await loadAll();
    } catch (err) {
      toast('操作失败：' + (err.message || err), true);
    }
  }

  // ---- 图标列与工具栏动作 ----

  /**
   * 执行图标列动作
   * @param action 动作标识
   */
  async function runSidebarAction(action, anchor) {
    switch (action) {
      case 'toggleBranchPanel':
        state.branchPanelHidden = !state.branchPanelHidden;
        document.getElementById('branches').style.display = state.branchPanelHidden ? 'none' : '';
        renderSidebar();
        return;
      case 'newBranch':
        await createBranchFlow();
        return;
      case 'deleteBranch':
        await deleteBranchFlow();
        return;
      case 'fetch':
        await remoteAction('fetch');
        return;
      case 'updateSelected':
        await remoteAction('pull');
        return;
      case 'toggleFavorite':
        await toggleFavorite();
        return;
      case 'toggleMyBranches':
        await toggleMyBranches();
        return;
      case 'locateCurrent': {
        const current = currentBranchName();
        if (current) {
          state.selectedBranch = current;
          renderBranches();
          await loadCommits(current);
        }
        return;
      }
      case 'settings':
        // 左侧设置图标与工具栏的视图选项入口一致
        await openViewOptions(anchor);
        return;
      case 'compareBranch':
        toast('分支比较正在补齐中');
        return;
      case 'expandAll':
      case 'collapseAll': {
        const collapse = action === 'collapseAll';
        state.collapsed.local = collapse;
        state.collapsed.remote = collapse;
        renderBranches();
        return;
      }
      default:
        // compareBranch / toggleMyBranches / settings 等后续区域实现
        toast('该功能正在补齐中');
    }
  }

  /**
   * 新建分支
   */
  async function createBranchFlow() {
    const name = await showPrompt('新分支名称');
    if (!name) return;
    try {
      await call('createBranch', { name: name });
      toast('已创建并切换到 ' + name);
      await loadAll();
    } catch (err) {
      toast('创建分支失败：' + (err.message || err), true);
    }
  }

  /**
   * 删除所选分支
   */
  async function deleteBranchFlow() {
    const targets = deleteTargets();
    if (!targets.length) { toast('请先选择分支', true); return; }
    const current = currentBranchName();
    if (current && targets.indexOf(current) >= 0) {
      toast('当前分支不能删除', true);
      return;
    }

    // 批量时逐个串行删除，单个失败不中断其余分支
    const failed = [];
    const needForce = [];

    for (let i = 0; i < targets.length; i += 1) {
      const name = targets[i];
      try {
        await call('deleteBranch', { name: name });
      } catch (err) {
        const message = String(err.message || err);
        if (message.indexOf('not fully merged') >= 0) needForce.push(name);
        else failed.push(name);
      }
    }

    // 未合并的分支统一询问一次，避免连续弹窗打扰
    if (needForce.length) {
      const tip = needForce.join('、') + ' 尚未合并，强制删除将丢失其提交，继续？';
      const force = await showConfirm(tip);
      if (force) {
        for (let i = 0; i < needForce.length; i += 1) {
          const name = needForce[i];
          try {
            await call('deleteBranch', { name: name, force: true });
          } catch (e2) {
            failed.push(name);
          }
        }
      } else {
        for (let i = 0; i < needForce.length; i += 1) failed.push(needForce[i]);
      }
    }

    const removed = targets.length - failed.length;
    if (failed.length === 0) {
      toast(targets.length > 1 ? '已删除 ' + removed + ' 个分支' : '已删除分支 ' + targets[0]);
    } else if (removed === 0) {
      toast('删除失败：' + failed.join('、'), true);
    } else {
      toast('已删除 ' + removed + ' 个分支，失败：' + failed.join('、'), true);
    }

    state.selectedBranches = new Set();
    state.selectedBranch = null;
    await loadAll();
  }

  /**
   * 远程操作
   * @param method 方法名
   */
  async function remoteAction(method) {
    const labels = { fetch: '获取远程更新', pull: '拉取', push: '推送' };
    try {
      await call(method);
      toast(labels[method] + ' 完成');
      await loadAll();
    } catch (err) {
      toast(labels[method] + ' 失败：' + (err.message || err), true);
    }
  }

  /**
   * 切换收藏状态（作用于当前选中分支）
   */
  async function toggleFavorite() {
    const target = state.selectedBranch || currentBranchName();
    if (!target) { toast('请先选择分支', true); return; }
    await toggleFavoriteFor(target);
  }

  /**
   * 收藏/取消收藏指定分支并持久化
   * @param name 分支名
   */
  async function toggleFavoriteFor(name) {
    if (state.favorite.has(name)) state.favorite.delete(name);
    else state.favorite.add(name);

    const list = Array.from(state.favorite);
    renderBranchList();
    const on = state.favorite.has(name);
    toast(on ? '已收藏 ' + name : '已取消收藏 ' + name);
    try {
      await call('saveFavorites', { favorites: list });
    } catch (err) {
      // 保存失败需回滚，避免界面显示已收藏但实际未落盘
      if (on) state.favorite.delete(name);
      else state.favorite.add(name);
      renderBranchList();
      toast('保存收藏失败：' + (err.message || err), true);
    }
  }

  /**
   * 切换「只显示我的分支」
   */
  async function toggleMyBranches() {
    state.onlyMyBranches = !state.onlyMyBranches;
    if (state.onlyMyBranches && state.myBranches.size === 0) {
      try {
        const mine = await call('getMyBranches');
        state.myBranches = new Set(mine || []);
      } catch (err) {
        state.onlyMyBranches = false;
        toast('读取我的分支失败：' + (err.message || err), true);
        renderBranchList();
        return;
      }
    }
    renderBranchList();
  }

  /**
   * 选择过滤分支
   */
  async function pickFilterBranch(anchor) {
    const items = [{ id: 'all', label: '全部', checked: !state.filterBranch }];
    state.branches.forEach(function (b) {
      items.push({ id: b.name, label: b.name, checked: state.filterBranch === b.name });
    });

    showDropdown(anchor, items, function (id) {
      logDebug('panel', 'filter_branch_selected', { value: id, itemCount: items.length });
      state.filterBranch = id === 'all' ? null : id;
      renderToolbar();
      // 分支过滤需要由 git 重新取历史，不能只在前端筛选已加载的部分
      void loadCommits(state.filterBranch || undefined);
    });
  }

  /**
   * 选择过滤用户
   */
  async function pickFilterUser(anchor) {
    // 作者列表取自已加载提交，去重排序
    const authors = [];
    state.commits.forEach(function (c) {
      if (c.authorName && authors.indexOf(c.authorName) < 0) authors.push(c.authorName);
    });
    authors.sort();

    const items = [{ id: 'all', label: '全部', checked: !state.filterUser }];
    authors.forEach(function (name) {
      items.push({ id: name, label: name, checked: state.filterUser === name });
    });

    showDropdown(anchor, items, function (id) {
      logDebug('panel', 'filter_user_selected', { value: id, authors: items.length - 1 });
      state.filterUser = id === 'all' ? null : id;
      renderToolbar();
      renderCommits();
    });
  }

  /**
   * 选择日期过滤（相对时间，便于快速定位近期提交）
   */
  async function pickFilterDate(anchor) {
    const now = new Date();
    const presets = [
      { id: 'today', label: '今天' },
      { id: 'thisWeek', label: '本周' },
      { id: 'thisMonth', label: '本月' },
      { id: 'thisYear', label: '今年' },
    ];

    const items = [{
      id: 'all',
      label: '全部',
      checked: !state.filterDateFrom && !state.filterDateTo,
    }];
    presets.forEach(function (p) {
      const range = computeDateRange(p.id, now);
      items.push({
        id: p.id,
        label: p.label,
        checked: state.filterDateFrom === range.from && state.filterDateTo === range.to,
      });
    });
    items.push({ id: 'sep', label: '', kind: 'separator' });
    items.push({ id: 'custom', label: '自定义…' });

    showDropdown(anchor, items, function (id) {
      logDebug('panel', 'filter_date_selected', { value: id });
      if (id === 'custom') {
        void pickCustomDateRange();
        return;
      }
      if (id === 'all') {
        state.filterDateFrom = null;
        state.filterDateTo = null;
      } else {
        const range = computeDateRange(id, new Date());
        state.filterDateFrom = range.from;
        state.filterDateTo = range.to;
      }
      renderToolbar();
      renderCommits();
    });
  }

  /**
   * 自定义日期范围：用原生日期选择器，不用文本输入
   */
  function pickCustomDateRange() {
    return new Promise(function (resolve) {
      const overlay = el('div', 'dlg-overlay');
      const box = el('div', 'dlg-box');
      box.appendChild(el('div', 'dlg-message', '自定义日期范围'));

      /**
       * 创建一行日期输入
       * @param label 标签
       * @param value 初始值
       */
      function dateRow(label, value) {
        const wrap = el('div', 'dlg-field');
        wrap.appendChild(el('div', 'dlg-field-label', label));
        const input = document.createElement('input');
        // 原生日期控件，点击弹出日历，避免手输格式错误
        input.type = 'date';
        input.className = 'dlg-date';
        input.value = value || '';
        wrap.appendChild(input);
        box.appendChild(wrap);
        return input;
      }

      const fromInput = dateRow('起始日期', state.filterDateFrom);
      const toInput = dateRow('结束日期', state.filterDateTo);

      const actions = el('div', 'dlg-actions');
      const clear = el('button', 'dlg-btn', '清除');
      const cancel = el('button', 'dlg-btn', '取消');
      const ok = el('button', 'dlg-btn primary', '确定');
      actions.appendChild(clear);
      actions.appendChild(cancel);
      actions.appendChild(ok);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function finish(from, to) {
        overlay.remove();
        state.filterDateFrom = from;
        state.filterDateTo = to;
        logDebug('panel', 'date_range_applied', { from: from, to: to });
        renderToolbar();
        renderCommits();
        resolve(null);
      }

      clear.onclick = function () { finish(null, null); };
      cancel.onclick = function () { overlay.remove(); resolve(null); };
      ok.onclick = function () {
        const from = fromInput.value || null;
        const to = toInput.value || null;
        // 区间倒置时自动交换，避免静默无结果
        if (from && to && from > to) finish(to, from);
        else finish(from, to);
      };
      overlay.onclick = function (ev) {
        if (ev.target === overlay) { overlay.remove(); resolve(null); }
      };
    });
  }

  /**
   * 计算日期预设区间
   * @param preset 预设标识
   * @param now 当前时间
   * @returns 起止日期（YYYY-MM-DD）
   */
  function computeDateRange(preset, now) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    let start;
    let end;

    if (preset === 'today') {
      start = new Date(y, m, d);
      end = new Date(y, m, d);
    } else if (preset === 'thisWeek') {
      // 周一为一周起点
      const offset = (now.getDay() + 6) % 7;
      start = new Date(y, m, d - offset);
      end = new Date(y, m, d - offset + 6);
    } else if (preset === 'thisMonth') {
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
    } else {
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
    }

    const fmt = function (dt) {
      return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
    };
    return { from: fmt(start), to: fmt(end) };
  }


  /**
   * 判断提交是否在日期范围内
   * @param dateText 提交时间文本
   * @returns 是否命中
   */
  function parseGitDate(dateText) {
    const raw = String(dateText || '').trim();
    if (!raw) return null;

    // git 时间格式：2026-01-02 10:00:00 +0800
    // 注意：本文件是模板字符串，正则里的反斜杠需写两份
    const m = /^(\\d{4})-(\\d{1,2})-(\\d{1,2})[ T](\\d{1,2}):(\\d{2}):(\\d{2})/.exec(raw);
    if (!m) return null;

    const utcWall = Date.UTC(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4]), Number(m[5]), Number(m[6]),
    );
    return isNaN(utcWall) ? null : utcWall;
  }

  /**
   * 判断提交是否在选定的日期范围内
   * @param dateText 提交时间
   * @returns 是否命中
   */
  function inDateRange(dateText) {
    if (!state.filterDateFrom && !state.filterDateTo) return true;
    const time = parseGitDate(dateText);
    if (time === null) return true;

    if (state.filterDateFrom && time < parseGitDate(state.filterDateFrom + ' 00:00:00')) return false;
    if (state.filterDateTo && time > parseGitDate(state.filterDateTo + ' 23:59:59')) return false;
    return true;
  }

  /**
   * 选择过滤路径
   */
  async function pickFilterPath(anchor) {
    const current = state.filterPath ? [state.filterPath] : [];
    const items = [{ id: 'all', label: '全部', checked: !current.length }];
    // 已选路径作为一条显示，点击可移除
    if (current.length) {
      items.push({ id: 'p:' + current[0], label: current[0], checked: true });
    }
    items.push({ id: 'sep', label: '', kind: 'separator' });
    items.push({ id: 'pick', label: '选择文件夹…' });
    items.push({ id: 'edit', label: '编辑路径…' });

    showDropdown(anchor, items, function (id) {
      if (id === 'all') {
        state.filterPath = null;
      } else if (id.indexOf('p:') === 0) {
        // 移除已选路径
        state.filterPath = null;
      } else if (id === 'pick') {
        // 选择文件夹：树状勾选，目录整选
        void editPaths(current);
        return;
      } else if (id === 'edit') {
        // 编辑路径：同一棵树，便于逐条调整
        void editPaths(current);
        return;
      }
      renderToolbar();
      void loadCommits(state.filterBranch || undefined);
    });
  }

  /**
   * 打开路径树勾选对话框
   * @param current 当前已选路径
   */
  async function editPaths(current) {
    let files = [];
    try {
      files = await call('listFiles');
    } catch (err) {
      logError('panel', 'list_files_failed', { error: String(err) });
      toast('读取文件列表失败：' + (err.message || err), true);
      return;
    }
    if (!files || !files.length) {
      toast('仓库中没有可过滤的文件', true);
      return;
    }
    openPathTree(files, current);
  }

  /**
   * 由文件列表构建目录树
   * @param files 文件路径列表
   * @returns 根节点
   */
  function buildPathTree(files) {
    const roots = [];
    const byPath = {};

    files.forEach(function (file) {
      if (!file) return;
      const segments = file.split('/');
      let parent = null;
      let currentPath = '';

      segments.forEach(function (segment, index) {
        if (!segment) return;
        currentPath = currentPath ? currentPath + '/' + segment : segment;
        const isLast = index === segments.length - 1;

        let node = byPath[currentPath];
        if (!node) {
          node = { path: currentPath, name: segment, isDir: !isLast, children: [] };
          byPath[currentPath] = node;
          if (parent) parent.children.push(node);
          else roots.push(node);
        }
        parent = node;
      });
    });

    // 目录在前，同级按名称排序
    function sortNodes(nodes) {
      nodes.sort(function (a, b) {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(function (n) { sortNodes(n.children); });
    }
    sortNodes(roots);
    return roots;
  }

  /**
   * 路径树勾选对话框
   * @param files 已跟踪文件
   * @param current 当前已选路径
   */
  function openPathTree(files, current) {
    const roots = buildPathTree(files);
    // 单选：只保留一个已选路径（与 IDEA 一致）
    let selectedPath = current[0] || null;
    // 顶层目录默认展开一层
    const expanded = new Set(roots.filter(function (n) { return n.isDir; }).map(function (n) { return n.path; }));

    const overlay = el('div', 'dlg-overlay');
    const box = el('div', 'dlg-box wide');
    box.appendChild(el('div', 'dlg-message', '选择要过滤的路径'));

    const tree = el('div', 'ptree');
    box.appendChild(tree);

    const hint = el('div', 'dlg-hint');
    box.appendChild(hint);

    const actions = el('div', 'dlg-actions');
    const clear = el('button', 'dlg-btn', '清除');
    const cancel = el('button', 'dlg-btn', '取消');
    const ok = el('button', 'dlg-btn primary', '确定');
    actions.appendChild(clear);
    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function updateHint() {
      hint.textContent = selectedPath ? '已选：' + selectedPath : '未选择（未选则不过滤）';
    }

    function renderTree() {
      tree.innerHTML = '';

      function renderNodes(nodes, depth) {
        nodes.forEach(function (node) {
          const row = el('div', 'ptree-row');
          row.style.paddingLeft = (8 + depth * 14) + 'px';

          // 目录可展开
          if (node.isDir) {
            const arrow = el('span', 'ptree-arrow', expanded.has(node.path) ? '▾' : '▸');
            arrow.onclick = function (ev) {
              ev.stopPropagation();
              if (expanded.has(node.path)) expanded.delete(node.path);
              else expanded.add(node.path);
              renderTree();
            };
            row.appendChild(arrow);
          } else {
            row.appendChild(el('span', 'ptree-arrow', ''));
          }

          const check = el('span', 'ptree-check', selectedPath === node.path ? '✓' : '');
          row.appendChild(check);
          row.appendChild(el('span', 'ptree-name' + (node.isDir ? ' dir' : ''), node.name));

          row.onclick = function () {
            // 单选：再次点击已选项则取消，否则替换为新选项
            selectedPath = selectedPath === node.path ? null : node.path;
            renderTree();
          };

          tree.appendChild(row);

          if (node.isDir && expanded.has(node.path) && node.children.length) {
            renderNodes(node.children, depth + 1);
          }
        });
      }

      renderNodes(roots, 0);
      updateHint();
    }

    renderTree();

    clear.onclick = function () {
      selectedPath = null;
      renderTree();
    };
    cancel.onclick = function () {
      overlay.remove();
    };
    ok.onclick = function () {
      overlay.remove();
      state.filterPath = selectedPath;
      logDebug('panel', 'filter_path_applied', { path: selectedPath });
      renderToolbar();
      void loadCommits(state.filterBranch || undefined);
    };
    overlay.onclick = function (ev) {
      if (ev.target === overlay) overlay.remove();
    };
  }


  /**
   * 视图选项：列显隐与排序模式
   * 对齐现有面板的视图选项菜单
   */
  /**
   * 打开视图选项菜单
   * @param anchor 触发按钮，菜单定位到其下方
   */
  async function openViewOptions(anchor) {
    const box = document.getElementById('view-options');
    if (box) { box.remove(); return; }

    const panel = el('div');
    panel.id = 'view-options';
    // 跟随触发按钮定位，避免固定位置离按钮过远
    let top = 48;
    let left = 16;
    if (anchor && anchor.getBoundingClientRect) {
      const rect = anchor.getBoundingClientRect();
      top = Math.round(rect.bottom + 4);
      left = Math.max(8, Math.round(rect.left));
    }
    panel.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;z-index:50;'
      + 'background:var(--vscode-menu-background);color:var(--vscode-menu-foreground);'
      + 'border:1px solid var(--vscode-menu-border);border-radius:4px;padding:6px 0;min-width:180px;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;';

    function section(title) {
      const head = el('div', '', title);
      head.style.cssText = 'padding:4px 12px;font-size:11px;color:var(--vscode-descriptionForeground);';
      panel.appendChild(head);
    }

    function checkItem(label, checked, onToggle) {
      const row = el('div', '', (checked ? '✓ ' : '   ') + label);
      row.style.cssText = 'padding:3px 12px;cursor:pointer;white-space:nowrap;';
      row.onmouseenter = function () { row.style.background = 'var(--vscode-menu-selectionBackground)'; };
      row.onmouseleave = function () { row.style.background = 'transparent'; };
      row.onclick = function () { onToggle(); panel.remove(); };
      panel.appendChild(row);
    }

    section('显示列');
    checkItem('作者', state.columns.author, function () {
      state.columns.author = !state.columns.author;
      renderCommits();
    });
    checkItem('时间', state.columns.date, function () {
      state.columns.date = !state.columns.date;
      renderCommits();
    });
    checkItem('哈希', state.columns.hash, function () {
      state.columns.hash = !state.columns.hash;
      renderCommits();
    });

    checkItem('显示提交图', state.showGraph, function () {
      state.showGraph = !state.showGraph;
      renderCommits();
    });

    section('排序');
    [['default', '默认'], ['date-desc', '日期新→旧'], ['date-asc', '日期旧→新'], ['author', '作者']].forEach(function (pair) {
      checkItem(pair[1], state.sortMode === pair[0], function () {
        state.sortMode = pair[0];
        renderCommits();
      });
    });

    document.body.appendChild(panel);

    // 点击面板外部关闭
    setTimeout(function () {
      const closer = function (ev) {
        if (!panel.contains(ev.target)) {
          panel.remove();
          document.removeEventListener('click', closer);
        }
      };
      document.addEventListener('click', closer);
    }, 0);
  }

  /**
   * 按排序模式处理提交
   * @param commits 提交列表
   * @returns 排序后的列表
   */
  function sortCommits(commits) {
    const list = commits.slice();
    if (state.sortMode === 'date-desc') {
      list.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    } else if (state.sortMode === 'date-asc') {
      list.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    } else if (state.sortMode === 'author') {
      list.sort(function (a, b) { return String(a.authorName).localeCompare(String(b.authorName)); });
    }
    return list;
  }

  /**
   * 跳转到引用
   */
  async function gotoRef() {
    const value = await showPrompt('跳转到提交哈希或分支', '');
    if (!value) return;
    const hit = state.commits.filter(function (c) {
      return c.hash.indexOf(value) === 0 || c.shortHash === value;
    });
    if (!hit.length) { toast('未找到 ' + value, true); return; }
    state.selectedCommit = hit[0].hash;
    renderCommits();
    await loadDetail(hit[0].hash);
  }

  /**
   * 按当前过滤条件筛选提交
   * @param commits 原始提交
   * @returns 过滤后的提交
   */
  /**
   * 编译搜索条件
   * 正则模式下语法错误会抛错，由调用方标记给用户
   * @returns 匹配函数；无搜索词时返回 null
   */
  function buildMatcher() {
    const search = state.search || '';
    if (!search) return null;
    if (state.useRegex) {
      // 让非法正则直接抛出，便于在界面上提示，而不是静默返回空结果
      const re = new RegExp(search, state.caseSensitive ? '' : 'i');
      return function (text) {
        // 全局标志会让 test 带状态，这里每次重置
        re.lastIndex = 0;
        return re.test(text);
      };
    }
    const needle = state.caseSensitive ? search : search.toLowerCase();
    return function (text) {
      const haystack = state.caseSensitive ? text : text.toLowerCase();
      return haystack.indexOf(needle) >= 0;
    };
  }

  /**
   * 按当前条件筛选提交
   * @param commits 原始提交
   * @returns 过滤后的提交
   */
  function filterCommits(commits) {
    const user = state.filterUser || '';

    let match = null;
    try {
      match = buildMatcher();
    } catch (err) {
      // 正则非法：本次不按搜索词过滤，错误由 updateSearchState 展示
      match = null;
    }

    return commits.filter(function (c) {
      // 作者过滤
      if (user && (c.authorName || '').toLowerCase().indexOf(user.toLowerCase()) < 0) return false;
      // 日期过滤
      if (!inDateRange(c.date)) return false;
      if (!match) return true;
      return match((c.message || '') + ' ' + (c.hash || '') + ' ' + (c.shortHash || ''));
    });
  }

  /**
   * 更新搜索框的合法性提示
   * 正则语法错误时标红并给出说明，避免用户以为「搜不到」
   */
  function updateSearchState() {
    const search = document.getElementById('commit-search');
    if (!search) return;

    let invalid = false;
    if (state.useRegex && state.search) {
      try {
        new RegExp(state.search, state.caseSensitive ? '' : 'i');
      } catch (err) {
        invalid = true;
      }
    }

    search.classList.toggle('invalid', invalid);
    if (invalid) {
      search.title = '正则表达式语法错误';
      search.setAttribute('aria-invalid', 'true');
    } else {
      search.title = state.search ? '按 Enter 跳到首个匹配，Esc 清空' : '搜索提交信息或哈希';
      search.removeAttribute('aria-invalid');
    }
  }

  // ---- 提交图 ----
  // 与现有面板同一套算法：按父提交出现顺序分配列，同列沿用颜色
  const GRAPH_COLORS = ['#589df6', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

  /**
   * 计算每个提交所属图的列
   * @param commits 提交列表
   * @returns 每行的列分配
   */
  function calculateGraphRows(commits) {
    const rows = [];
    const columnMap = new Map();
    let nextColumn = 0;

    commits.forEach(function (commit) {
      let column;
      if (columnMap.has(commit.hash)) {
        column = columnMap.get(commit.hash);
      } else {
        column = nextColumn++;
        columnMap.set(commit.hash, column);
      }

      const parents = commit.parents || [];
      for (let i = 0; i < parents.length; i += 1) {
        const parentHash = parents[i];
        if (!columnMap.has(parentHash)) {
          if (i === 0) columnMap.set(parentHash, column);
          else columnMap.set(parentHash, nextColumn++);
        }
      }

      rows.push({ hash: commit.hash, column: column, hasMerge: parents.length > 1 });
    });

    return rows;
  }

  /**
   * 生成单行图线 SVG
   * @param graphRow 列分配
   * @param maxColumn 最大列号
   * @returns SVG 字符串
   */
  function graphSvg(graphRow) {
    // 图线区固定宽度：不随列号变化，保证每行标题起点一致，也不会把标题挤出屏幕
    const colWidth = 10;
    const maxColumns = 4;
    const shownColumn = Math.min(graphRow.column, maxColumns - 1);
    const width = maxColumns * colWidth;
    const x = shownColumn * colWidth + colWidth / 2;
    const color = GRAPH_COLORS[graphRow.column % GRAPH_COLORS.length];

    let body = '<svg width="' + width + '" height="20" style="display:block;flex-shrink:0">';
    // 主干竖线
    body += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="20" stroke="' + color + '" stroke-width="1.5"/>';
    // 提交节点
    body += '<circle cx="' + x + '" cy="10" r="3" fill="' + color + '"/>';
    // 合并提交额外画一条分支线，提示存在多个父提交
    if (graphRow.hasMerge) {
      // 合并线限制在 svg 宽度内，超出会被裁掉
      const bx = Math.min(x + colWidth, width - 2);
      body += '<path d="M' + x + ' 10 Q' + bx + ' 10 ' + bx + ' 20" fill="none" stroke="'
        + GRAPH_COLORS[(graphRow.column + 1) % GRAPH_COLORS.length] + '" stroke-width="1.5"/>';
    }
    body += '</svg>';
    return body;
  }

  // ---- 渲染：底部页签 ----
  const BOTTOM_TABS = [
    { key: 'git', label: 'Git' },
    { key: 'console', label: '控制台' },
    { key: 'worktrees', label: 'Worktrees' },
  ];

  /** 当前激活的底部页签；null 表示收起 */
  function renderBottom() {
    const box = document.getElementById('bottom');
    box.innerHTML = '';

    const tabs = el('div');
    tabs.id = 'bottom-tabs';
    BOTTOM_TABS.forEach(function (tab) {
      const node = el('div', 'tab' + (state.bottomTab === tab.key ? ' active' : ''), tab.label);
      node.onclick = function () {
        // 再次点击已激活页签则收起，与现有面板一致
        state.bottomTab = state.bottomTab === tab.key ? null : tab.key;
        renderBottom();
      };
      tabs.appendChild(node);
    });
    box.appendChild(tabs);

    const body = el('div');
    body.id = 'bottom-body';
    if (state.bottomTab) body.classList.add('open');
    box.appendChild(body);

    if (state.bottomTab === 'console') renderConsole(body);
    if (state.bottomTab === 'worktrees') renderWorktrees(body);
  }

  /**
   * 控制台：git 命令日志
   * @param box 容器
   */
  async function renderConsole(box) {
    box.innerHTML = '';
    const head = el('div', 'section-title');
    head.appendChild(el('span', '', 'git 命令日志'));
    head.appendChild(el('span', 'spacer'));
    const clear = el('button', '', '清空');
    clear.onclick = function () {
      void (async function () {
        try {
          await call('clearCommandLogs');
          state.commandLogs = [];
          renderBottom();
        } catch (err) {
          toast('清空失败：' + (err.message || err), true);
        }
      })();
    };
    head.appendChild(clear);
    box.appendChild(head);

    let logs = state.commandLogs;
    if (!logs.length) {
      try {
        logs = await call('getCommandLogs', { since: 0 });
        state.commandLogs = logs || [];
      } catch (err) {
        box.appendChild(el('div', 'error', '读取命令日志失败：' + (err.message || err)));
        return;
      }
    }

    if (!state.commandLogs.length) {
      box.appendChild(el('div', 'empty', '暂无 git 命令'));
      return;
    }

    const list = el('div', 'cmd-list');
    // 新命令在上，便于直接看到最近一次操作
    state.commandLogs.slice().reverse().forEach(function (log) {
      const row = el('div', 'cmd-row');
      const ok = log.ok !== false;
      row.appendChild(el('span', 'cmd-status' + (ok ? '' : ' fail'), ok ? '✓' : '✗'));
      row.appendChild(el('span', 'cmd-text', log.command));
      row.appendChild(el('span', 'cmd-meta', (log.durationMs || 0) + 'ms'));
      row.title = (log.stderr || log.stdout || '').slice(0, 500);
      list.appendChild(row);
    });
    box.appendChild(list);
  }

  /**
   * Worktrees 列表
   * @param box 容器
   */
  async function renderWorktrees(box) {
    box.innerHTML = '';
    const head = el('div', 'section-title');
    head.appendChild(el('span', '', 'Worktrees'));
    head.appendChild(el('span', 'spacer'));

    const addBtn = el('button', '', '新建');
    addBtn.onclick = function () { void addWorktreeFlow(); };
    head.appendChild(addBtn);

    const pruneBtn = el('button', '', '清理失效项');
    pruneBtn.onclick = function () { void pruneWorktreesFlow(); };
    head.appendChild(pruneBtn);
    box.appendChild(head);

    let list;
    try {
      list = await call('listWorktrees');
      state.worktrees = list || [];
    } catch (err) {
      box.appendChild(el('div', 'error', '读取 worktree 失败：' + (err.message || err)));
      return;
    }

    if (!state.worktrees.length) {
      box.appendChild(el('div', 'empty', '没有 worktree'));
      return;
    }

    const wrap = el('div', 'wt-list');
    state.worktrees.forEach(function (wt) {
      const row = el('div', 'wt-row');
      row.appendChild(el('span', 'wt-path', wt.path));
      if (wt.branch) {
        // git 返回 refs/heads/xxx 形式，展示时去掉前缀
        row.appendChild(el('span', 'wt-branch', String(wt.branch).replace('refs/heads/', '')));
      }
      if (wt.isMain) row.appendChild(el('span', 'wt-main', '主工作区'));

      if (!wt.isMain) {
        const remove = el('button', '', '移除');
        remove.onclick = function () { void removeWorktreeFlow(wt.path); };
        row.appendChild(remove);
      }
      wrap.appendChild(row);
    });
    box.appendChild(wrap);
  }

  /**
   * 新建 worktree
   */
  async function addWorktreeFlow() {
    const path = await showPrompt('新 worktree 的目标路径', '');
    if (!path) return;
    const branch = await showPrompt('绑定的分支名', '');
    if (!branch) return;
    try {
      await call('addWorktree', { path: path, branchName: branch });
      toast('已创建 worktree');
      state.worktrees = [];
      renderBottom();
    } catch (err) {
      toast('创建 worktree 失败：' + (err.message || err), true);
    }
  }

  /**
   * 移除 worktree
   * @param path 路径
   */
  async function removeWorktreeFlow(path) {
    const ok = await showConfirm('移除 worktree ' + path + '？');
    if (!ok) return;
    try {
      await call('removeWorktree', { path: path });
      toast('已移除 worktree');
      state.worktrees = [];
      renderBottom();
    } catch (err) {
      toast('移除失败：' + (err.message || err), true);
    }
  }

  /**
   * 清理失效项
   */
  async function pruneWorktreesFlow() {
    try {
      await call('pruneWorktrees');
      toast('已清理失效项');
      state.worktrees = [];
      renderBottom();
    } catch (err) {
      toast('清理失败：' + (err.message || err), true);
    }
  }

  // ---- 主进程消息 ----
  window.addEventListener('message', function (event) {
    const message = event.data;
    if (!message) return;

    if (message.type === 'response') {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.ok) waiter.resolve(message.data);
      else waiter.reject(new Error(message.error || '未知错误'));
      return;
    }

    if (message.type === 'event') {
      if (message.name === 'repositoryChanged') { void loadAll(); }
      if (message.name === 'focusCommit' && message.payload) { void loadDetail(message.payload); }
      if (message.name === 'toast') { toast(String(message.payload), false); }
    }
  });

  // ---- 初始化 ----
  renderSidebar();
  renderToolbar();
  renderBottom();
  renderBranches();
  renderCommits();
  renderDetail();
  void loadAll();
})();
`;
