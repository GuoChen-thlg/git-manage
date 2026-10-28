/**
 * 提交行布局约束测试
 * 验证图线与各列不会把提交标题挤出可视区域。
 * jsdom 不做真实布局，因此这里检查决定布局的样式约束是否到位。
 */

import { describe, it, expect } from 'vitest';
import { PANEL_CSS } from '../webview/styles';

/**
 * 取出某个选择器的样式规则体
 * @param selector CSS 选择器
 * @returns 规则体文本；未找到返回空串
 */
function ruleOf(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(PANEL_CSS);
  return match ? match[1]! : '';
}

describe('提交行布局', () => {
  it('行容器应裁剪溢出，避免内容被推到可视区外', () => {
    const rule = ruleOf('.commit-item');
    expect(rule).toContain('overflow: hidden');
    expect(rule).toContain('min-width: 0');
  });

  it('图线区应为固定宽度且不参与伸缩', () => {
    const rule = ruleOf('.commit-item .graph');
    expect(rule).toContain('width: 40px');
    expect(rule).toContain('flex: 0 0 auto');
  });

  it('标题应可收缩并省略，不能撑开容器', () => {
    const rule = ruleOf('.commit-item .msg');
    expect(rule).toContain('flex: 1 1 auto');
    expect(rule).toContain('min-width: 0');
    expect(rule).toContain('text-overflow: ellipsis');
    expect(rule).toContain('overflow: hidden');
  });

  it('日期与作者列应允许收缩，空间不足时让位给标题', () => {
    const rule = ruleOf('.commit-item .meta');
    // flex-shrink 为 1 才可能让位；0 会把标题挤出去
    expect(rule).toContain('flex: 0 1 auto');
    expect(rule).toContain('max-width');
  });

  it('哈希列不应占据可伸缩空间', () => {
    const rule = ruleOf('.commit-item .hash');
    expect(rule).toContain('flex: 0 0 auto');
  });
});
