# IntelliJ Git 面板功能对比

> 对比 IntelliJ Community 源码分析结果与当前实现

---

## 1. 分支面板交互对比

### 1.1 单击分支

| 行为 | IntelliJ | 我们 | 差异 |
|------|----------|------|------|
| 默认行为 | **过滤日志** (Filter模式) 或 **导航到分支** (Navigate模式)，两种模式通过工具栏切换 | 加载该分支的提交列表 | ⚠️ 功能等价，但缺少模式切换 |
| 选中高亮 | 蓝色背景 | 蓝色背景 | ✅ 一致 |
| 提交列表响应 | 调用 `filterBy()` 过滤 VCS Log | 调用 `loadCommits(branch)` | ✅ 一致 |

### 1.2 双击分支

| 行为 | IntelliJ | 我们 | 差异 |
|------|----------|------|------|
| 双击 | 无特殊处理，等同于单击 | 与单击相同行为 | ✅ 一致 |

### 1.3 右键菜单

| IntelliJ 菜单项 | 我们 | 状态 |
|-----------------|------|------|
| Checkout | 签出 (Checkout) | ✅ |
| New Branch From... | 新建分支 (从当前分支) | ✅ |
| Rename | 重命名 | ✅ |
| Delete | 删除 | ✅ |
| Merge into current | 合并到当前分支 | ✅ |
| Rebase current onto selected | 变基到当前分支 | ✅ |
| Compare with current | 与当前分支比较 | ❌ 未实现 |
| Show Diff with Working Tree | 与工作树比较 | ❌ 未实现 |
| Checkout and Rebase onto current | 切换并变基 | ❌ 未实现 |
| Pull into current using rebase | 拉取并变基 | ❌ 未实现 |
| Pull into current using merge | 拉取并合并 | ❌ 未实现 |
| Update | 从远程拉取 | ❌ 未实现 |
| Push | 推送到远程 | ❌ 未实现 |
| Toggle Favorite | 收藏/取消 | ❌ 未实现 |
| Hide Branches | 隐藏分支面板 | ❌ 未实现 |
| New Worktree | 从选定分支创建工作树 | ❌ 未实现 |

### 1.4 搜索框

| 行为 | IntelliJ | 我们 | 差异 |
|------|----------|------|------|
| 防抖 | `debounce(FILTER_DEBOUNCE_MS)` | 无防抖，实时过滤 | ⚠️ 需添加防抖 |
| 多词匹配 | 按空格分割，每个词独立匹配 | 简单 includes 匹配 | ⚠️ 需改进 |
| 模糊匹配 | `FixingLayoutMatcher` 支持键盘布局转换 | 精确匹配 | ⚠️ 需改进 |
| 分组节点跳过 | Group 节点不参与匹配 | 无分组跳过逻辑 | ⚠️ 需改进 |

### 1.5 分支分组

| 分组 | IntelliJ | 我们 | 状态 |
|------|----------|------|------|
| HEAD | 始终显示，标记当前分支 | HEAD 分组，✓ 标记 | ✅ |
| 本地分支 | 按仓库分组（多仓库时） | 本地分组 | ✅ |
| 远程分支 | 按远程名称分组 | 远程分组 | ✅ |
| 标签 | 独立分组 | 标签分组（占位） | ⚠️ 仅占位 |
| 多仓库 | 按仓库根目录分组 | 不支持 | ❌ 未实现 |

### 1.6 分支图标

| IntelliJ | 我们 | 差异 |
|----------|------|------|
| `GitBranchesTreeIconProvider.forRef()` 根据 isCurrent/isFavorite/selected 提供不同图标 | 无图标，使用文本 ✓ 标记 | ⚠️ 需添加图标 |
| Incoming/Outgoing 标签 | 无 | ❌ 未实现 |
| 收藏标记 | 无 | ❌ 未实现 |

### 1.7 工具栏

| IntelliJ 按钮 | 我们 | 状态 |
|--------------|------|------|
| Hide Branches (隐藏分支面板) | 无 | ❌ |
| + New Branch | + 新建分支 | ✅ |
| Delete Branch | 🗑 删除分支 | ✅ |
| Checkout | → Checkout | ✅ |
| Fetch/Update | 无 | ❌ |
| Search | 搜索框 | ✅ |
| Toggle Favorite | 无 | ❌ |
| Expand All | 无 | ❌ |
| Settings | 无 | ❌ |
| Copy Branch Name | 无 | ❌ |

---

## 2. 提交列表对比

### 2.1 提交列表项

| IntelliJ | 我们 | 状态 |
|----------|------|------|
| 作者名称 | 作者名称 | ✅ |
| 相对时间 | 相对时间 | ✅ |
| 提交消息 | 提交消息 | ✅ |
| 分支标签 | 分支标签 | ⚠️ 仅显示 HEAD |
| 提交图线 (graph) | 无 | ❌ 极难实现 |
| GPG 签名标记 | 无 | ❌ |
| GitHub 检查标记 | 无 | ❌ |

### 2.2 搜索工具栏

| IntelliJ | 我们 | 状态 |
|----------|------|------|
| 搜索框 | 搜索框 | ✅ |
| .* 正则按钮 | .* 按钮 | ✅ (未实现功能) |
| Cc 大小写按钮 | Cc 按钮 | ✅ (未实现功能) |
| 分支过滤下拉 | 无 | ❌ |
| 用户过滤下拉 | 无 | ❌ |
| 日期过滤下拉 | 无 | ❌ |
| 路径过滤下拉 | 无 | ❌ |
| 刷新按钮 | 刷新按钮 | ✅ |
| 设置按钮 | 设置按钮 | ✅ (无功能) |

---

## 3. 底部面板对比

| IntelliJ | 我们 | 状态 |
|----------|------|------|
| Git 标签页 | Git 标签页 | ✅ |
| Console 标签页 | 控制台标签页 | ✅ |
| Worktrees 标签页 | Worktrees 标签页 | ✅ |
| 仓库信息行 | 仓库信息行 | ✅ |

---

## 4. 总结

### 已完全一致 (✅)
- 分支列表显示（HEAD/本地/远程分组）
- 当前分支标记 (✓)
- 单击分支过滤提交
- 右键菜单（Checkout/删除/合并/变基/重命名）
- 分支搜索框
- 提交列表（作者/时间/消息）
- 底部面板布局
- 深色主题

### 功能等价但实现不同 (⚠️)
- 搜索框：缺少防抖、多词匹配、模糊匹配
- 分支图标：使用文本代替图标
- 新建分支对话框：功能完整但 UI 不同
- 右键菜单：缺少部分高级操作

### 未实现 (❌)
- Compare with current（分支比较）
- Show Diff with Working Tree
- Pull/Push 操作
- 收藏分支
- Incoming/Outgoing 指示器
- 提交图 (graph visualization)
- 过滤器下拉菜单（分支/用户/日期/路径）
- 多仓库支持
- 标签完整管理
- 工作树管理
- 交互式变基
- 三向合并工具
- Blame 注解
