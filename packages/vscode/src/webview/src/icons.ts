/**
 * 图标消费封装：主进程通过 window.__ICONS__ 注入图标映射
 * 从 script.ts 原样迁移
 */

/**
 * 按名称取图标 SVG
 * @param name 图标名
 * @returns SVG 字符串，未定义时返回空串
 */
export function iconSvg(name: string): string {
  const map = (window as unknown as { __ICONS__?: Record<string, string> }).__ICONS__ || {};
  return map[name] || '';
}
