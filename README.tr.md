**Dil**: [简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Українська](README.uk.md) · [Polski](README.pl.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **Türkçe**

# Git Manage

[![CI](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoChen-thlg/git-manage/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

[OpenChamber](https://docs.openchamber.dev/sdk/) eklentisi olarak sunulan, platformlar arası bir grafik Git yönetim aracı. Arayüz etkileşimi IntelliJ IDEA'nın Git araç penceresini yakından izler; IDE tarzı Git iş akışına alışkın geliştiriciler tanıdık dal yönetimi, commit inceleme ve diff karşılaştırmayı her ortamda hemen kullanabilir.

## Özellikler

- **Dal yönetimi**: Yerel ve uzak dalları gruplar halinde gezinin, sık kullanılanları işaretleyin; tek tıkla oluşturun, yeniden adlandırın, geçiş yapın ve silin. Silmeden önce dal konumu kaydedilir, böylece yanlışlıkla silinen dal bildirimden doğrudan geri alınabilir. Birleştirilmemiş dallar açıkça belirtilir, geçerli dal hatalı işlemlere karşı kilitlenir
- **Commit geçmişi**: Grafikli commit listesi ve commit ayrıntıları; cherry-pick, revert ve stash gibi yaygın işlemler
- **Diff karşılaştırma**: Dosya ve commit düzeyinde diff görünümü, sezgisel hazırlama alanı yönetimi
- **Akıllı filtreleme**: Büyük/küçük harf, düzenli ifade, dal, yazar, tarih ve yolu birleştirerek filtreleyin; yollar IDEA tarzı ağaçta çoklu seçimi destekler
- **Çok dilli arayüz**: Çince, İngilizce, Japonca, Korece, Almanca, Fransızca dahil 12 dil yerleşik. Arayüz metinleri ve tarih biçimleri sistem diline otomatik uyar; ayrıntılar için [i18n notları](packages/openchamber/I18N.md)

![Panel ekran görüntüsü](docs/images/panel.png)

## Yol haritası

- Profesyonel Git görselleştirmesini tek bir düzenleyiciye bağlı olmaktan çıkarıp her ortamda rahat bir dal ve commit deneyimi sunmak
- Temel yetenekleri bağımsız olarak geliştirip OpenChamber, VSCode ve daha fazla platforma taşımak
- Olgun IDE'leri ölçü alarak etkileşim ayrıntılarını iyileştirmeye devam etmek; her tıklama sezgisel olsun
- Açık kaynak, birlikte geliştirme: ilgi ve katkılarınızı bekliyoruz

## Teşekkür

- [JetBrains intellij-community](https://github.com/JetBrains/intellij-community) — Git araç penceresinin tasarımı ve uygulaması bu projenin en önemli referansıdır (Apache 2.0 lisansı)
- [DetachHead/rebased](https://github.com/DetachHead/rebased) — Git yönetim paneli özellikleri için önemli bir referans

## Lisans

Bu proje [Apache License 2.0](LICENSE) ile açık kaynak olarak sunulmuştur, Copyright 2026 GuoChen-thlg.
