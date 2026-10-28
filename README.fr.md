**Langue**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

Un outil de gestion Git graphique multiplateforme, fourni sous forme d'extension [OpenChamber](https://docs.openchamber.dev/sdk/). Son design d'interaction s'inspire étroitement de la fenêtre Git d'IntelliJ IDEA, permettant aux développeurs habitués aux workflows Git de type IDE de démarrer immédiatement — gestion des branches, navigation des commits et comparaison de diffs, comme chez eux.

## Fonctionnalités

- **Gestion des branches**: Parcourir les branches locales et distantes groupées, étoiler vos branches préférées ; créer, renommer, basculer et supprimer en un clic. La position de la branche est enregistrée avant suppression, une suppression accidentelle peut donc être annulée directement depuis la notification. Les branches non fusionnées sont clairement signalées, la branche active est verrouillée contre les erreurs
- **Historique des commits**: Liste des commits avec graphe et détails ; opérations courantes comme cherry-pick, revert et stash
- **Comparaison de diffs**: Vue des diffs au niveau fichier et commit avec une gestion du staging intuitive
- **Filtrage intelligent**: Casse, expressions rationnelles, branche, auteur, date et chemin combinables ; les chemins prennent en charge la sélection multiple de type IDEA
- **Interface multilingue**: 12 langues intégrées, dont le chinois, l'anglais, le japonais, le coréen, l'allemand et le français ; les textes et les formats de date suivent automatiquement la langue du système, voir [notes i18n](packages/openchamber/I18N.md)

![Capture du panneau](docs/images/panel.png)

## Feuille de route

- Libérer la visualisation Git professionnelle de tout éditeur unique — une expérience branche et commit agréable dans chaque environnement
- Faire évoluer les capacités clés de façon autonome, vers OpenChamber, VSCode et davantage de plateformes
- Continuer à peaufiner les détails d'interaction à l'image des IDE matures, pour que chaque clic soit intuitif
- Projet open source, participation bienvenue

## Remerciements

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — la conception et l'implémentation de sa fenêtre Git sont la référence principale de ce projet (licence Apache 2.0)
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — référence importante pour les fonctionnalités du panneau de gestion Git

> **Mention de marque** : IntelliJ IDEA est une marque déposée de JetBrains s.r.o. Ce projet n'est ni affilié, ni sponsorisé, ni approuvé par JetBrains ; les mentions visent uniquement à décrire des références d'interaction.

## Licence

Ce projet est publié sous [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
