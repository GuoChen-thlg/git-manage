# Git 管理面板 - 对照 IntelliJ 的功能与交互规范

> 基于 IntelliJ IDEA 2026.2 Git Log Tab 官方文档 + 源码分析
> 目标：以 IntelliJ 的 Git 面板为参照，对齐其功能和交互行为

---

## 1. 整体布局结构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 工具栏 (顶部)                                                                    │
│ [Branch▼] [Fetch] [Pull] [Push] [Stash] [Cherry-pick] [Rebase] [Merge] [Reset] │
├───────────┬─────────────────────────────────────────────────────────────────────┤
│ A.分支面板 │ B.提交历史区域                                                      │
│ (左侧)    │ [搜索] [.*] [Cc] | [分支▼] [用户▼] [日期▼] [路径▼] | [图] [刷新] [cherry] [显示] │
│           │─────────────────────────────────────────────────────────────────────│
│ [搜索框]  │ 提交列表 (带图线)                                                    │
│           │                                                                     │
│ HEAD      │                                                                     │
│ ▼ Local   ├──────────────────────────┬──────────────────────────────────────────┤
│   dev     │ C.变更文件               │ D.提交详情                               │
│           │                          │                                          │
│ ▼ Remote  │                          │                                          │
│   origin  │                          │                                          │
│           │                          │                                          │
│ ▼ Tags    │                          │                                          │
│   v1.0    │                          │                                          │
├───────────┴──────────────────────────┴──────────────────────────────────────────┤
│ E.底部状态栏: [Git] [Console] [Worktrees]  +分支名 状态 仓库路径                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. A区域 - 分支面板 (左侧)

### 2.1 工具栏 (顶部水平)

| 图标 | 功能 | 描述 | 优先级 |
|------|------|------|--------|
| ← | 隐藏分支面板 | 收起左侧面板 | P2 |
| + | 新建分支 | 基于选中分支创建新分支 | P0 |
| ↓ | 更新选中 | 从选中分支 Fetch | P1 |
| 🗑 | 删除分支 | 删除选中分支 (支持批量) | P0 |
| ⇄ | 与当前比较 | 比较选中分支与当前分支 | P1 |
| 🔍 | 显示我的分支 | 仅显示我创建的分支 | P1 |
| ↗ | Fetch 所有远程 | 从所有远程拉取 | P1 |
| ★ | 收藏/取消收藏 | 标记为收藏分支 | P1 |
| ◎ | 定位到分支 HEAD | 跳转到选中分支的 HEAD | P2 |
| ⚙ | 面板设置 | 单击行为、分组、显示标签 | P2 |
| ⊕ | 展开全部 | 展开所有分组 | P2 |
| ⊖ | 折叠全部 | 折叠所有分组 | P2 |

### 2.2 搜索框

| 属性 | 值 |
|------|-----|
| 位置 | 工具栏下方，全宽 |
| 占位文本 | "Branch or tag" |
| 图标 | 左侧搜索图标 |
| 右侧 | X 清空按钮 (有内容时显示) |
| 快捷键 | Esc 清空并收起 |

**交互流程:**
1. 输入 → 实时过滤分支列表 (防抖 150ms)
2. 按 Esc → 清空输入框，恢复完整列表
3. 点击 X → 清空输入框
4. 焦点在输入框时，键盘上下箭头选择分支

### 2.3 分支分组 (折叠/展开)

| 分组 | 图标 | 默认状态 | 说明 |
|------|------|----------|------|
| HEAD | ✓ | 展开 | 当前检出的分支，始终第一个 |
| Local Branches | ▼ | 展开 | 本地分支 |
| Remote Branches | ▼ | 展开 | 远程分支 (origin/ 等) |
| Tags | ▼ | 折叠 | Git 标签 |

**分组标题交互:**
- 点击分组标题 → 折叠/展开该组
- 右键分组标题 → 菜单: Expand All / Collapse All / Sort Alphabetically

### 2.4 分支项视觉规范

```
当前分支:  ✓ dev           (✓图标 + 蓝色高亮背景 + 粗体)
普通分支:    feature/login (普通字体，悬停灰色背景)
远程分支:    origin/main   (灰色字体 + 远程图标)
标签:        v1.0.0        (标签图标 + 灰色)
收藏分支:    ★ dev         (星标图标)
```

**状态指示器:**
| 指标 | 显示 | 说明 |
|------|------|------|
| 未推送提交 | ↑3 (绿色) | 本地有3个提交未推送 |
| 未拉取提交 | ↓2 (蓝色) | 远程有2个提交未拉取 |

### 2.5 分支项交互

| 操作 | 行为 |
|------|------|
| 单击 | 选中分支，加载该分支的提交历史 (可配置为 Update Branch Filter 或 Navigate Log to Branch Head) |
| 双击 | 等同于单击 |
| 右键 | 显示上下文菜单 |
| 悬停 | 背景变灰 |
| 拖拽 | 无 |

### 2.6 右键上下文菜单

| 菜单项 | 功能 | 快捷键 | 优先级 |
|--------|------|--------|--------|
| Checkout | 切换到此分支 | - | P0 |
| New Branch From <selected_branch> | 从选定分支创建新分支 | - | P0 |
| Checkout and Rebase onto <current_branch> | 切换并变基到当前分支 | - | P1 |
| Compare with <current_branch> | 与当前分支比较 | - | P1 |
| Show Diff with Working Tree | 与工作树比较 | - | P1 |
| Rebase <current_branch> onto <selected_branch> | 将当前变基到选定分支 | - | P1 |
| Merge <selected_branch> into <current_branch> | 合并到当前分支 | - | P0 |
| New Worktree from <selected_branch> | 从选定分支创建工作树 | - | P2 |
| Pull into <current_branch> Using Rebase | 拉取并变基 | - | P1 |
| Pull into <current_branch> Using Merge | 拉取并合并 | - | P1 |
| Update | 从远程拉取 | - | P1 |
| Push | 推送到远程 | - | P1 |
| Rename | 重命名分支 | - | P1 |
| Delete | 删除分支 (支持批量) | - | P0 |

---

## 3. B区域 - 提交历史区域 (右侧上方)

### 3.1 搜索工具栏

**元素布局:**
```
[🔍 搜索框] [.* 正则] [Cc 大小写] | [分支▼] [用户▼] [日期▼] [路径▼] | [图选项] [刷新] [Cherry-pick] [显示设置] [🔍跳转]
```

| 元素 | 功能 | 快捷键 | 优先级 |
|------|------|--------|--------|
| 搜索框 | 输入哈希/消息/作者搜索 | Ctrl+L 聚焦 | P0 |
| .* 按钮 | 切换正则表达式模式 (toggle) | - | P1 |
| Cc 按钮 | 大小写敏感切换 (toggle) | - | P1 |
| 分支下拉 | All / 本地分支 / 远程分支 / 收藏分支 | - | P0 |
| 用户下拉 | All / 具体用户列表 | - | P1 |
| 日期下拉 | All / Today / This Week / This Month / This Year / 自定义 | - | P1 |
| 路径下拉 | 全部 / 已选路径(逐条移除) / 选择文件夹…(多选树,≤100) / 编辑路径…(多行) | - | P1 |
| 图选项按钮 | 排序/简化/折叠选项 | - | P2 |
| 刷新按钮 | 刷新提交列表 | Ctrl+F5 | P0 |
| Cherry-pick 按钮 | 应用选中提交到当前分支 | - | P1 |
| 显示设置按钮 | 配置显示选项 | - | P1 |
| 跳转按钮 | 跳转到哈希/分支/标签 | Ctrl+F | P1 |

### 3.2 图选项菜单

| 选项 | 功能 | 优先级 |
|------|------|--------|
| By commit date | 按提交日期排序 (默认) | P1 |
| Topologically | 按拓扑排序 | P2 |
| Show First Parent | 仅显示第一个父提交 | P2 |
| No Merges | 过滤掉合并提交 | P2 |
| Collapse Linear Branches | 折叠线性分支 (显示虚线) | P2 |
| Expand Linear Branches | 展开线性分支 | P2 |

### 3.3 显示设置菜单

**Show 选项:**
| 选项 | 功能 | 默认 | 优先级 |
|------|------|------|--------|
| Compact References View | 紧凑显示分支引用 | 启用 | P1 |
| Tag Names | 显示标签名称 (不仅是图标) | 启用 | P1 |
| Long Edges | 显示长分支完整路径 | 禁用 | P2 |
| Commit Timestamp | 显示提交时间而非作者时间 | 禁用 | P1 |
| References on the Left | 分支引用显示在提交消息左侧 | 禁用 | P1 |
| Show Root Names | 显示仓库根名称 (多仓库) | 禁用 | P2 |

**Columns 选项:**
| 列 | 功能 | 默认 | 优先级 |
|----|------|------|--------|
| Author | 显示作者 | 启用 | P0 |
| Date | 显示日期 | 启用 | P0 |
| Hash | 显示提交哈希 | 启用 | P0 |
| GPG Signature | 显示 GPG 签名 | 禁用 | P2 |
| GitHub Checks | 显示 GitHub 检查状态 | 禁用 | P2 |

**Highlight 选项:**
| 选项 | 功能 | 默认 | 优先级 |
|------|------|------|--------|
| My Commits | 我的提交加粗 | 启用 | P0 |
| Merge Commits | 合并提交灰色 | 启用 | P1 |
| Current Branch | 当前分支蓝色背景 | 启用 | P0 |
| Not Cherry-Picked Commits | 未 cherry-pick 的提交灰色 | 禁用 | P2 |

### 3.4 提交列表项

**单条提交显示:**
```
[图线] [作者] [时间] | [提交消息]                    [分支标签]
```

**示例:**
```
● ─ ─ ─ ─ ─ 天火流光  20分钟之前 | feat: 初始化 Git 管理工具项目    🔖dev
│
○ ─ ─ ─ ─ ─ 天火流光  1小时前   | fix: 修复分支显示问题            🔖main
│
● ─ ─ ─ ─ ─ 天火流光  2小时前   | chore: 更新依赖
```

| 元素 | 说明 | 优先级 |
|------|------|--------|
| 提交图线 | 可视化分支合并图 (点+线) | P1 |
| 作者名称 | 提交者显示 | P0 |
| 时间戳 | 相对时间 (刚刚/X分钟前/X小时前/X天前/具体日期) | P0 |
| 分隔符 | \| | P0 |
| 提交消息 | commit message (单行显示，超长截断) | P0 |
| 分支标签 | 所在分支标记 (可多个，紧凑/展开显示) | P0 |

**视觉规范:**
| 状态 | 样式 |
|------|------|
| 当前分支提交 | 蓝色背景 |
| 我的提交 | 粗体 |
| 合并提交 | 灰色 |
| 传入提交 | 绿色箭头 ↑ |
| 传出提交 | 蓝色箭头 ↓ |
| 选中提交 | 深色高亮背景 |
| 悬停 | 浅灰色背景 |
| 作者≠提交者 | 星号标记 * |

### 3.5 提交列表交互

| 操作 | 行为 |
|------|------|
| 单击 | 选中提交，下方显示该提交的文件变更和详情 |
| 双击 | 打开提交详情对话框 |
| 右键 | 显示上下文菜单 |
| 上下箭头 | 在列表中移动选中项 |
| Enter | 等同于单击 |
| Left/Right 箭头 | 跳转到父/子提交 |
| Ctrl+F | 聚焦搜索框 |
| Ctrl+A | 选中所有提交 (显示所有修改文件) |

### 3.6 提交列表右键菜单

| 菜单项 | 功能 | 快捷键 | 优先级 |
|--------|------|--------|--------|
| Copy Revision Number | 复制提交哈希 | Ctrl+C | P0 |
| Create Patch | 创建补丁 | - | P2 |
| Cherry-pick | 应用到当前分支 | - | P1 |
| Checkout Revision | 检出此提交状态 | - | P1 |
| Show Repository at Revision | 在项目视图中打开此修订的快照 | - | P2 |
| Compare with Local | 与本地比较 | - | P1 |
| Reset Current Branch to Here | 重置当前分支到此 (Soft/Mixed/Hard) | - | P1 |
| Revert Commit | 回滚提交 (创建新提交) | - | P1 |
| Undo Commit | 撤销提交 (仅限未推送) | - | P1 |
| Edit Commit Message | 编辑提交信息 (仅限未推送) | - | P1 |
| Fixup | 添加到选定提交 (保留原消息) | - | P2 |
| Squash Into | 合并到选定提交 (合并消息) | - | P2 |
| Drop Commits | 丢弃提交 (不留痕迹) | - | P2 |
| Squash Commits | 合并多个提交 | - | P2 |
| Interactively Rebase from Here | 交互式变基 | - | P2 |
| Push All up to Here | 推送到此为止的所有提交 | - | P2 |
| Add Commits to Remote Branch | Cherry-pick 到远程分支 | - | P2 |
| Rebase <current_branch> onto Selected Commit | 变基到选中提交 | - | P1 |
| Branch <branch_name> / Branches | 分支操作子菜单 | - | P1 |
| New Branch | 从提交创建分支 | - | P0 |
| New Tag | 从提交创建标签 | - | P1 |
| Go to Child Commit | 导航到子提交 | Right | P1 |
| Go to Parent Commit | 导航到父提交 | Left | P1 |
| View in Browser | 在浏览器查看 | - | P2 |

---

## 4. C区域 - 变更文件 (右侧下方左侧)

### 4.1 文件列表

**无提交选中时:**
```
选择要查看更改的提交
```

**有提交选中时:**
```
▼ src/
  main.ts          M
  utils.ts         A
README.md          D
```

| 元素 | 说明 | 优先级 |
|------|------|--------|
| 文件名 | 相对路径 (从仓库根目录) | P0 |
| 状态标签 | M=修改, A=新增, D=删除, R=重命名 | P0 |
| 文件图标 | 按文件类型显示图标 | P1 |

**状态颜色:**
| 状态 | 颜色 | 说明 |
|------|------|------|
| A (Added) | 绿色 | 新增文件 |
| M (Modified) | 橙色 | 修改文件 |
| D (Deleted) | 红色 | 删除文件 |
| R (Renamed) | 蓝色 | 重命名文件 |

### 4.2 文件列表工具栏

| 图标 | 功能 | 快捷键 | 优先级 |
|------|------|--------|--------|
| ⇄ | 显示差异 (选中文件) | Ctrl+D | P0 |
| ↩ | 还原所选更改 | - | P1 |
| 📁 | 文件历史 | - | P1 |
| 👁 | 视图选项 (分组/显示详情/差异预览) | - | P2 |
| ⊕ | 展开全部 | Ctrl+NumPad + | P2 |
| ⊖ | 折叠全部 | Ctrl+NumPad - | P2 |

**视图选项菜单:**
| 选项 | 功能 | 优先级 |
|------|------|--------|
| Group By Directory | 按目录分组 | P2 |
| Group By Module | 按模块分组 | P2 |
| Show Details | 显示提交详情面板 | P1 |
| Show Diff Preview | 显示差异预览面板 | P1 |

### 4.3 文件右键菜单

| 菜单项 | 功能 | 快捷键 | 优先级 |
|--------|------|--------|--------|
| Show Diff | 显示差异 | Ctrl+D | P0 |
| Show Diff in a New Window | 在新窗口显示差异 | - | P1 |
| Compare with Local | 与本地比较 | - | P1 |
| Compare Before with Local | 与提交前的本地比较 | - | P1 |
| Edit Source | 编辑源码 | F4 | P1 |
| Open Repository Version | 打开仓库版本 | - | P1 |
| Revert Selected Changes | 还原更改 | - | P1 |
| Cherry-Pick Selected Changes | 应用选定更改 | - | P1 |
| Extract Selected Changes to Separate Commit | 提取为独立提交 | - | P2 |
| Drop Selected Changes | 丢弃选定更改 | - | P2 |
| Create Patch | 创建补丁 | - | P2 |
| Get from Revision | 从修订获取 | - | P1 |
| History Up to Here | 查看文件历史 | - | P1 |
| Show Changes to Parents | 显示对父提交的更改 (合并提交) | - | P2 |

### 4.4 文件列表交互

| 操作 | 行为 |
|------|------|
| 单击 | 选中文件，右侧显示差异预览 (如果开启) |
| 双击 | 打开文件并显示差异 |
| 右键 | 显示上下文菜单 |
| 上下箭头 | 在列表中移动选中项 |
| Enter | 等同于单击 |
| Delete | 还原选中文件的更改 |

---

## 5. D区域 - 提交详情 (右侧下方右侧)

### 5.1 显示内容

**无提交选中时:**
```
提交详细信息
```

**有提交选中时:**
```
提交: abc1234567890
作者: 天火流光 <email@example.com>
日期: 2026-09-20 13:00:00
分支: dev

feat: 初始化 Git 管理工具项目

Changes:
  +100 -0 src/main.ts
  +50 -0 package.json
```

| 元素 | 说明 | 优先级 |
|------|------|--------|
| 提交哈希 | 完整 SHA-1 哈希 (可点击跳转) | P0 |
| 作者信息 | 名称 + 邮箱 (邮箱可点击) | P0 |
| 提交日期 | 完整日期时间 | P0 |
| 所属分支 | 分支名称 (超过6个显示 Show All) | P0 |
| 提交消息 | 完整消息 (支持多行，引用可点击) | P0 |
| 变更摘要 | 文件变更统计 | P0 |

### 5.2 交互

| 操作 | 行为 |
|------|------|
| 点击文件路径 | 跳转到该文件的差异视图 |
| 点击分支名 | 跳转到该分支 |
| 点击提交哈希 | 跳转到该提交 |
| 点击邮箱 | 打开邮件客户端 |
| 复制哈希 | Ctrl+C 复制提交哈希 |

---

## 6. E区域 - 底部状态栏

### 6.1 标签页

| 标签 | 功能 | 优先级 |
|------|------|--------|
| Git | Git 面板 (当前) | P0 |
| Console | Git 控制台输出 | P1 |
| Worktrees | 工作树管理 | P2 |

### 6.2 状态信息

```
+ ✓ git-manage  dev  ~/workingarea/node-projects/git-manage
```

| 元素 | 说明 | 优先级 |
|------|------|--------|
| + | 新增文件数 | P0 |
| ✓ | 已修改文件数 | P0 |
| 仓库名 | git-manage | P0 |
| 当前分支 | dev | P0 |
| 仓库路径 | ~/workingarea/... | P0 |

---

## 7. 全局交互

### 7.1 快捷键

| 快捷键 | 功能 | 优先级 |
|--------|------|--------|
| Alt+9 | 打开 Git 工具窗口 | P0 |
| Ctrl+F5 | 刷新所有 | P0 |
| Ctrl+F | 聚焦搜索框 | P0 |
| Ctrl+L | 聚焦提交搜索框 | P0 |
| Ctrl+C | 复制选中项 | P0 |
| F4 | 编辑选中文件 | P1 |
| Ctrl+D | 显示差异 | P1 |
| Ctrl+Z | 撤销 | P1 |
| Ctrl+Shift+Z | 重做 | P1 |
| Delete | 还原更改 | P1 |
| Enter | 确认/打开 | P0 |
| Esc | 取消/关闭对话框 | P0 |
| Left/Right | 导航父/子提交 | P1 |
| Ctrl+NumPad +/- | 展开/折叠 | P2 |

### 7.2 拖拽

- 分支项可拖拽到其他分支 (merge/rebase)
- 文件项可拖拽到其他提交 (cherry-pick)

### 7.3 实时更新

- 文件系统变化时自动刷新
- Git 操作完成后自动刷新
- 其他分支变化时更新未推送/未拉取计数
- 支持 Git Log 索引 (提高历史查询性能)

---

## 8. 对话框

### 8.1 新建分支对话框

```
新建分支

分支名称: [_______________]
基于分支: [dev            ▼]
☐ 切换到新分支

[创建]  [取消]
```

### 8.2 重命名分支对话框

```
重命名分支

新名称: [_______________]

[重命名]  [取消]
```

### 8.3 日期过滤对话框

```
选择日期范围

开始日期: [____-__-__]
结束日期: [____-__-__]

[确定]  [清除]  [取消]
```

### 8.4 确认删除对话框

```
确认删除

确定要删除分支 "feature/old" 吗？
此操作不可恢复。

[删除]  [取消]
```

### 8.5 Git Reset 对话框

```
重置分支到 abc1234

选择重置模式:
○ Soft - 仅移动 HEAD
○ Mixed - 移动 HEAD + 重置索引 (默认)
○ Hard - 移动 HEAD + 重置索引 + 重置工作树

[重置]  [取消]
```

---

## 9. 状态管理

### 9.1 应用状态

```typescript
interface AppState {
  // 分支数据
  branches: Branch[];
  selectedBranch: Branch | null;
  favorites: Set<string>;
  branchFilter: string;
  
  // 提交数据
  allCommits: CommitInfo[];
  filteredCommits: CommitInfo[];
  selectedCommit: CommitInfo | null;
  commitSearch: string;
  logBranch: string | null;
  
  // 过滤器
  filterAuthor: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterPath: string;
  regexMode: boolean;
  caseSensitive: boolean;
  
  // 文件差异
  diffs: FileDiff[];
  
  // 提交详情
  commitDetail: CommitDetail | null;
  
  // UI 状态
  isRebasing: boolean;
  isMerging: boolean;
  
  // 显示设置
  compactReferences: boolean;
  showTagNames: boolean;
  showLongEdges: boolean;
  showCommitTimestamp: boolean;
  referencesOnLeft: boolean;
  showRootNames: boolean;
  
  // 列显示
  showAuthor: boolean;
  showDate: boolean;
  showHash: boolean;
  showGpgSignature: boolean;
  showGitHubChecks: boolean;
  
  // 高亮
  highlightMyCommits: boolean;
  highlightMergeCommits: boolean;
  highlightCurrentBranch: boolean;
  highlightNotCherryPicked: boolean;
}
```

### 9.2 状态转换

```
初始状态 → 加载分支列表 → 选择分支 → 加载提交历史
                                        ↓
                                   选中提交 → 加载文件差异 + 提交详情
                                        ↓
                                   点击文件 → 显示差异预览
```

---

## 10. 实现优先级

### P0 (必须实现)
1. 五区域布局 (A/B/C/D/E)
2. 分支列表 (分组、搜索、选中、收藏)
3. 提交历史列表 (搜索、过滤、选中)
4. 文件差异列表
5. 提交详情
6. 右键上下文菜单 (分支/提交/文件)
7. 工具栏按钮
8. 基础 Git 操作 (checkout, merge, rebase, delete, create)
9. 快捷键 (Ctrl+F5, Ctrl+F, Ctrl+C, Enter, Esc)

### P1 (应该实现)
1. 提交图线
2. 未推送/未拉取指示器
3. 收藏功能
4. 日期/用户/路径过滤
5. 文件差异预览
6. Cherry-pick
7. Pull/Push
8. Stash
9. 显示设置 (Compact References, Tag Names 等)
10. 图选项 (排序、简化)
11. Reset 对话框 (Soft/Mixed/Hard)
12. 分支比较

### P2 (可以实现)
1. 工作树管理
2. 补丁创建
3. 交互式变基
4. 拖拽操作
5. 实时文件系统监控
6. Git Log 索引
7. 多仓库支持
8. GPG 签名显示
9. GitHub Checks 显示
10. Issue 链接跳转

---

## 11. 与当前实现的差异

| 特性 | IntelliJ | 当前实现 | 差距 |
|------|----------|----------|------|
| 工具栏位置 | 顶部水平统一工具栏 | 各区域内嵌 | 布局不同 |
| 工具栏内容 | Fetch/Pull/Push/Stash 等 | 部分按钮 | 缺少 Fetch/Stash |
| 分支面板工具栏 | 顶部水平 | 无 | 缺少 |
| 分组折叠 | 可折叠/展开 | 固定展开 | 缺少折叠功能 |
| 提交图线 | 可视化分支合并图 | 无 | 缺少图线 |
| 未推送/未拉取 | ↑N ↓N 指示器 | 部分实现 | 需完善 |
| 文件差异预览 | 选中文件即时预览 | 仅日志输出 | 缺少预览 |
| 右键菜单 | 完整菜单 | 基础菜单 | 需扩展 |
| 快捷键 | 完整支持 | 无 | 缺少 |
| 拖拽 | 支持 | 无 | 缺少 |
| 实时更新 | 自动 | 手动刷新 | 需改进 |
| 显示设置 | 丰富选项 | 无 | 缺少 |
| 图选项 | 排序/简化/折叠 | 无 | 缺少 |
| Reset 对话框 | Soft/Mixed/Hard | 无 | 缺少 |
| 分支比较 | 支持 | 无 | 缺少 |
| 补丁创建 | 支持 | 无 | 缺少 |
| 交互式变基 | 支持 | 无 | 缺少 |
| 工作树 | 支持 | 无 | 缺少 |
