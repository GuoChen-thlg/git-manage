**言語**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · **日本語** · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

[OpenChamber](https://docs.openchamber.dev/sdk/) 拡張として提供されるクロスプラットフォームの Git グラフィカル管理ツールです。UI は IntelliJ IDEA の Git ツールウィンドウを忠実に参考にしており、IDE 流の Git ワークフローに慣れた開発者が、どこでも使い慣れたブランチ管理・コミット閲覧・差分比較をそのまま利用できます。

## 機能

- **ブランチ管理**: ローカルとリモートのブランチをグループ表示で閲覧し、よく使うものをお気に入り登録。作成・名前変更・切り替え・削除をワンクリックで実行。削除前にブランチの位置を記録するため、誤って削除しても通知からすぐに元に戻せます。未マージのブランチは明確に表示され、現在のブランチは誤操作防止のためロックされます
- **コミット履歴**: グラフ付きのコミット一覧とコミット詳細、cherry-pick・revert・stash などの主要操作に対応
- **差分比較**: ファイル単位・コミット単位の差分表示と、直感的なステージング管理
- **スマートフィルタ**: 大文字小文字、正規表現、ブランチ、作成者、日付、パスを組み合わせて絞り込み。パスは IDEA スタイルのツリー複数選択に対応
- **多言語 UI**: 中国語・英語・日本語・韓国語・ドイツ語・フランス語など 12 言語を内蔵。UI 文言と日付書式はシステム言語に自動で追従します。詳細は [i18n の説明](packages/openchamber/I18N.md) を参照

![パネルのスクリーンショット](docs/images/panel.png)

## ロードマップ

- 高度な Git 可視化を特定のエディタに縛られないものにし、どの環境でも快適なブランチ・コミット操作を実現
- 中核機能を独立して磨き上げ、OpenChamber、VSCode をはじめとする各プラットフォームへ展開
- 成熟した IDE を基準にインタラクションの細部を磨き続け、すべてのクリックを直感的に
- オープンソースとして共同開発中。関心と参加を歓迎します

## 謝辞

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — Git ツールウィンドウの設計と実装は本プロジェクトにとって最も重要な参考です（Apache 2.0 ライセンス）
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — Git 管理パネル機能の重要な参考です

## ライセンス

本プロジェクトは [Apache License 2.0](LICENSE) で公開されています。Copyright 2026 GuoChen-thlg。
