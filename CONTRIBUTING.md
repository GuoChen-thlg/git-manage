# 贡献指南

感谢你对本项目的关注！项目的定位、功能特性与未来规划请先阅读 [README](README.md)。欢迎通过 Issue 讨论想法、报告问题，也欢迎直接提交 Pull Request。

## 开发环境

- Node.js 22 及以上
- pnpm 9（版本由仓库根目录 `package.json` 的 `packageManager` 字段锁定，推荐执行 `corepack enable` 让 Node 自动管理 pnpm 版本）

准备步骤：

```bash
# 克隆仓库
git clone https://github.com/GuoChen-thlg/git-manage.git
cd git-manage

# 安装依赖（安装过程会通过 prepare 脚本自动启用 husky 提交钩子）
pnpm install
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm test` | 以 watch 模式运行 vitest，开发时边改边测 |
| `pnpm exec vitest run --dir packages` | 一次性运行全量测试（当前 667 例），提交前自检用 |
| `pnpm typecheck` | 对 core、openchamber 两个包做全量 TypeScript 类型检查 |
| `pnpm build` | 构建三个包（core 与 openchamber 各自打包） |
| `pnpm lint` | 暂不可用：eslint 尚未配置 flat config，接入前请勿依赖此命令 |

## 提交规范

本仓库使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)，提交信息格式为：

```
<type>: <subject>
```

`type` 取值：`feat`（新功能）、`fix`（缺陷修复）、`docs`（文档）、`chore`（杂项）、`ci`（持续集成）、`refactor`（重构）、`test`（测试）、`style`（代码风格）、`perf`（性能）、`build`（构建）、`revert`（回滚）。`subject` 用中文简述改动内容。

仓库中的真实示例：

- `feat: 删除分支去掉确认直接删并支持 IDEA 式还原通知`
- `fix: 修复删除分支不可用问题`
- `docs: 新增规格覆盖盘点文档`

提交时有两个钩子会自动执行：

- **pre-commit**：运行两个包的全量类型检查，不通过则提交被拦截
- **commit-msg**：使用 commitlint 校验提交信息格式，不符合 Conventional Commits 会被拦截

## 分支与 PR

- 基于 `dev` 分支开发，从 `dev` 拉出你的特性分支
- 单个 PR 只解决一个问题，改动聚焦、便于评审
- PR 描述请说清楚动机（解决什么问题）与做法（如何解决的）
- CI 必须全绿：构建、类型检查、全量单元测试全部通过才能合并
- 行为变更（新功能或修复）需要附带测试，或同步更新已有测试

## 报告问题

请使用仓库的 Issue 模板提交：

- **Bug 反馈**：请提供清晰的复现步骤（操作路径、相关分支或仓库状态）与环境信息（操作系统、OpenChamber 版本、本项目版本）
- **功能建议**：请描述使用场景与期望行为，欢迎附上 IntelliJ IDEA 中对应交互的说明，便于对齐交互细节

## 架构速览

项目为 pnpm workspace，包含两个包：

- **`packages/core`**：纯 TypeScript 实现的 Git 能力层，不依赖任何编辑器，可独立复用，目标是逐步支持 OpenChamber、VSCode 等多个平台
- **`packages/openchamber`**：OpenChamber 扩展包，包含 panel（面板 UI）与 service（服务端，执行 Git 命令）两部分，依赖 core 提供的 Git 能力

以下规格文档可作为贡献方向的参考：

- [docs/git-ide-feature-spec.md](docs/git-ide-feature-spec.md)：IntelliJ IDEA Git 工具窗的功能规格
- [docs/spec-coverage.md](docs/spec-coverage.md)：规格实现覆盖情况盘点，未覆盖项即是潜在的贡献点
