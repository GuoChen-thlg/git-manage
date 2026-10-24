**Język**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · **Polski** · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

Wieloplatformowe graficzne narzędzie do zarządzania Git, udostępniane jako rozszerzenie [OpenChamber](https://docs.openchamber.dev/sdk/). Jego interfejs nawiązuje ściśle do okna Git w IntelliJ IDEA, dzięki czemu osoby przyzwyczajone do pracy z Git w stylu IDE mogą od razu zacząć: znajome zarządzanie gałęziami, przeglądanie commitów i porównywanie zmian, w każdym środowisku.

## Funkcje

- **Zarządzanie gałęziami**: Przeglądanie lokalnych i zdalnych gałęzi w grupach, oznaczanie ulubionych; tworzenie, zmiana nazwy, przełączanie i usuwanie jednym kliknięciem. Pozycja gałęzi jest zapisywana przed usunięciem, więc przypadkowe usunięcie można cofnąć bezpośrednio z powiadomienia. Niezmergowane gałęzie są wyraźnie oznaczone, a bieżąca gałąź jest zablokowana przed pomyłkami
- **Historia commitów**: Lista commitów z grafem i szczegółami; typowe operacje, takie jak cherry-pick, revert i stash
- **Porównywanie zmian**: Widok różnic na poziomie plików i commitów, z intuicyjnym zarządzaniem obszarem przygotowanym
- **Inteligentne filtrowanie**: Łączenie filtrów według wielkości liter, wyrażenia regularnego, gałęzi, autora, daty i ścieżki; ścieżki obsługują wielokrotny wybór w drzewie w stylu IDEA
- **Wielojęzyczny interfejs**: 12 wbudowanych języków, m.in. chiński, angielski, japoński, koreański, niemiecki i francuski; teksty i formaty dat automatycznie dostosowują się do języka systemu, zobacz [uwagi o i18n](packages/openchamber/I18N.md)

![Zrzut panelu](docs/images/panel.png)

## Plany

- Uwolnić profesjonalną wizualizację Git od konkretnego edytora — wygodna praca z gałęziami i commitami w każdym środowisku
- Rozwijać kluczowe możliwości niezależnie i stopniowo udostępniać je w OpenChamber, VSCode i na kolejnych platformach
- Stale dopracowywać szczegóły interakcji, wzorując się na dojrzałych IDE, by każde kliknięcie było intuicyjne
- Otwarty kod źródłowy — zapraszamy do udziału

## Podziękowania

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — projekt i implementacja okna Git są najważniejszym wzorcem tego projektu (licencja Apache 2.0)
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — istotny wzorzec dla funkcji panelu zarządzania Git

## Licencja

Projekt jest udostępniany na licencji [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
