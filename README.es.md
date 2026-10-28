**Idioma**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md)

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

Una herramienta gráfica de gestión de Git multiplataforma, disponible como extensión de [OpenChamber](https://docs.openchamber.dev/sdk/). Su diseño de interacción sigue de cerca la ventana de Git de IntelliJ IDEA, de modo que quienes están acostumbrados a un flujo de trabajo de Git estilo IDE pueden empezar de inmediato: gestión de ramas, revisión de commits y comparación de diferencias, en cualquier entorno.

## Funcionalidades

- **Gestión de ramas**: Explorar ramas locales y remotas agrupadas, marcar favoritas; crear, renombrar, cambiar y eliminar con un clic. La posición de la rama se guarda antes de eliminarla, así que un borrado accidental puede deshacerse directamente desde la notificación. Las ramas sin fusionar se señalan con claridad y la rama actual se bloquea para evitar errores
- **Historial de commits**: Lista de commits con gráfico y detalles; operaciones habituales como cherry-pick, revert y stash
- **Comparación de diferencias**: Vista de diferencias a nivel de archivo y de commit, con una gestión del área de preparación intuitiva
- **Filtrado inteligente**: Combinar filtros por mayúsculas y minúsculas, expresión regular, rama, autor, fecha y ruta; las rutas admiten selección múltiple en árbol al estilo IDEA
- **Interfaz multilingüe**: 12 idiomas integrados, incluidos chino, inglés, japonés, coreano, alemán y francés; los textos y los formatos de fecha siguen automáticamente el idioma del sistema, ver [notas de i18n](packages/openchamber/I18N.md)

![Captura del panel](docs/images/panel.png)

## Hoja de ruta

- Liberar la visualización profesional de Git de cualquier editor concreto, para tener una experiencia cómoda de ramas y commits en todos los entornos
- Consolidar las capacidades clave y llevarlas a OpenChamber, VSCode y más plataformas
- Seguir puliendo los detalles de interacción tomando como referencia IDEs maduros, para que cada clic resulte natural
- Código abierto: comentarios y contribuciones son bienvenidos

## Agradecimientos

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community): el diseño y la implementación de su ventana de Git son la principal referencia de este proyecto (licencia Apache 2.0)
- [DetachHead/rebased](https://github.com/DetachHead/rebased): referencia importante para las funciones del panel de gestión de Git

> **Aviso de marca comercial**: IntelliJ IDEA es una marca registrada de JetBrains s.r.o. Este proyecto no está afiliado, patrocinado ni respaldado por JetBrains; las menciones se realizan únicamente para describir referencias de interacción.

## Licencia

Este proyecto se distribuye bajo la [Apache License 2.0](LICENSE), Copyright 2026 GuoChen-thlg.
