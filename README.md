**语言**: **简体中文** · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

一款跨平台的 Git 图形化管理工具，以 [OpenChamber](https://docs.openchamber.dev/sdk/) 扩展形式提供。在交互设计上深度参考了 IntelliJ IDEA 的 Git 工具窗，让习惯 IDE 式 Git 工作流的开发者可以无缝上手，熟悉的分支管理、提交浏览与差异对比体验随处可用。

## 功能特性

- **分支管理**：本地与远程分支分组浏览、收藏常用分支，支持新建、重命名、切换与删除；删除前自动记录分支位置，误删可从通知中一键还原；未合并分支会给出明确提醒，当前分支自动锁定防误操作
- **提交历史**：提交列表与提交图、提交详情查看，支持 cherry-pick、revert、stash 等常用提交操作
- **差异对比**：文件级与提交级差异查看，直观的暂存区管理
- **智能过滤**：大小写、正则、分支、作者、日期、路径等多条件组合过滤，路径支持 IDEA 风格的树形多选
- **多语言界面**：内置 12 种语言，覆盖中文、英语、日语、韩语、德语、法语等主流语种，界面文案与日期格式随系统语言自动切换，详见 [多语言说明](packages/openchamber/I18N.md)

![面板截图](docs/images/panel.png)

## 未来规划

- 让专业的 Git 可视化能力不再绑定于某一款编辑器，任何环境下都能获得顺手的分支与提交管理体验
- 核心能力独立沉淀，逐步走向 OpenChamber、VSCode 以及更多平台
- 以成熟 IDE 为标杆，持续打磨交互细节，让每一次点击都符合直觉
- 开源共建，欢迎关注与参与

## 致谢

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community)，其 Git 工具窗的设计与实现是本项目最重要的参考（Apache 2.0 许可）
- [DetachHead/rebased](https://github.com/DetachHead/rebased)，Git 管理面板功能的重要参考

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源，Copyright 2026 GuoChen-thlg。
