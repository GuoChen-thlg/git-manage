**語言**: [简体中文](README.md) | 繁體中文 | [English](README.en.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

一款跨平台的 Git 圖形化管理工具，以 [OpenChamber](https://docs.openchamber.dev/sdk/) 擴充功能形式提供。在互動設計上深度參考了 IntelliJ IDEA 的 Git 工具窗，讓習慣 IDE 式 Git 工作流的開發者可以無縫上手，熟悉的分支管理、提交瀏覽與差異對比體驗隨處可用。

## 功能特性

- **分支管理**：本機與遠端分支分組瀏覽、收藏常用分支，支援新建、重新命名、切換與刪除；刪除前自動記錄分支位置，誤刪可從通知中一鍵還原；未合併分支會給出明確提醒，目前分支自動鎖定防誤操作
- **提交歷史**：提交列表與提交圖、提交詳情查看，支援 cherry-pick、revert、stash 等常用提交操作
- **差異對比**：檔案級與提交級差異查看，直觀的暫存區管理
- **智慧過濾**：大小寫、正則、分支、作者、日期、路徑等多條件組合過濾，路徑支援 IDEA 風格的樹狀多選
- **多語言介面**：內建 12 種語言，涵蓋中文、英語、日語、韓語、德語、法語等主流語種，介面文案與日期格式會隨系統語言自動切換，詳見 [多語言說明](packages/openchamber/I18N.md)

![面板截圖](docs/images/panel.png)

## 未來規劃

- 讓專業的 Git 視覺化能力不再綁定於某一款編輯器，任何環境下都能獲得順手的分支與提交管理體驗
- 核心能力獨立沉澱，逐步走向 OpenChamber、VSCode 以及更多平台
- 以成熟 IDE 為標竿，持續打磨互動細節，讓每一次點擊都符合直覺
- 開源共建，歡迎關注與參與

## 致謝

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community)，其 Git 工具窗的設計與實作是本專案最重要的參考（Apache 2.0 授權）
- [DetachHead/rebased](https://github.com/DetachHead/rebased)，Git 管理面板功能的重要參考

## 授權條款

本專案基於 [Apache License 2.0](LICENSE) 開源，Copyright 2026 GuoChen-thlg。
