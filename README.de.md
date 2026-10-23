**Sprache**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

Eine plattformübergreifende, grafische Git-Verwaltung, verfügbar als [OpenChamber](https://docs.openchamber.dev/sdk/)–Erweiterung. Das Interaktionsdesign orientiert sich eng am Git-Fenster von IntelliJ IDEA, sodass Entwickler, die einen IDE-artigen Git-Workflow gewohnt sind, sofort loslegen können — vertrautes Branch-Management, Commit-Durchsicht und Diff-Vergleiche, überall.

## Funktionen

- **Branch-Management**: Lokale und Remote-Branches in Gruppen durchsuchen, Lieblingsbranches markieren; Erstellen, Umbenennen, Wechseln und Löschen mit einem Klick. Die Branch-Position wird vor dem Löschen gespeichert, sodass ein versehentliches Löschen direkt aus der Benachrichtigung rückgängig gemacht werden kann. Nicht gemergte Branches werden klar markiert, der aktuelle Branch ist gegen Fehlbedienungen gesperrt
- **Commit-Verlauf**: Commit-Liste mit Graph und Commit-Details; gängige Commit-Operationen wie Cherry-Pick, Revert und Stash
- **Diff-Vergleich**: Diff-Ansicht auf Datei- und Commit-Ebene mit intuitiver Staging-Verwaltung
- **Intelligentes Filtern**: Groß-/Kleinschreibung, Regex, Branch, Autor, Datum und Pfad als kombinierbare Filter; Pfade unterstützen Mehrfachauswahl im IDEA-Stil
- **Mehrsprachige Oberfläche**: 12 eingebaute Sprachen, darunter Chinesisch, Englisch, Japanisch, Koreanisch, Deutsch und Französisch; Oberflächentexte und Datumsformate folgen automatisch der Systemsprache, siehe [i18n-Hinweise](packages/openchamber/I18N.md)

![Panel-Screenshot](docs/images/panel.png)

## Roadmap

- Professionelle Git-Visualisierung an keinen einzelnen Editor binden — in jeder Umgebung eine angenehme Branch- und Commit-Erfahrung
- Kernfähigkeiten eigenständig ausarbeiten und schrittweise zu OpenChamber, VSCode und weiteren Plattformen bringen
- Interaktionsdetails weiterhin nach dem Vorbild ausgereifter IDEs verfeinern, damit jeder Klick intuitiv wirkt
- Open Source, offene Beteiligung — Willkommen mit Interesse und Beiträgen

## Danksagung

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — Design und Implementierung des Git-Fensters sind die wichtigste Referenz dieses Projekts (Apache-2.0-Lizenz)
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — wichtige Referenz für die Funktionen des Git-Verwaltungspanels

## Lizenz

Dieses Projekt steht unter der [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
