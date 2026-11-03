/**
 * 空白符可视化
 * 从 script.ts 原样迁移
 */

/**
 * 空白符可视化：空格→中点（U+00B7）、tab→右箭头（U+2192）
 * 仅替换展示文本，仍以 textContent 写入（不拼 HTML）
 * @param text 原始文本
 * @returns 替换后的展示文本
 */
export function visualizeWhitespace(text: string | null | undefined): string {
  return String(text == null ? '' : text)
    .replace(/ /g, '\u00B7')
    .replace(/\t/g, '\u2192');
}
