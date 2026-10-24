**Language**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · **English** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

A cross-platform graphical Git management tool, delivered as an [OpenChamber](https://docs.openchamber.dev/sdk/) extension. Its interaction design closely follows the Git tool window of IntelliJ IDEA, so developers used to an IDE-style Git workflow can get started seamlessly — familiar branch management, commit browsing, and diff comparison, everywhere.

## Features

- **Branch management**: Browse local and remote branches in groups, star favorite branches; create, rename, switch, and delete with one click. The branch position is recorded before deletion, so an accidental delete can be undone directly from the notification. Unmerged branches are clearly flagged, and the current branch is locked to prevent mistakes
- **Commit history**: Commit list with graph and commit details; common commit operations such as cherry-pick, revert, and stash
- **Diff comparison**: File-level and commit-level diffs with intuitive staging management
- **Smart filtering**: Combine filters by case sensitivity, regex, branch, author, date, and path; paths support IDEA-style tree multi-select
- **Multilingual UI**: 12 built-in languages covering Chinese, English, Japanese, Korean, German, French, and more. UI text and date formats follow the system language automatically — see [i18n notes](packages/openchamber/I18N.md)

![Panel screenshot](docs/images/panel.png)

## Roadmap

- Free professional Git visualization from any single editor — a comfortable branch and commit experience in every environment
- Distill core capabilities and bring them to OpenChamber, VSCode, and more platforms
- Keep polishing interaction details against the bar set by mature IDEs, so every click feels natural
- Built in the open — contributions and attention are welcome

## Acknowledgements

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — the design and implementation of its Git tool window is the most important reference for this project (Apache 2.0 license)
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — an important reference for the Git management panel features

## License

Licensed under the [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
