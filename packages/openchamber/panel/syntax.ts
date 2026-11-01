/**
 * diff 行语法高亮 tokeniser（自带极简实现，不引入第三方依赖）
 *
 * 目标：把一行代码文本切成 token 序列，供 diff 渲染上色，
 * 颜色走 styles.css 的 8 个 --gm-syntax-* 变量（映射宿主 --oc-syntax-*）：
 *   keyword / string / number / function / type / comment / variable / operator
 *
 * 定位：面向「diff 预览」的轻量高亮，只覆盖常见语法形态，不追求完整解析；
 * 未知内容一律落到普通文本（不着色），保证任何输入都不会崩溃或吞字符。
 */

/** token 语义类别；plain 为不着色的普通文本 */
export type SyntaxKind =
  | 'keyword'
  | 'string'
  | 'number'
  | 'function'
  | 'type'
  | 'comment'
  | 'variable'
  | 'operator'
  | 'plain';

/** 一个 token：原文片段 + 类别 */
export interface SyntaxToken {
  text: string;
  kind: SyntaxKind;
}

/**
 * 常见关键字集合（跨多语言的粗粒度覆盖：JS/TS/Java/Go/Python/SQL 等）
 * 用于把标识符识别为关键字或普通变量
 */
const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'function', 'const', 'let', 'var', 'class', 'extends', 'implements', 'new',
  'this', 'super', 'import', 'export', 'from', 'as', 'async', 'await', 'try', 'catch',
  'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'yield',
  'public', 'private', 'protected', 'static', 'final', 'readonly', 'abstract', 'interface',
  'type', 'enum', 'package', 'namespace', 'def', 'elif', 'except', 'lambda', 'pass',
  'with', 'global', 'nonlocal', 'raise', 'select', 'from', 'where', 'insert', 'update',
  'set', 'values', 'into', 'join', 'on', 'group', 'order', 'by', 'limit', 'null',
  'undefined', 'true', 'false', 'True', 'False', 'None', 'self', 'fn', 'struct', 'impl',
  'match', 'mod', 'use', 'pub', 'crate', 'mut', 'ref', 'let',
]);

/**
 * 常见内建/基础类型名：大写开头的标识符视为类型（Class 风格），
 * 之外再并入这些基础类型关键字
 */
const BASE_TYPES = new Set([
  'string', 'number', 'boolean', 'object', 'symbol', 'bigint', 'any', 'unknown', 'never',
  'void', 'int', 'float', 'double', 'char', 'byte', 'short', 'long', 'bool', 'uint',
  'str', 'list', 'dict', 'tuple', 'map', 'slice', 'chan', 'error', 'result', 'option',
]);

/**
 * 判断一个标识符是否应视为「类型」：大写开头（Class 风格）或在基础类型表里
 * @param word 标识符
 * @returns 是否视为类型
 */
function isTypeWord(word: string): boolean {
  return /^[A-Z]/.test(word) || BASE_TYPES.has(word);
}

/**
 * 把一行代码文本切成 token 序列。
 * 单遍扫描，自顶向下匹配：注释 → 字符串 → 数字 → 标识符/关键字 → 操作符 → 其他。
 * @param line 单行代码文本（不含换行）
 * @returns token 数组，拼接它们的 text 可还原原行
 */
export function tokenize(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let i = 0;

  /** 将 [start, end) 的文本作为指定类别的 token 收入 */
  const push = (start: number, end: number, kind: SyntaxKind): void => {
    if (end > start) tokens.push({ text: line.slice(start, end), kind });
  };

  while (i < line.length) {
    const ch = line[i]!;

    // 注释：// 到行尾
    if (ch === '/' && line[i + 1] === '/') {
      push(i, line.length, 'comment');
      break;
    }

    // 字符串：单引号 / 双引号 / 反引号（含转义）
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') { j += 2; continue; }
        if (line[j] === quote) { j += 1; break; }
        j += 1;
      }
      push(i, j, 'string');
      i = j;
      continue;
    }

    // 数字：整数/小数/科学计数/进制前缀
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9a-fA-FxXoObBeE._+-]/.test(line[j]!)) {
        // 避免把 1+1 的 + 吞进数字：仅在 e/E 后的 +-/ 才续数字
        const c = line[j]!;
        if ((c === '+' || c === '-') && !/[eE]/.test(line[j - 1] ?? '')) break;
        j += 1;
      }
      push(i, j, 'number');
      i = j;
      continue;
    }

    // 标识符 / 关键字 / 类型 / 函数
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j]!)) j += 1;
      const word = line.slice(i, j);
      // 函数：后面紧跟 ( 视为函数调用/定义
      const nextNonSpace = line.slice(j).match(/^\s*\(/);
      let kind: SyntaxKind;
      // 大写开头视为类型/类名优先（含 new Foo() 构造器），其次关键字，再次后跟括号的函数，其余为变量
      if (isTypeWord(word)) kind = 'type';
      else if (KEYWORDS.has(word)) kind = 'keyword';
      else if (nextNonSpace) kind = 'function';
      else kind = 'variable';
      push(i, j, kind);
      i = j;
      continue;
    }

    // 操作符：单字符或常见多字符运算符
    if (/[+\-*/%=<>!&|^~?:]/.test(ch)) {
      let j = i + 1;
      if (/[+\-*/%=<>!&|^~?]/.test(line[j] ?? '')) j += 1;
      push(i, j, 'operator');
      i = j;
      continue;
    }

    // 其他：括号/逗号/空白/标点等，作为普通文本收下（1 字符）
    push(i, i + 1, 'plain');
    i += 1;
  }

  return tokens;
}
