# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的格式约定，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。本文件基于本仓库提交历史整理。

## [0.0.1] - 2026-10-23

首个公开版本。

### 新增

- 提供 IntelliJ IDEA 风格的 Git 工具窗面板：本地与远程分支分组浏览、收藏常用分支，支持新建、重命名、切换与删除
- 支持提交历史列表与提交图、提交详情查看，以及 cherry-pick、revert、stash 等常用提交操作
- 支持文件级与提交级差异对比，以及直观的暂存区管理
- 支持大小写、正则、分支、作者、日期、路径等多条件组合过滤，路径提供 IDEA 风格树形多选
- 内置 12 种语言界面，覆盖中文、英语、日语、韩语、德语、法语等主流语种
- 删除分支打通完整链路：已合并分支去掉确认直接删除；未合并分支弹出强制确认对话框；删除后展示还原通知卡片，可一键还原或删除远程跟踪分支
- 新增 IntelliJ IDEA Git 工具窗功能规格文档（docs/git-ide-feature-spec.md）与规格覆盖盘点文档（docs/spec-coverage.md）

### 工程化

- 添加 GitHub Actions 持续集成：构建 → 类型检查 → 全量单元测试（667 例）
- 补齐 openchamber 包全量类型检查基线，修复 34 处类型问题
- 统一三包版本号为 0.0.1，采用 pnpm workspace 管理 core 与 openchamber 两个包
- 以 Apache-2.0 协议开源，完善 README（项目说明、功能介绍、面板截图与致谢）

[0.0.1]: https://github.com/GuoChen-thlg/git-manage/releases/tag/v0.0.1
