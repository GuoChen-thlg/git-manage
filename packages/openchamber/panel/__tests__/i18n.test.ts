import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, setLocale, getLang, resolveLocale, dicts } from '../i18n';

/** 菜单文案 i18n 测试（覆盖宿主 12 种语言） */
describe('i18n', () => {
  beforeEach(() => {
    setLocale('zh-CN');
  });

  it('默认语言应为简体中文', () => {
    expect(getLang()).toBe('zh-CN');
    expect(t('branch.checkout')).toBe('签出分支');
  });

  it('zh-CN 应返回简体中文', () => {
    setLocale('zh-CN');
    expect(t('commit.reset')).toBe('将当前分支重置到此处');
  });

  it('zh-TW 应返回繁体中文', () => {
    setLocale('zh-TW');
    expect(getLang()).toBe('zh-TW');
    expect(t('commit.reset')).toBe('將目前分支重設到此處');
  });

  it('en-US 应归一化为 en 并返回英文', () => {
    setLocale('en-US');
    expect(getLang()).toBe('en');
    expect(t('commit.reset')).toBe('Reset Current Branch to Here');
    expect(t('file.showDiff')).toBe('Show Diff');
  });

  it('de-DE 应归一化为 de 并返回德语', () => {
    setLocale('de-DE');
    expect(getLang()).toBe('de');
    expect(t('branch.delete')).toBe('Branch löschen');
  });

  it('ja 应返回日语', () => {
    setLocale('ja');
    expect(getLang()).toBe('ja');
    expect(t('branch.checkout')).toBe('ブランチをチェックアウト');
  });

  it('pt-BR 应返回巴西葡萄牙语', () => {
    setLocale('pt-BR');
    expect(getLang()).toBe('pt-BR');
    expect(t('branch.pull')).toBe('Pull');
    expect(t('commit.newBranch')).toBe('Novo branch');
  });

  it('zh-HK 应归一化为繁体中文', () => {
    expect(resolveLocale('zh-HK')).toBe('zh-TW');
  });

  it('pt 应通过前缀匹配到 pt-BR', () => {
    expect(resolveLocale('pt')).toBe('pt-BR');
  });

  it('不支持的 locale 应回退英文', () => {
    expect(resolveLocale('xx-YY')).toBe('en');
  });

  it('应替换占位符参数', () => {
    setLocale('zh-CN');
    expect(t('batch.selected', { n: 5 })).toBe('已选中 5 个提交');
    setLocale('en-US');
    expect(t('batch.cherryPickAll', { n: 3 })).toBe('Cherry-pick All (3)');
    setLocale('ja');
    expect(t('batch.selected', { n: 2 })).toBe('2 件のコミットを選択中');
  });

  it('12 种语言字典 key 应与英文完全一致（无缺失、无多余）', () => {
    const enKeys = Object.keys(dicts.en).sort();
    expect(enKeys.length).toBeGreaterThan(0);
    for (const [locale, dict] of Object.entries(dicts)) {
      const keys = Object.keys(dict).sort();
      expect(keys, `语言 ${locale} 缺失或多余 key`).toEqual(enKeys);
      // 值不允许为空
      for (const key of keys) {
        expect(dict[key], `${locale}.${key} 文案为空`).toBeTruthy();
      }
    }
  });

  it('缺失 key 应回退简体中文，再回退 key 本身', () => {
    setLocale('en-US');
    // 全字典都无此 key → 回退 key 本身
    expect(t('not.exist.key')).toBe('not.exist.key');
  });

  describe('resolveLocale 与默认值（变异体补充）', () => {
    it('模块首次加载时默认 locale 应为 zh-CN', async () => {
      // 重置模块注册表以拿到未经 setLocale 污染的新实例
      vi.resetModules();
      const fresh = await import('../i18n');

      expect(fresh.getLang()).toBe('zh-CN');
    });

    it('zh 基础语言无繁体标记时应回退简体中文', () => {
      // 'zh' 与 'zh-Hans' 都不匹配 tw/hk/hant，应落到 zh-CN 分支
      expect(resolveLocale('zh')).toBe('zh-CN');
      expect(resolveLocale('zh-Hans')).toBe('zh-CN');
    });

    it('zh-Hant 应归一化为繁体中文', () => {
      expect(resolveLocale('zh-Hant')).toBe('zh-TW');
    });
  });
});
