# Git 管理模块功能文档 (基于 IntelliJ IDEA)

> 参考项目: https://github.com/JetBrains/intellij-community
> 参考文档: https://www.jetbrains.com/help/idea/manage-branches.html
> 参考文档: https://www.jetbrains.com/help/idea/log-tab.html

---

## 1. UI 布局结构

### 1.1 VCS Widget (主窗口标题栏)

```
┌─────────────────────────────────────────────────────────────────┐
│  Project Name                                           [dev ↓2 ↑3] │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Search branches...                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Recent Branches                                         │  │
│  │  ├─ √ dev                                               │  │
│  │  ├─   feature/login                                      │  │
│  │  └─   bugfix/fix-header                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Local Branches                                          │  │
│  │  ├─ √ dev                                               │  │
│  │  ├─   feature/api                                        │  │
│  │  └─   feature/ui                                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Remote Branches                                         │  │
│  │  ├─ origin/main                                          │  │
│  │  ├─ origin/dev                                           │  │
│  │  └─ origin/feature/login                                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Tags                                                    │  │
│  │  ├─ v1.0.0                                               │  │
│  │  └─ v1.1.0                                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │  New Branch           [⚙ Settings]                       │  │
│  │  Fetch                                        [↓ Fetch]  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**关键元素:**
- 分支名称 + 状态图标 (√ 当前分支)
- 传入提交指示器 (蓝色箭头 ↓ + 数量)
- 传出提交指示器 (绿色箭头 ↑ + 数量)
- 搜索框 (实时过滤)
- 分组: Recent / Local / Remote / Tags

### 1.2 Git Tool Window - Log Tab (四栏布局)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Log] [Console] [History]                                                  │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │  [搜索] [.* Cc] [分支 ▼] [用户 ▼] [日期 ▼] [路径 ▼]    │
│  Branches        │──────────────────────────────────────────────────────────│
│  ├─ Favorites    │                                                          │
│  │  └─ √ dev    │                    Commits                               │
│  ├─ Local        │                    (提交列表)                           │
│  │  ├─ dev       │                                                          │
│  │  ├─ feature   │  ● ──────────────────────────────── feature/login       │
│  │  └─ bugfix    │  │                                                       │
│  ├─ Remote       │  ● ──────────────────────────────── dev (HEAD)          │
│  │  ├─ origin/*  │  │                                                       │
│  │  └─ ...       │  ● ──────────────────────────────── main                │
│  └─ Tags         │                                                          │
│                  │──────────────────────────────────────────────────────────│
│  [+] [🔄] [🗑]  │  Changed Files              │  Commit Details            │
│                  │  ├─ file1.ts  [M]           │  hash: abc1234             │
│                  │  ├─ file2.ts  [A]           │  author: John              │
│                  │  └─ file3.ts  [D]           │  date: 2026-09-20          │
│                  │                              │  message: Fix bug          │
│                  │                              │                            │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### 1.3 Branches Pane (分支窗格)

**工具栏:**
| 图标 | 操作 | 描述 |
|------|------|------|
| ← | 隐藏 Git 分支 | 隐藏分支窗格 |
| + | 新建分支 | 基于所选分支创建新分支 |
| 🔄 | 更新所选 | Fetch 所选分支的更改 |
| 🗑 | 删除分支 | 删除所选分支 |
| 🔍 | 与当前比较 | 比较所选分支与当前分支 |
| 🔎 | 显示我的分支 | 只显示你创建的分支 |
| ⬇ | 获取所有远程 | Fetch 所有远程分支 |
| ⭐ | 标记/取消收藏 | 将分支标记为收藏 |
| 📁 | 按目录分组 | 按目录分组分支 |
| ▼/▲ | 展开/折叠全部 | 展开/折叠列表 |

**右键菜单:**
- Checkout (切换分支)
- New Branch From (从选定分支创建)
- Checkout and Rebase onto (切换并变基)
- Compare with (与当前比较)
- Show Diff with Working Tree (与工作树比较)
- Rebase onto (变基到选定分支)
- Merge into (合并到当前分支)
- New Worktree (创建工作树)
- Pull into Using Rebase (拉取并变基)
- Pull into Using Merge (拉取并合并)
- Update (拉取更改)
- Push (推送)
- Rename (重命名)
- Delete (删除)

---

## 2. 功能清单

### 2.1 分支管理

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 分支列表 | 显示本地、远程、收藏、标签 | P0 | ✅ |
| 当前分支标识 | 高亮 + √ 图标 | P0 | ✅ |
| 分支搜索 | 实时过滤分支名称 | P0 | ⬜ |
| 创建分支 | 从当前/选定分支创建 | P0 | ⬜ |
| 删除分支 | 删除本地/远程分支 | P0 | ✅ |
| 切换分支 | Checkout 到其他分支 | P0 | ✅ |
| 合并分支 | 将分支合并到当前分支 | P0 | ✅ |
| 重命名分支 | 修改分支名称 | P1 | ⬜ |
| 变基分支 | Rebase 到其他分支 | P1 | ⬜ |
| 收藏分支 | 标记为收藏，置顶显示 | P1 | ⬜ |
| 未推送检测 | 显示传入/传出提交数 | P1 | ✅ |
| 分支比较 | 比较两个分支的差异 | P1 | ⬜ |
| 批量操作 | 多选分支批量删除/更新 | P2 | ⬜ |

### 2.2 提交管理

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 提交历史 | 显示提交记录列表 | P0 | ✅ |
| 提交详情 | 查看单个提交详细信息 | P0 | ✅ |
| 提交搜索 | 按关键词搜索提交 | P0 | ⬜ |
| 提交过滤 | 按分支/用户/日期/路径过滤 | P1 | ⬜ |
| 文件差异 | 查看提交引入的代码变更 | P0 | ✅ |
| 提交图 | 可视化分支合并图 | P1 | ⬜ |
| Cherry-pick | 应用选定提交到当前分支 | P1 | ⬜ |
| Revert Commit | 回滚提交更改 | P1 | ⬜ |
| Reset Branch | 重置当前分支到选定提交 | P1 | ⬜ |
| Interactive Rebase | 交互式变基 | P2 | ⬜ |

### 2.3 文件操作

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 文件差异查看 | Side-by-side diff | P0 | ✅ |
| 暂存文件 | Stage 文件 | P0 | ⬜ |
| 取消暂存 | Unstage 文件 | P0 | ⬜ |
| 提交代码 | 创建新提交 | P0 | ⬜ |
| Revert 文件 | 回滚单个文件更改 | P1 | ⬜ |
| Cherry-pick 文件 | 应用单个文件更改 | P2 | ⬜ |

### 2.4 远程操作

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Fetch | 获取远程更新 | P1 | ⬜ |
| Pull | 拉取远程更改 | P1 | ⬜ |
| Push | 推送到远程 | P1 | ⬜ |

---

## 3. UX 交互规范

### 3.1 分支切换 (Checkout)

**场景 1: 干净工作区**
```
用户点击分支 → Checkout
→ 直接切换
→ 底部通知: "已切换到分支 feature/login"
→ 自动恢复上下文 (打开的文件、运行配置、断点)
```

**场景 2: 有未提交更改 (不冲突)**
```
用户点击分支 → Checkout
→ 直接切换 (保留本地更改)
→ 底部通知: "已切换到分支 feature/login"
```

**场景 3: 有未提交更改 (冲突)**
```
用户点击分支 → Checkout
→ 弹出对话框:
┌─────────────────────────────────────────────┐
│  Checkout 分支                               │
│                                              │
│  以下文件将被覆盖:                           │
│  ├─ src/main.ts                              │
│  └─ src/utils.ts                             │
│                                              │
│  [Force Checkout]  [Smart Checkout]  [Cancel]│
└─────────────────────────────────────────────┘

Force Checkout: 覆盖本地更改，直接切换
Smart Checkout: Shelve 更改 → 切换 → Unshelve (可能需要解决冲突)
```

### 3.2 分支删除

```
用户右键分支 → Delete
→ 确认对话框:
┌─────────────────────────────────────────────┐
│  删除分支?                                   │
│                                              │
│  确定要删除分支 "feature/old" 吗?            │
│  该分支有 3 个未合并的提交。                 │
│                                              │
│  [删除]  [取消]                              │
└─────────────────────────────────────────────┘

删除后:
→ 底部通知:
┌─────────────────────────────────────────────┐
│  分支 "feature/old" 已删除                   │
│  [恢复]  [查看未合并提交]                    │
└─────────────────────────────────────────────┘
```

### 3.3 加载状态

```
加载中: 旋转动画 + "加载中..."
加载失败: 错误图标 + 错误信息 + [重试] 按钮
空状态: 空状态图标 + 描述文字
```

### 3.4 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + K` | Commit |
| `Ctrl/Cmd + T` | Update Project (Pull) |
| `Ctrl/Cmd + Shift + K` | Push |
| `Ctrl/Cmd + 9` | 打开 Git Tool Window |
| `Ctrl/Cmd + L` | 跳转到搜索框 |
| `F5` | 刷新 |
| `Space` | 标记/取消收藏 |
| `Ctrl/Cmd + C` | 复制分支名称 |

### 3.5 通知类型

| 类型 | 样式 | 示例 |
|------|------|------|
| 成功 | 绿色 | "已切换到分支 feature/login" |
| 警告 | 黄色 | "分支已 diverge" |
| 错误 | 红色 | "合并冲突" |
| 信息 | 蓝色 | "分支已删除" |

---

## 4. 数据模型

### 4.1 Branch

```typescript
interface Branch {
  name: string;           // 分支名称 (feature/login)
  fullName: string;       // 完整名称 (refs/heads/feature/login)
  isCurrent: boolean;     // 是否为当前分支
  isRemote: boolean;      // 是否为远程分支
  remote?: string;        // 远程名称 (origin)
  upstream?: string;      // 上游分支 (origin/feature/login)
  commit?: string;        // 最新提交 hash
  message?: string;       // 最新提交信息
  hasUnpushed?: boolean;  // 是否有未推送提交
  unpushedCount?: number; // 未推送提交数量 (传入)
  hasUnfetched?: boolean; // 是否有未获取提交
  unfetchedCount?: number;// 未获取提交数量 (传出)
  isFavorite?: boolean;   // 是否为收藏分支
  tags?: string[];        // 关联的标签
}
```

### 4.2 CommitInfo

```typescript
interface CommitInfo {
  hash: string;           // 完整 hash
  shortHash: string;      // 短 hash (7位)
  message: string;        // 提交信息
  authorName: string;     // 作者名称
  authorEmail: string;    // 作者邮箱
  authorDate: string;     // 作者日期
  commitDate: string;     // 提交日期
  parents: string[];      // 父提交 hash 列表
  isMerge: boolean;       // 是否为合并提交
  isUnpushed?: boolean;   // 是否未推送
  branch?: string;        // 所属分支
}
```

### 4.3 GitStatus

```typescript
interface GitStatus {
  current: string;        // 当前分支
  staged: FileChange[];   // 已暂存文件
  modified: FileChange[]; // 已修改文件
  untracked: string[];    // 未跟踪文件
  conflicted: string[];   // 冲突文件
}

interface FileChange {
  path: string;           // 文件路径
  status: 'add' | 'modify' | 'delete' | 'rename';
}
```

---

## 5. API 接口

### 5.1 分支相关

| 接口 | 方法 | 参数 | 返回 |
|------|------|------|------|
| `/git-branches` | POST | `{ directory }` | `Branch[]` |
| `/git-checkout` | POST | `{ directory, branch }` | `{ success }` |
| `/git-create-branch` | POST | `{ directory, name, from? }` | `{ success }` |
| `/git-delete-branch` | POST | `{ directory, branch, force? }` | `{ success }` |
| `/git-rename-branch` | POST | `{ directory, old, new }` | `{ success }` |
| `/git-merge` | POST | `{ directory, branch }` | `{ success }` |
| `/git-rebase` | POST | `{ directory, branch }` | `{ success }` |

### 5.2 提交相关

| 接口 | 方法 | 参数 | 返回 |
|------|------|------|------|
| `/git-log` | POST | `{ directory, limit?, branch? }` | `CommitInfo[]` |
| `/git-show` | POST | `{ directory, hash }` | `CommitDetail` |
| `/git-diff` | POST | `{ directory, hash? }` | `FileDiff[]` |
| `/git-status` | POST | `{ directory }` | `GitStatus` |
| `/git-cherry-pick` | POST | `{ directory, hash }` | `{ success }` |
| `/git-revert` | POST | `{ directory, hash }` | `{ success }` |
| `/git-reset` | POST | `{ directory, hash, mode? }` | `{ success }` |

### 5.3 远程相关

| 接口 | 方法 | 参数 | 返回 |
|------|------|------|------|
| `/git-fetch` | POST | `{ directory, remote? }` | `{ success }` |
| `/git-pull` | POST | `{ directory, rebase? }` | `{ success }` |
| `/git-push` | POST | `{ directory, force? }` | `{ success }` |

---

## 6. 与 IntelliJ 对齐的功能点

### 已实现
- ✅ 三栏布局 (Branches / Commits / Details)
- ✅ 分支列表 (本地/远程)
- ✅ 当前分支标识
- ✅ 分支切换 (Checkout)
- ✅ 分支合并 (Merge)
- ✅ 分支删除 (Delete)
- ✅ 提交历史
- ✅ 提交详情
- ✅ 文件差异
- ✅ 未推送检测

### 待实现 (Phase 1)
- ⬜ 分支搜索过滤
- ⬜ 创建分支
- ⬜ 重命名分支
- ⬜ 收藏分支
- ⬜ 分支比较
- ⬜ 提交搜索/过滤
- ⬜ 提交图 (Graph)
- ⬜ Cherry-pick
- ⬜ Revert/Reset

### 待实现 (Phase 2)
- ⬜ 变基操作 (Rebase)
- ⬜ 交互式变基
- ⬜ Stash 操作
- ⬜ 远程操作 (Fetch/Pull/Push)
- ⬜ 暂存/取消暂存 UI
- ⬜ 快捷键支持
- ⬜ 上下文菜单

### 待实现 (Phase 3)
- ⬜ 工作树 (Worktree)
- ⬜ 多仓库支持
- ⬜ 冲突解决 UI
- ⬜ 补丁 (Patch) 操作

---

## 7. 实现阶段

### Phase 1 - 基础功能 (当前)
- 分支列表 + 显示
- 分支切换/合并/删除
- 提交历史 + 详情
- 文件差异

### Phase 2 - 增强功能
- 分支创建/重命名
- 搜索/过滤
- 收藏分支
- 提交图
- Cherry-pick

### Phase 3 - 完善体验
- 变基操作
- Stash 操作
- 远程操作
- 暂存操作 UI
- 冲突解决 UI
- 快捷键
- 上下文菜单

### Phase 4 - 高级功能
- 工作树
- 多仓库支持
- 交互式变基
- 补丁操作
