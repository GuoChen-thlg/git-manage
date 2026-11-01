/**
 * diff 行语法高亮 tokeniser 单元测试
 * 覆盖各类 token 的识别、拼接可还原原行、以及边界输入不崩溃
 */
import { describe, it, expect } from 'vitest';
import { tokenize } from '../syntax';

/** 把 token 序列的 text 拼回原行，用于验证不吞字符 */
function reassemble(tokens: { text: string }[]): string {
  return tokens.map(t => t.text).join('');
}

describe('语法高亮 tokeniser', () => {
  it('应把关键字、标识符、数字、字符串、操作符分别识别', () => {
    const tokens = tokenize('const x = 42;');
    const kinds = tokens.map(t => t.kind);
    expect(kinds).toContain('keyword');   // const
    expect(kinds).toContain('number');    // 42
    expect(kinds).toContain('operator');  // =
    expect(reassemble(tokens)).toBe('const x = 42;');
  });

  it('应识别字符串（含引号整体作为 string，不拆开）', () => {
    const tokens = tokenize(`msg = "hello world"`);
    const str = tokens.find(t => t.kind === 'string');
    expect(str?.text).toBe('"hello world"');
    expect(reassemble(tokens)).toBe(`msg = "hello world"`);
  });

  it('应识别 // 行注释（从 // 到行尾整体为 comment）', () => {
    const tokens = tokenize('a = 1; // 这是注释 b = 2');
    const comment = tokens.find(t => t.kind === 'comment');
    expect(comment?.text).toBe('// 这是注释 b = 2');
    expect(reassemble(tokens)).toBe('a = 1; // 这是注释 b = 2');
  });

  it('应把函数调用标识符识别为 function（后跟括号）', () => {
    const tokens = tokenize('print(x)');
    const fn = tokens.find(t => t.text === 'print');
    expect(fn?.kind).toBe('function');
  });

  it('应把大写开头的标识符识别为 type', () => {
    const tokens = tokenize('const obj = new Foo()');
    const type = tokens.find(t => t.text === 'Foo');
    expect(type?.kind).toBe('type');
  });

  it('普通小写标识符应为 variable，不误判为关键字', () => {
    const tokens = tokenize('count = total;');
    const varToken = tokens.find(t => t.text === 'count');
    expect(varToken?.kind).toBe('variable');
  });

  it('拼接所有 token 的 text 应精确还原任意原行（不吞不重）', () => {
    const lines = [
      '',
      '   ',
      'if (a <= b && c !== d) { return a + b; }',
      'const s = `template ${x} string`;',
      'x = 0x1F + 1.5e-3;',
      '名字 = 值; // 中文内容',
    ];
    for (const line of lines) {
      expect(reassemble(tokenize(line))).toBe(line);
    }
  });

  it('转义引号不应提前结束字符串', () => {
    const tokens = tokenize('s = "a \\" b";');
    const str = tokens.find(t => t.kind === 'string');
    expect(str?.text).toBe('"a \\" b"');
    expect(reassemble(tokens)).toBe('s = "a \\" b";');
  });
});
