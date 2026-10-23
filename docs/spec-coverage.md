# 规格覆盖盘点

> 基线：`docs/git-ide-feature-spec.md`（git 最后更新 2026-10-23，commit `f4a2ec9`）
> 本文档为 spec 条目与实现的逐项对照
>
> 代码核对范围：
> - `packages/core/src/git/`（branches / log / diff / staging / remote / conflict / files / executor / types）
> - `packages/openchamber/service/main.ts`（HTTP 端点清单）
> - `packages/openchamber/panel/`（components / state / service / i18n / main）
>
> spec 共 147 处 P0/P1/P2 标记 = **144 条表格功能条目** + 3 个 §10 分级标题（P0/P1/P2 标题各 1）。
> 本盘点以 144 条表格条目为统计口径；§10 汇总清单另附映射表（不计入 144 统计）。

## 状态判定标准

- ✅ **已实现**：spec 要求的能力有完整可运行链路（UI 入口 + 执行逻辑），入口位置/文案差异不影响使用。
- 🟡 **部分实现**：链路缺关键环节或行为与 spec 有实质偏差，例如——有服务端端点 + 客户端封装但缺 UI 入口；能力可用但 spec 明确要求的维度（批量、基线选择、模式选择、跳转交互）缺失；UI 在但行为与 spec 不符。
- ❌ **未实现**：无有效执行路径。包括三种情形——完全不存在；UI 入口存在但动作为 `console.log` 桩（点击无实际效果）；仅核心层有函数但无端点、无入口。

---

## 总览

| 优先级 | 总数 | 已实现 ✅ | 部分实现 🟡 | 未实现 ❌ |
|--------|------|-----------|--------------|------------|
| P0 | 44 | 16 | 12 | 16 |
| P1 | 62 | 15 | 13 | 34 |
| P2 | 38 | 2 | 1 | 35 |
| **合计** | **144** | **33** | **26** | **85** |

按章节分布：

| spec 章节 | 条目数 | ✅ | 🟡 | ❌ |
|-----------|--------|----|----|----|
| §2.1 分支面板工具栏 | 12 | 3 | 4 | 5 |
| §2.6 分支右键菜单 | 14 | 6 | 4 | 4 |
| §3.1 提交搜索工具栏 | 12 | 9 | 2 | 1 |
| §3.2 图选项菜单 | 6 | 0 | 1 | 5 |
| §3.3 显示设置 | 15 | 3 | 0 | 12 |
| §3.4 提交列表项 | 6 | 4 | 2 | 0 |
| §3.6 提交右键菜单 | 24 | 5 | 2 | 17 |
| §4.1 变更文件列表 | 3 | 1 | 1 | 1 |
| §4.2 文件列表工具栏 + 视图选项 | 10 | 0 | 3 | 7 |
| §4.3 文件右键菜单 | 14 | 0 | 0 | 14 |
| §5.1 提交详情内容 | 6 | 1 | 4 | 1 |
| §6.1 底部标签页 | 3 | 1 | 1 | 1 |
| §6.2 状态信息 | 5 | 0 | 0 | 5 |
| §7.1 快捷键 | 14 | 0 | 2 | 12 |

---

## 逐项对照

### §2.1 A区域 - 分支面板工具栏

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §2.1 | ← 隐藏分支面板 | P2 | ✅ | `panel/components/sidebar.ts` hideBranches 按钮 + `state.branchPanelHidden` 会话级显隐（`panel/main.ts` onToggleBranchPanel） |
| §2.1 | + 新建分支（基于选中分支） | P0 | 🟡 | 入口在（sidebar newBranch → `dialogs.ts` showCreateBranchDialog → `/git-create-branch`），但始终基于当前 HEAD 创建，不基于选中分支，对话框也无「基于分支」选择 |
| §2.1 | ↓ 更新选中（从选中分支 Fetch） | P1 | ❌ | 无「按选中分支 Fetch」入口；`/git-fetch`（`service/main.ts:328`）为 fetch --all 且无任何 UI 调用 |
| §2.1 | 🗑 删除分支（支持批量） | P0 | ❌ | 分支面板工具栏与侧栏均无删除按钮；分支面板无多选机制。删除仅有右键单分支路径（见 §2.6 Delete） |
| §2.1 | ⇄ 与当前比较 | P1 | 🟡 | `service.ts` getBranchDiff + 端点 `/git-branch-diff`（`service/main.ts:260`，core `getBranchDiffFiles`）两端已备，panel 内无调用（仅测试引用） |
| §2.1 | 🔍 显示我的分支（按作者过滤） | P1 | ❌ | 无「我创建的分支」过滤；仅有收藏过滤（`commit-list.ts` openBranchDropdown 的 favorites 分组，语义不同） |
| §2.1 | ↗ Fetch 所有远程 | P1 | 🟡 | `service.ts` fetch + 端点 `/git-fetch`（git fetch --all）已备，无 UI 入口 |
| §2.1 | ★ 收藏/取消收藏 | P1 | ✅ | sidebar favorite（`main.ts` runSidebarFavorite）+ 分支右键菜单收藏，`/git-favorites-get/set` 持久化到 `.git/git-manager-favorites.json`（注：不在分支面板工具栏，在全局侧栏/右键） |
| §2.1 | ◎ 定位到分支 HEAD | P2 | ❌ | 无此入口 |
| §2.1 | ⚙ 面板设置（单击行为、分组、显示标签） | P2 | 🟡 | sidebar settings 打开的是显示设置菜单（`settings-menu.ts`，仅作者/日期/哈希三列开关），无单击行为/分组/标签设置 |
| §2.1 | ⊕ 展开全部 | P2 | ✅ | sidebar expandAll → `branch-panel.ts` expandAll()（HEAD/本地/远程 + 文件夹分组） |
| §2.1 | ⊖ 折叠全部 | P2 | ❌ | 无折叠全部入口 |

### §2.6 分支右键上下文菜单

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §2.6 | Checkout | P0 | ✅ | `context-menu.ts` branch.checkout → `/git-checkout`（注：`service.ts` checkoutBranch 先自动 stash 再签出） |
| §2.6 | New Branch From \<selected_branch\> | P0 | ❌ | 右键菜单无「从选定分支新建」项；现有新建对话框固定基于当前 HEAD，也无从选中分支出发的链路 |
| §2.6 | Checkout and Rebase onto \<current\> | P1 | ❌ | 菜单无此项，无组合操作入口 |
| §2.6 | Compare with \<current_branch\> | P1 | 🟡 | 复用 §2.1 同一链路：`/git-branch-diff` + `service.ts` getBranchDiff 已备，菜单无该项、UI 无调用 |
| §2.6 | Show Diff with Working Tree | P1 | ❌ | `/git-diff-vs-local` 仅面向提交哈希（`service/main.ts:287`），无分支级「与工作树比较」入口 |
| §2.6 | Rebase \<current\> onto \<selected\> | P1 | ✅ | `context-menu.ts` branch.rebase（文案「变基到此分支」）→ `/git-rebase` → `branches.ts` rebase（git rebase \<selected\>） |
| §2.6 | Merge \<selected\> into \<current\> | P0 | ✅ | `context-menu.ts` branch.merge（「合并到当前分支」）→ `/git-merge` → `branches.ts` merge |
| §2.6 | New Worktree from \<selected\> | P2 | ❌ | 菜单无此项，core `git/` 亦无 worktree 支持 |
| §2.6 | Pull into \<current\> Using Rebase | P1 | 🟡 | 仅通用 Pull（branch.pull → `/git-pull`），无 rebase 模式选择；端点固定 `git pull` 无参数 |
| §2.6 | Pull into \<current\> Using Merge | P1 | 🟡 | 同上，仅通用 Pull，无 merge/rebase 模式选择 |
| §2.6 | Update（从远程拉取） | P1 | ✅ | 由通用 Pull 承载（`context-menu.ts` branch.pull → `/git-pull` → core `remote.ts` pull = fetch+merge）；无独立 Update 项 |
| §2.6 | Push | P1 | ✅ | `context-menu.ts` branch.push → `/git-push` → core `remote.ts` push |
| §2.6 | Rename | P1 | ✅ | `context-menu.ts` branch.rename → `dialogs.ts` showRenameDialog → `/git-rename-branch` → `branches.ts` renameBranch |
| §2.6 | Delete（支持批量） | P0 | 🟡 | 单删全链路完整：无确认直删、NOT_MERGED 才弹强制删除框（`dialogs.ts` showDeleteBranchDialog）、删除通知含还原/删跟踪动作（`notify.ts`）、`/git-restore-branch` 可还原；**批量删除与分支多选缺失** |

### §3.1 B区域 - 提交搜索工具栏

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §3.1 | 搜索框（哈希/消息/作者） | P0 | ✅ | `commit-list.ts` data-search-input 实时过滤，`filterCommits` 匹配 message/shortHash/authorName（注：Ctrl+L 聚焦快捷键缺失，见 §7.1） |
| §3.1 | .* 正则切换 | P1 | ✅ | `commit-list.ts` btn-regex → toggleRegex，`searchRegex` 状态 + matchesSearch 正则分支（非法正则回退字面量） |
| §3.1 | Cc 大小写切换 | P1 | ✅ | `commit-list.ts` btn-case → toggleCase，`searchCaseSensitive` 状态 |
| §3.1 | 分支下拉 All/本地/远程/收藏 | P0 | ✅ | `commit-list.ts` openBranchDropdown：All + 本地/远程/收藏分组 → logBranch 过滤重新拉取 |
| §3.1 | 用户下拉 All/用户列表 | P1 | ✅ | `commit-list.ts` openUserDropdown（allCommits 去重作者）→ filterAuthor 本地过滤 |
| §3.1 | 日期下拉（Today/Week/Month/Year/自定义） | P1 | ✅ | `commit-list.ts` openDateDropdown + computeDateRange 四预设 + `dialogs.ts` showDateRangeDialog 自定义区间 |
| §3.1 | 路径下拉（全部/逐条移除/树选≤100/编辑路径） | P1 | ✅ | `commit-list.ts` openPathDropdown + `dialogs.ts` showPathTreeDialog（三态勾选、MAX=100）/ showPathFilterDialog（多行、去重、≤100），服务端 `git log -- pathspec`（`log.ts` getLog） |
| §3.1 | 图选项按钮 | P2 | ❌ | 工具栏无图选项按钮，也无对应菜单 |
| §3.1 | 刷新按钮 | P0 | ✅ | `commit-list.ts` btn-refresh → refreshCommits（注：Ctrl+F5 快捷键缺失，见 §7.1） |
| §3.1 | Cherry-pick 按钮 | P1 | 🟡 | 工具栏无按钮；能力入口在提交右键菜单（`context-menu.ts` → `/git-cherry-pick`） |
| §3.1 | 显示设置按钮 | P1 | ✅ | `commit-list.ts` btn-settings → `settings-menu.ts` showSettingsMenu（注：菜单仅含列开关，Show/Highlight 组缺失，见 §3.3） |
| §3.1 | 跳转按钮（哈希/分支/标签） | P1 | 🟡 | `commit-list.ts` btn-goto → `dialogs.ts` showGotoDialog + gotoReference：支持哈希前缀与分支名精确匹配；**标签跳转不支持**（无 Tags 数据） |

### §3.2 图选项菜单

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §3.2 | By commit date（默认排序） | P1 | 🟡 | 无图选项菜单；默认 git log 序即提交日期降序，侧栏另有排序循环（default/date-asc/author-asc/message-asc，`main.ts` onSort）可部分覆盖 |
| §3.2 | Topologically | P2 | ❌ | 无（core `log.ts` 未提供 --topo-order 参数） |
| §3.2 | Show First Parent | P2 | ❌ | 无 |
| §3.2 | No Merges | P2 | ❌ | 无（`log.ts` getLog 未加 --no-merges） |
| §3.2 | Collapse Linear Branches | P2 | ❌ | 无 |
| §3.2 | Expand Linear Branches | P2 | ❌ | 无 |

### §3.3 显示设置菜单

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §3.3 Show | Compact References View | P1 | ❌ | `state.displaySettings` 仅 {showAuthor, showDate, showHash}，无该字段；`settings-menu.ts` 仅渲染 3 项 |
| §3.3 Show | Tag Names | P1 | ❌ | 同上；且无 Tags 数据源（`branches.ts` listBranches 用 `git branch -a`，不含标签） |
| §3.3 Show | Long Edges | P2 | ❌ | 无字段无菜单项 |
| §3.3 Show | Commit Timestamp | P1 | ❌ | 无（`log.ts` 固定 `%ai` 作者时间，无 committer 时间选项） |
| §3.3 Show | References on the Left | P1 | ❌ | 无字段无菜单项 |
| §3.3 Show | Show Root Names | P2 | ❌ | 无（亦无多仓库支持） |
| §3.3 Columns | Author | P0 | ✅ | `settings-menu.ts` showAuthor + `commit-list.ts` createCommitItem authorCol 按开关渲染 |
| §3.3 Columns | Date | P0 | ✅ | 同上 showDate → dateCol |
| §3.3 Columns | Hash | P0 | ✅ | 同上 showHash → hashCol（shortHash） |
| §3.3 Columns | GPG Signature | P2 | ❌ | 无（`log.ts` 格式无 %G? 签名字段） |
| §3.3 Columns | GitHub Checks | P2 | ❌ | 无 |
| §3.3 Highlight | My Commits（我的提交加粗） | P0 | ❌ | `createCommitItem` 无作者身份判定与加粗逻辑（无当前用户身份配置） |
| §3.3 Highlight | Merge Commits（合并提交灰色） | P1 | ❌ | 无合并提交判定样式（parents.length>1 未用于样式） |
| §3.3 Highlight | Current Branch（当前分支蓝色背景） | P0 | ❌ | 无「当前分支提交」蓝底；选中行 `#2a3a4a` 属选中态，与当前分支无关 |
| §3.3 Highlight | Not Cherry-Picked Commits | P2 | ❌ | 无 |

### §3.4 提交列表项

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §3.4 | 提交图线（点+线） | P1 | 🟡 | `components/commit-graph.ts` calculateGraphRows / generateRowGraphSVG 已实现且有测试，但 **`commit-list.ts` 未接入**（createCommitItem 仅静态圆点），列表内不可见 |
| §3.4 | 作者名称 | P0 | ✅ | `createCommitItem` authorCol（displaySettings 可关） |
| §3.4 | 时间戳（相对时间） | P0 | ✅ | `commit-list.ts` formatDate：刚刚/N分钟前/N小时前/N天前/日期 |
| §3.4 | 分隔符 \| | P0 | 🟡 | 行内未渲染「\|」，列序也与 spec 示例不同（spec: 作者 时间 \| 消息；实现: 圆点 哈希 消息 标签 时间 作者），以布局间距分隔 |
| §3.4 | 提交消息（单行截断） | P0 | ✅ | `createCommitItem` message span：ellipsis 单行截断 |
| §3.4 | 分支标签（可多个） | P0 | ✅ | branchMap 收集 commit→branches，多标签彩色渲染（本地橙/远程蓝）；无紧凑/展开切换（始终全显示） |

### §3.6 提交列表右键菜单

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §3.6 | Copy Revision Number | P0 | ✅ | `context-menu.ts` commit.copyRevision → clipboard.writeText(hash)；批量菜单另有 Copy Hash List |
| §3.6 | Create Patch | P2 | ❌ | 无（无 format-patch/git diff 输出端点与入口） |
| §3.6 | Cherry-pick | P1 | ✅ | `context-menu.ts` → `service.ts` cherryPick → `/git-cherry-pick`（注：失败仅 console.error，无冲突处理 UI） |
| §3.6 | Checkout Revision | P1 | ❌ | 菜单无此项，无按哈希检出端点 |
| §3.6 | Show Repository at Revision | P2 | ❌ | 无 |
| §3.6 | Compare with Local | P1 | ✅ | 菜单项 + 工具栏 btn-compare → `/git-diff-vs-local`（`getCommitDiff(hash, "")`）→ state.diffs 预览 |
| §3.6 | Reset Current Branch to Here（Soft/Mixed/Hard） | P1 | ✅ | `context-menu.ts` showResetDialog 三模式单选 → `/git-reset`（`git reset --<mode> <hash>`）；`dialogs.ts` 另有带默认 Mixed 的版本 |
| §3.6 | Revert Commit | P1 | ✅ | `context-menu.ts` → `service.ts` revert → `/git-revert`（git revert --no-edit） |
| §3.6 | Undo Commit（仅限未推送） | P1 | 🟡 | `service.ts` undoCommit + 端点 `/git-undo-commit`（git reset --soft HEAD~1）已备，**菜单无入口**（仅测试调用） |
| §3.6 | Edit Commit Message | P1 | ❌ | core `staging.ts` amendCommit 存在，但无端点、无 UI 入口 |
| §3.6 | Fixup | P2 | ❌ | 无 |
| §3.6 | Squash Into | P2 | ❌ | 无 |
| §3.6 | Drop Commits | P2 | ❌ | 无 |
| §3.6 | Squash Commits | P2 | ❌ | 无 |
| §3.6 | Interactively Rebase from Here | P2 | ❌ | 无（`log.ts`/service 均无 interactive rebase 支持） |
| §3.6 | Push All up to Here | P2 | ❌ | 无 |
| §3.6 | Add Commits to Remote Branch | P2 | ❌ | 无 |
| §3.6 | Rebase \<current\> onto Selected Commit | P1 | ❌ | 仅有分支级 rebase（`/git-rebase`），无「变基到选中提交」 |
| §3.6 | Branch / Branches 子菜单 | P1 | ❌ | 提交菜单无分支子菜单 |
| §3.6 | New Branch（从提交创建分支） | P0 | 🟡 | `context-menu.ts` showCreateBranchFromCommitDialog 展示「基于: \<commit\>」，但实际调 `checkoutNewBranch`（git checkout -b，**起点为当前 HEAD**）；core `branches.ts` createBranch 已支持 startPoint，`/git-create-branch`（`service/main.ts:172`）未透传 |
| §3.6 | New Tag（从提交创建标签） | P1 | ❌ | 菜单项存在但 action 为 `console.log` 桩（`context-menu.ts` 仅打印），无 tag 端点 |
| §3.6 | Go to Child Commit（Right） | P1 | ❌ | 无键盘导航（parents 数据已有，未做跳转） |
| §3.6 | Go to Parent Commit（Left） | P1 | ❌ | 同上 |
| §3.6 | View in Browser | P2 | ❌ | 无 |

> 批量多选菜单（spec 未单列）：`context-menu.ts` buildBatchCommitItems 提供 复制哈希列表 / 批量 Cherry-pick / 批量 Revert，配合 `commit-list.ts` Ctrl/Shift 多选与全选按钮。

### §4.1 C区域 - 变更文件列表

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §4.1 | 文件名（仓库根相对路径） | P0 | ✅ | `file-diff.ts` createFileDiffItem diff.path（`diff.ts` 各解析函数均取 `b/<path>` 相对路径）+ ellipsis |
| §4.1 | 状态标签 M/A/D/R | P0 | 🟡 | `file-diff.ts` getStatusLabel **按路径特征猜测**（`.new.`→A 等），真实 diff 路径不含这些标记，普通路径恒显示 M；A/D/R 实际不可达（`diff.ts` 输出无状态字段） |
| §4.1 | 文件图标（按类型） | P1 | ❌ | 列表仅渲染状态字母与路径，无文件类型图标 |

### §4.2 文件列表工具栏与视图选项

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §4.2 | ⇄ 显示差异（选中文件，Ctrl+D） | P0 | 🟡 | 无工具栏、无 Ctrl+D；但单击文件即渲染差异预览（`file-diff.ts` listContainer click → renderPreview），核心效果可达 |
| §4.2 | ↩ 还原所选更改 | P1 | ❌ | core `staging.ts` discard 存在，无端点、无 UI 入口 |
| §4.2 | 📁 文件历史 | P1 | ❌ | core `log.ts` getFileHistory 存在，无端点、无 UI 入口（仅可经路径过滤间接查看该路径提交） |
| §4.2 | 👁 视图选项 | P2 | ❌ | 无视图选项菜单 |
| §4.2 | ⊕ 展开全部 | P2 | ❌ | 文件列表为平铺，无树结构 |
| §4.2 | ⊖ 折叠全部 | P2 | ❌ | 同上 |
| §4.2 视图 | Group By Directory | P2 | ❌ | 无分组逻辑 |
| §4.2 视图 | Group By Module | P2 | ❌ | 无 |
| §4.2 视图 | Show Details（显示提交详情面板） | P1 | 🟡 | 提交详情面板常驻显示（`main.ts` C2 区域 + `commit-detail.ts`），但无视图选项菜单/开关 |
| §4.2 视图 | Show Diff Preview（差异预览面板） | P1 | 🟡 | 差异预览面板常驻显示（`file-diff.ts` previewContainer 固定 120px），但无开关/菜单 |

### §4.3 文件右键菜单

> 实查结论：该菜单 11 个已有条目**全部为 `console.log` 桩**，点击无任何实际效果，故按「入口为骨架」判 ❌；spec 另有 3 个条目连菜单项都不存在。

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §4.3 | Show Diff | P0 | ❌ | `file-context-menu.ts` action = `console.log("[git-manager] Show Diff: ...")` 桩（单击文件的预览链路另行可用，见 §4.2/§4.4） |
| §4.3 | Show Diff in a New Window | P1 | ❌ | 同文件，action 为日志桩 |
| §4.3 | Compare with Local | P1 | ❌ | 同上（提交级 Compare with Local 可用，文件级为桩） |
| §4.3 | Compare Before with Local | P1 | ❌ | 同上，日志桩 |
| §4.3 | Edit Source（F4） | P1 | ❌ | 同上，日志桩 |
| §4.3 | Open Repository Version | P1 | ❌ | 同上，日志桩 |
| §4.3 | Revert Selected Changes | P1 | ❌ | 同上，日志桩（core discard 有实现但未接端点） |
| §4.3 | Cherry-Pick Selected Changes | P1 | ❌ | 同上，日志桩 |
| §4.3 | Extract Selected Changes to Separate Commit | P2 | ❌ | 菜单项不存在 |
| §4.3 | Drop Selected Changes | P2 | ❌ | 菜单项不存在 |
| §4.3 | Create Patch | P2 | ❌ | 日志桩 |
| §4.3 | Get from Revision | P1 | ❌ | 日志桩 |
| §4.3 | History Up to Here | P1 | ❌ | 日志桩 |
| §4.3 | Show Changes to Parents（合并提交） | P2 | ❌ | 菜单项不存在 |

### §5.1 D区域 - 提交详情

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §5.1 | 提交哈希（完整、可点击跳转） | P0 | 🟡 | `commit-detail.ts` 渲染完整 hash（mono），但纯文本不可点击跳转 |
| §5.1 | 作者信息（名称+邮箱、邮箱可点击） | P0 | 🟡 | 渲染 `name <email>`，邮箱为纯文本不可点击（mailto） |
| §5.1 | 提交日期（完整日期时间） | P0 | ✅ | `commit-detail.ts` `toLocaleString('zh-CN')` 完整时间 |
| §5.1 | 所属分支（>6 显示 Show All） | P0 | ❌ | 详情面板无分支字段（branchMap 仅用于提交列表标签） |
| §5.1 | 提交消息（多行、引用可点击） | P0 | 🟡 | `white-space: pre-wrap` 多行 ✓；issue/引用不可点击（无链接识别） |
| §5.1 | 变更摘要（文件变更统计） | P0 | 🟡 | 详情面板内无 Changes 块；±统计显示在 C 区文件列表（`file-diff.ts` +additions/-deletions）。core `log.ts` showCommit 带 --stat 但 UI 未消费 |

### §6.1 E区域 - 底部标签页

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §6.1 | Git 标签（当前面板） | P0 | ✅ | `main.ts` createTabBar 渲染 Git 标签（active 样式） |
| §6.1 | Console 标签 | P1 | 🟡 | 标签静态渲染（「控制台」），无点击处理器、无控制台内容视图 |
| §6.1 | Worktrees 标签 | P2 | ❌ | 静态占位（含 × 装饰），点击无动作；core `git/` 无 worktree 能力 |

### §6.2 状态信息

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §6.2 | + 新增文件数 | P0 | ❌ | `main.ts` createTabBar 只渲染三个标签，不渲染状态信息；`state.gitStatus` 恒为 null（无组件调用 `service.getStatus`） |
| §6.2 | ✓ 已修改文件数 | P0 | ❌ | 同上（`/git-status` 端点与 core `staging.ts` getStatus 已备，UI 未加载） |
| §6.2 | 仓库名 | P0 | ❌ | 底部栏未渲染仓库名 |
| §6.2 | 当前分支 | P0 | ❌ | createTabBar 计算了 `branchName` 但**变量未被使用**，分支名未显示 |
| §6.2 | 仓库路径 | P0 | ❌ | 底部栏未渲染仓库路径 |

### §7.1 全局快捷键

| spec 章节 | 功能 | 优先级 | 状态 | 证据（文件:能力）或缺口说明 |
|-----------|------|--------|------|------------------------------|
| §7.1 | Alt+9 打开 Git 工具窗口 | P0 | ❌ | 全仓库无快捷键注册（grep 无 Alt/F5/ctrlKey 全局监听；keydown 仅存在于对话框/下拉菜单局部） |
| §7.1 | Ctrl+F5 刷新所有 | P0 | ❌ | 刷新按钮可用（btn-refresh），快捷键缺失 |
| §7.1 | Ctrl+F 聚焦搜索框 | P0 | ❌ | 聚焦按钮可用（btn-search），快捷键缺失 |
| §7.1 | Ctrl+L 聚焦提交搜索框 | P0 | ❌ | 无 |
| §7.1 | Ctrl+C 复制选中项 | P0 | ❌ | 复制能力在右键菜单，快捷键缺失 |
| §7.1 | F4 编辑选中文件 | P1 | ❌ | 无 |
| §7.1 | Ctrl+D 显示差异 | P1 | ❌ | 无 |
| §7.1 | Ctrl+Z 撤销 | P1 | ❌ | 无 |
| §7.1 | Ctrl+Shift+Z 重做 | P1 | ❌ | 无 |
| §7.1 | Delete 还原更改 | P1 | ❌ | 无 |
| §7.1 | Enter 确认/打开 | P0 | 🟡 | 部分输入框支持（新建分支/goto/从提交建分支 Enter 提交，`dialogs.ts`、`context-menu.ts`）；重命名、日期对话框无 Enter；提交/文件列表无 Enter 导航 |
| §7.1 | Esc 取消/关闭对话框 | P0 | 🟡 | 日期范围/路径选择/路径编辑/强制删除对话框与全部下拉菜单支持 Escape（`dialogs.ts`、`dropdown-menu.ts`）；**新建/重命名/Goto/Reset/日期过滤对话框与各右键菜单不响应 Escape** |
| §7.1 | Left/Right 导航父/子提交 | P1 | ❌ | 无 |
| §7.1 | Ctrl+NumPad +/- 展开/折叠 | P2 | ❌ | 无 |

---

### 未标注优先级的 spec 章节速览

| spec 章节 | 功能 | 优先级 | 状态 | 证据或缺口说明 |
|-----------|------|--------|------|-----------------|
| §1 | 整体五区域布局 + 顶部统一工具栏 | — | 🟡 | 实际为 40px 图标侧栏 + 分支面板 + 提交列表（中）+ 变更文件/详情（右栏上下）+ 底部 Tab；spec 顶部工具栏 [Branch▼][Fetch][Pull][Push][Stash][Cherry-pick][Rebase][Merge][Reset] 未做，B/C/D 三区位置与 spec 示意图不一致（变更+详情移到右侧而非提交列表下方） |
| §2.2 | 分支搜索框（占位/X 清空/Esc/防抖 150ms/上下箭头） | — | 🟡 | 输入实时过滤可用（`branch-panel.ts` input → branchFilter）；X 清空按钮、Esc 清空、150ms 防抖、方向键选择均无 |
| §2.3 | 分组（HEAD/Local/Remote/**Tags** + 折叠 + 右键菜单） | — | 🟡 | HEAD(当前)/本地/远程三分组可折叠（`branch-panel.ts` createGroup/createCollapsibleGroup），本地支持文件夹子分组；**Tags 分组不存在**（`branches.ts` listBranches 用 `git branch -a` 不含标签）；分组标题右键菜单（Expand All/Collapse All/Sort）无 |
| §2.4 | 分支项视觉（✓ 当前/灰色远程/★收藏/↑↓ 指示） | — | 🟡 | 当前分支加粗+底色、收藏 ★、↑N 绿色/↓N 蓝色指示均实现（`branch-panel.ts` createBranchItem + `branches.ts` getUnpushed/UnpulledBranches）；无 ✓ 图标与远程专用图标（统一 branchIcon） |
| §2.5 | 分支项交互（单击/双击/右键/悬停） | — | 🟡 | 单击选中并加载该分支提交（onBranchSelect）、右键菜单 ✓；悬停高亮未实现、双击为浏览器默认（等同单击）、无拖拽 |
| §4.4 | 文件列表交互（单击/双击/右键/箭头/Enter/Delete） | — | 🟡 | 单击选中+右侧差异预览 ✓；双击打开文件、上下箭头、Enter、Delete 还原均无；右键菜单为桩（§4.3） |
| §5.2 | 提交详情交互（点击跳转/邮箱/复制） | — | ❌ | 全部缺失：文件路径/分支/哈希点击跳转、mailto、Ctrl+C 均无（`commit-detail.ts` 纯静态渲染） |
| §8.1 | 新建分支对话框（基于分支下拉 + 切换到新分支） | — | 🟡 | `dialogs.ts` showCreateBranchDialog 仅名称输入；缺「基于分支」选择（固定当前 HEAD）与「切换到新分支」勾选 |
| §8.2 | 重命名分支对话框 | — | ✅ | `dialogs.ts` showRenameDialog |
| §8.3 | 日期过滤对话框 | — | ✅ | `dialogs.ts` showDateRangeDialog（确定/清除/取消 + Escape）；showDateFilterDialog 同存 |
| §8.4 | 确认删除对话框 | — | 🟡 | 变体实现：对齐 IDEA，直删不弹确认，仅服务端返回 NOT_MERGED 时弹强制删除框（`dialogs.ts` showDeleteBranchDialog）；无通用「确定要删除吗」确认 |
| §8.5 | Git Reset 对话框（Soft/Mixed/Hard） | — | ✅ | `context-menu.ts` showResetDialog 与 `dialogs.ts` showResetDialog |
| §9.1 | AppState 字段 | — | 🟡 | `state.ts` PanelState 覆盖分支/提交/过滤/差异/详情/排序/列开关/正则/大小写；缺 isRebasing/isMerging、Show/Highlight 各字段；filterPath→filterPaths（多选）、regexMode→searchRegex 命名差异 |
| §9.2 | 状态转换流程 | — | ✅ | `main.ts` loadData → 分支选中 loadCommitsForBranch → 提交选中 loadCommitDetail → 文件单击 renderPreview |
| §7.2 | 拖拽（分支拖拽 merge/rebase、文件拖拽 cherry-pick） | — | ❌ | 无任何 drag 事件监听 |
| §7.3 | 实时更新（文件系统监听/操作后自动刷新/计数更新/Log 索引） | — | 🟡 | Git 操作后部分自动刷新（签出/合并/拉取/删除后 loadData 或 refreshCommits）；**无文件系统 watcher**，无 Git Log 索引；其余操作需手动刷新 |

### §10 实现优先级汇总映射（附加，不计入 144 条统计）

| §10 条目 | 优先级 | 状态 | 说明 |
|----------|--------|------|------|
| 1. 五区域布局 (A/B/C/D/E) | P0 | 🟡 | 见 §1 速览：三栏 + 底部 Tab 已有，区域位置与顶部工具栏与 spec 有出入 |
| 2. 分支列表（分组、搜索、选中、收藏） | P0 | 🟡 | 分组/搜索/选中/收藏齐，缺 Tags 分组 |
| 3. 提交历史列表（搜索、过滤、选中） | P0 | ✅ | 搜索/正则/大小写/四类过滤/多选齐备 |
| 4. 文件差异列表 | P0 | 🟡 | 列表+预览可用，状态标签恒 M |
| 5. 提交详情 | P0 | 🟡 | 见 §5.1 |
| 6. 右键上下文菜单（分支/提交/文件） | P0 | 🟡 | 分支/提交可用；文件菜单全为桩 |
| 7. 工具栏按钮 | P0 | 🟡 | 侧栏 12 键 + 提交工具栏可用；分支面板工具栏缺失（无删除/Fetch/比较等） |
| 8. 基础 Git 操作（checkout/merge/rebase/delete/create） | P0 | 🟡 | 五操作均通；create 基点固定 HEAD（选中分支/提交基点未生效） |
| 9. 快捷键（Ctrl+F5/Ctrl+F/Ctrl+C/Enter/Esc） | P0 | 🟡 | 仅 Enter/Esc 部分可用，3 个 P0 快捷键全缺 |
| 1. 提交图线 | P1 | 🟡 | 组件已写未接线 |
| 2. 未推送/未拉取指示器 | P1 | ✅ | 分支级 ↑N/↓N 已实现（提交级 incoming/outgoing 箭头未做） |
| 3. 收藏功能 | P1 | ✅ | 见 §2.1 |
| 4. 日期/用户/路径过滤 | P1 | ✅ | 见 §3.1 |
| 5. 文件差异预览 | P1 | ✅ | 单击即预览 |
| 6. Cherry-pick | P1 | ✅ | 单条+批量（冲突处理缺） |
| 7. Pull/Push | P1 | ✅ | 见 §2.6 |
| 8. Stash | P1 | 🟡 | `/git-stash-now` + `service.ts` stash 已备、签出前自动 stash（`service.ts:86`）；**无 Stash 按钮/面板** |
| 9. 显示设置（Compact References、Tag Names 等） | P1 | 🟡 | 仅列开关三件套 |
| 10. 图选项（排序、简化） | P1 | ❌ | 见 §3.2 |
| 11. Reset 对话框（Soft/Mixed/Hard） | P1 | ✅ | 见 §3.6 |
| 12. 分支比较 | P1 | 🟡 | 端点+封装就绪，无 UI 入口 |
| 1. 工作树管理 | P2 | ❌ | — |
| 2. 补丁创建 | P2 | ❌ | — |
| 3. 交互式变基 | P2 | ❌ | — |
| 4. 拖拽操作 | P2 | ❌ | — |
| 5. 实时文件系统监控 | P2 | ❌ | — |
| 6. Git Log 索引 | P2 | ❌ | — |
| 7. 多仓库支持 | P2 | ❌ | 单 directory 设计 |
| 8. GPG 签名显示 | P2 | ❌ | — |
| 9. GitHub Checks 显示 | P2 | ❌ | — |
| 10. Issue 链接跳转 | P2 | ❌ | — |

---

## 关键缺口（按优先级排序）

### 任务指定核实项（已全部实查确认）

1. **工具栏批量删除分支（spec §2 P0）未实现** — 确认：分支面板无工具栏，侧栏 12 键（`sidebar.ts` ITEMS）无删除键，分支面板无多选；删除仅存在于右键单分支路径。
2. **删除通知「查看提交 / View Commits」动作（未合并提交查看）未实现** — 确认：`notify.ts` 动作仅 `restore`（还原）与 `deleteTracking`（删除跟踪的分支）两种，无「查看提交」。
3. **远程分支删除后的通知无动作（仅正文）** — 确认：`context-menu.ts` onBranchDeleted 仅在 `res.kind === 'local'` 时传 onRestore，远程删除时通知卡片只有正文，无任何动作链接。

### P0 未实现（16 项 ❌）

| 位置 | 缺口 |
|------|------|
| §2.1 | 工具栏批量删除分支（上文第 1 条） |
| §2.6 | **New Branch From \<selected_branch\>：从选定分支创建新分支——右键菜单无此项**（实查新发现） |
| §3.3 | My Commits 我的提交加粗；Current Branch 当前分支蓝色背景 |
| §4.3 | 文件右键 Show Diff 菜单项为日志桩（菜单整体 11 项皆桩） |
| §5.1 | 所属分支（含 Show All） |
| §6.2 | 底部状态信息 5 项全缺：+ 新增数、✓ 修改数、仓库名、当前分支、仓库路径（`createTabBar` 只画标签） |
| §7.1 | Alt+9、Ctrl+F5、Ctrl+F、Ctrl+L、Ctrl+C 五个 P0 快捷键全缺 |

### P0 部分实现（12 项 🟡，重点）

- §2.1 新建分支：不支持「基于选中分支」，固定当前 HEAD（且 §8.1 对话框缺基线选择）。
- §3.6 从提交创建分支：展示「基于 \<commit\>」但实际 `git checkout -b` 从当前 HEAD 创建；`core createBranch` 已支持 startPoint、`/git-create-branch` 未透传（**功能语义偏差，易误导**）。
- §4.1 状态标签：`getStatusLabel` 按路径特征猜测，正常路径恒 M，A/D/R 不可达。
- §4.2 无文件列表工具栏（单击预览兜底）。
- §5.1 哈希/邮箱/消息可点击跳转与变更摘要块缺失（数据已渲染）。
- §7.1 Enter/Esc 仅部分对话框生效。

### P1 主要未实现（34 项 ❌ 中的高频项）

- **§4.3 文件右键菜单整体为骨架**：Show Diff in New Window、Compare with Local/Before Local、Edit Source、Open Repository Version、Revert、Cherry-Pick Selected Changes、Get from Revision、History Up to Here 全为 `console.log` 桩（另 3 项菜单项缺失）。
- **§3.3 显示设置 Show/Highlight 全缺 5 项**（Compact References、Tag Names、Commit Timestamp、References on the Left、Merge Commits 灰显）。
- **§3.6 提交菜单 7 项**：Checkout Revision、Edit Commit Message、Rebase onto Selected Commit、Branch 子菜单、Go to Parent/Child、New Tag（桩）。
- **§7.1 快捷键 6 个 P1 全缺**：F4、Ctrl+D、Ctrl+Z、Ctrl+Shift+Z、Delete、Left/Right。
- §2.1 更新选中（按选中分支 Fetch）、显示我的分支；§2.6 Checkout and Rebase、Show Diff with Working Tree；§4.2 还原所选更改、文件历史；§3.2 By commit date（🟡）；§6.1 Console（🟡）。
- **P1 链路备好但缺 UI 入口**（🟡，接入成本低）：Undo Commit（`/git-undo-commit` + `service.ts` undoCommit）、Fetch（`/git-fetch` + `service.ts` fetch）、分支比较（`/git-branch-diff` + `service.ts` getBranchDiff）、Stash（`/git-stash-now` + `service.ts` stash）。

### P2（38 项中 35 ❌）

图选项 5 项、提交菜单补丁/交互变基等 10 项、文件菜单 4 项、GPG/GitHub Checks、折叠全部、定位 HEAD、Console 之外的工作树等。共性：多为「无入口无实现」，且 spec §11 所列「补丁创建/交互式变基/工作树/多仓库」等均未启动。例外：提交图线组件（`commit-graph.ts`）已实现且有测试，属「有实现未接线」。

### spec 自身与现状的出入（spec §11 差距表已过时）

- §11 称「Reset 对话框：无」→ 实际已实现（两处）。
- §11 称「文件差异预览：仅日志输出」→ 实际有常驻预览面板。
- §11 称「分支比较：无」→ 实际端点与客户端封装已备（缺 UI 入口）。
- §11 称「快捷键：无」→ 实际 Enter/Esc 部分可用（其余确实缺）。

---

## 建议的下一步（按优先级）

1. **补齐 P0 快捷键与底部状态信息**：panel 级全局 keydown 注册 Alt+9 / Ctrl+F5 / Ctrl+F / Ctrl+L / Ctrl+C（复用现有 refreshCommits/focusSearchInput）；`createTabBar` 渲染 `+ N ✓ N 仓库名 当前分支 仓库路径`——`/git-status` 端点与 `service.getStatus` 已备，只需在 loadData 中加载 `state.gitStatus` 并接线（一次改动同时关掉 6 个 P0 缺口）。
2. **分支面板批量删除 + New Branch From selected**：分支面板引入多选（可复用 commit-list 的 Ctrl/Shift 模式），补工具栏删除键（批量循环调 `service.deleteBranch`，复用现有通知/还原链路）；右键菜单加「从选定分支新建」，`/git-create-branch` 透传 startPoint、`showCreateBranchDialog` 增「基于分支」下拉与「切换到新分支」勾选（同时修复 §3.6 从提交创建分支基点错误——端点已就绪只差传参）。
3. **文件右键菜单去桩接真实现**：优先接高频 3 项——Show Diff（复用 renderPreview）、Revert Selected Changes（core `staging.discard` 新增端点）、History Up to Here（core `getFileHistory` + `/git-log` path 参数已可支撑）；Edit Source/Open Repository Version 视宿主能力决定，剩余桩项删除或标注。
4. **详情面板补全 P0 交互**：`commit-detail.ts` 增加所属分支（复用 commit-list 的 branchMap）、Changes 统计块（`/git-show` 已返回 --stat 数据），哈希/分支点击走 gotoReference/分支过滤，邮箱 mailto。
5. **通知动作补全**：`notify.ts` 增加「查看提交 / View Commits」动作（本地分支定位 `res.tip`、远程分支定位 `tip`，接 gotoReference 定位逻辑），远程删除通知同样挂载，兑现删除通知的完整 IDEA 对齐。
6. **显示设置扩展与提交图线接线**：`settings-menu.ts` 增 Show 组（Compact References/Tag Names/Commit Timestamp/References on the Left）与 Highlight 组（My Commits/Merge/Current Branch，需补充提交者身份与合并判定）；`commit-list.ts` 接入 `commit-graph.ts` 的 calculateGraphRows/generateRowGraphSVG（parents 数据已在 CommitInfo）。
7. **已备端点接 UI**：Undo Commit 菜单项、Fetch 按钮、分支比较入口、Stash 按钮（§10 P1 的 4 个「链路备好缺入口」项，均只差一个按钮/菜单项接线）；Pull 菜单拆出 Using Rebase / Using Merge（端点加参数）。
