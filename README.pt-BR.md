**Idioma**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Português (Brasil)** · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

Uma ferramenta gráfica de gerenciamento de Git multiplataforma, disponível como extensão do [OpenChamber](https://docs.openchamber.dev/sdk/). Seu design de interação segue de perto a janela Git do IntelliJ IDEA, para que quem já está acostumado a um fluxo de trabalho Git no estilo IDE comece imediatamente: gerenciamento de branches, navegação de commits e comparação de diffs, em qualquer ambiente.

## Recursos

- **Gerenciamento de branches**: Navegue por branches locais e remotas agrupadas, favorite as mais usadas; crie, renomeie, alterne e exclua com um clique. A posição do branch é registrada antes da exclusão, então uma exclusão acidental pode ser desfeita direto pela notificação. Branches não mescladas são sinalizadas com clareza e o branch atual é bloqueado para evitar enganos
- **Histórico de commits**: Lista de commits com gráfico e detalhes; operações comuns como cherry-pick, revert e stash
- **Comparação de diffs**: Visão de diffs por arquivo e por commit, com gerenciamento de staging intuitivo
- **Filtragem inteligente**: Combine filtros por maiúsculas/minúsculas, expressão regular, branch, autor, data e caminho; caminhos aceitam seleção múltipla em árvore no estilo IDEA
- **Interface multilíngue**: 12 idiomas embutidos, incluindo chinês, inglês, japonês, coreano, alemão e francês; textos e formatos de data seguem automaticamente o idioma do sistema, veja as [notas de i18n](packages/openchamber/I18N.md)

![Captura do painel](docs/images/panel.png)

## Roadmap

- Libertar a visualização profissional de Git de qualquer editor específico, oferecendo uma experiência confortável de branches e commits em todos os ambientes
- Consolidar as capacidades centrais e levá-las ao OpenChamber, VSCode e a mais plataformas
- Continuar refinando detalhes de interação tendo IDEs maduras como referência, para que cada clique pareça natural
- Código aberto: comentários e contribuições são bem-vindos

## Agradecimentos

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community): o design e a implementação da janela Git são a principal referência deste projeto (licença Apache 2.0)
- [DetachHead/rebased](https://github.com/DetachHead/rebased): referência importante para os recursos do painel de gerenciamento de Git

## Licença

Este projeto é distribuído sob a [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
