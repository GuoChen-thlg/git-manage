/**
 * diff 弹窗纯函数单测
 * 迁移为真 TS 模块后可直接 import，补边界用例（原字符串脚本无法直测）。
 * 覆盖：buildSideBySideRows（并排对齐）、tokenizeDiffLine（分词）、lcsTable（LCS 表）、visualizeWhitespace
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildSideBySideRows, tokenizeDiffLine, lcsTable, highlightWordDiff } from '../webview/src/diff-popup';
import { visualizeWhitespace } from '../webview/src/whitespace';

// highlightWordDiff 产出 DOM 节点，需先给 Node 环境挂 jsdom 全局
const dom = new JSDOM('<body></body>');
(globalThis as unknown as Record<string, unknown>).document = dom.window.document;

describe('buildSideBySideRows', () => {
  it('空输入应返回空数组', () => {
    expect(buildSideBySideRows([])).toEqual([]);
  });

  it('连续 delete + add 块应按索引配对，缺侧补 null', () => {
    const rows = buildSideBySideRows([
      { type: 'delete', content: 'a', oldLine: 1 },
      { type: 'delete', content: 'b', oldLine: 2 },
      { type: 'add', content: 'x', newLine: 1 },
    ]);
    expect(rows).toHaveLength(2);
    // delete 多于 add：第一行两侧都有，第二行右侧补位
    expect(rows[0]).toEqual({ left: { type: 'delete', content: 'a', oldLine: 1 }, right: { type: 'add', content: 'x', newLine: 1 } });
    expect(rows[1]!.left).toBeTruthy();
    expect(rows[1]!.right).toBeNull();
  });

  it('孤立 add（前无 delete 块）应仅右侧有内容', () => {
    const rows = buildSideBySideRows([
      { type: 'context', content: 'k', oldLine: 1, newLine: 1 },
      { type: 'add', content: 'new', newLine: 2 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1]!.left).toBeNull();
    expect(rows[1]!.right?.content).toBe('new');
  });
});

describe('tokenizeDiffLine', () => {
  it('空输入应返回空数组', () => {
    expect(tokenizeDiffLine('')).toEqual([]);
    expect(tokenizeDiffLine(null)).toEqual([]);
  });

  it('应切出单词、空白与标点 token，且拼接可还原原文', () => {
    const tokens = tokenizeDiffLine('const a = 1;');
    expect(tokens.join('')).toBe('const a = 1;');
    expect(tokens).toContain('const');
    expect(tokens).toContain(' ');
    expect(tokens).toContain(';');
  });
});

describe('lcsTable', () => {
  it('空序列应返回全 0 表', () => {
    const table = lcsTable([], []);
    expect(table).toHaveLength(1);
    expect(table[0]).toEqual([0]);
  });

  it('公共子序列长度应正确', () => {
    const table = lcsTable(['a', 'b', 'c'], ['a', 'c']);
    // LCS('abc','ac') = 2
    expect(table[0]![0]).toBe(2);
  });
});

describe('highlightWordDiff（jsdom 环境）', () => {
  it('完全相同的文本不应产生 mark', () => {
    const result = highlightWordDiff('same line', 'same line');
    const hasMark = [...result.oldNodes, ...result.newNodes]
      .some(n => (n as HTMLElement).tagName === 'MARK');
    expect(hasMark).toBe(false);
  });

  it('完全不同的文本两侧对应 token 均应包 mark', () => {
    const result = highlightWordDiff('old', 'new');
    const oldMarks = result.oldNodes.filter(n => (n as HTMLElement).tagName === 'MARK');
    const newMarks = result.newNodes.filter(n => (n as HTMLElement).tagName === 'MARK');
    expect(oldMarks.map(m => m.textContent)).toEqual(['old']);
    expect(newMarks.map(m => m.textContent)).toEqual(['new']);
  });
});

describe('visualizeWhitespace', () => {
  it('空格应替换为中点，tab 替换为右箭头', () => {
    expect(visualizeWhitespace('a b')).toBe('a\u00B7b');
    expect(visualizeWhitespace('a\tb')).toBe('a\u2192b');
  });

  it('null / undefined 应返回空串', () => {
    expect(visualizeWhitespace(null)).toBe('');
    expect(visualizeWhitespace(undefined)).toBe('');
  });
});
