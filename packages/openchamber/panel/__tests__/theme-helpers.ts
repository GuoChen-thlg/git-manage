/**
 * 主题/样式断言辅助
 * 用于在组件测试中统一校验：
 *  1. 元素带上了语义 class（而非内联像素值）
 *  2. 元素未硬编码十六进制颜色（主题应走 --gm- / --oc- 变量）
 *  3. 元素的内联样式仅保留运行时计算值（坐标/几何），不含主题色
 *
 * 约定：
 *  - 主题相关视觉靠 panel/styles.css 的 .gm-* 类与 --gm- 变量表达
 *  - 测试只断言「带了类」「未硬编码色值」，不断言具体像素（那是浏览器渲染层的事）
 */

/** 十六进制颜色字面量检测（含 3/4/6/8 位） */
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/;

/** 断言元素带上了给定语义 class 之一 */
export function expectSemanticClass(el: HTMLElement, classNames: string | string[]): void {
  const expected = Array.isArray(classNames) ? classNames : [classNames];
  const has = expected.some((cls) => el.classList.contains(cls));
  if (!has) {
    throw new Error(
      `期望元素带语义 class ${expected.join(' 或 ')}，实际 class="${el.className}"`
    );
  }
}

/** 断言元素及其子树未硬编码十六进制颜色（主题应走 CSS 变量） */
export function expectNoHardcodedHex(root: HTMLElement): void {
  const offenders: string[] = [];
  const visit = (el: HTMLElement, path: string): void => {
    if (HEX_COLOR_RE.test(el.getAttribute('style') ?? '')) {
      offenders.push(`${path} 内联 style 含 hex 颜色: ${el.getAttribute('style')}`);
    }
    // class 名可能是任意命名，跳过 class 内容检查；只看属性中可能含颜色的地方
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name === 'class' || attr.name === 'style') return;
      if (HEX_COLOR_RE.test(attr.value)) {
        offenders.push(`${path} 属性 ${attr.name} 含 hex 颜色: ${attr.value}`);
      }
    });
    Array.from(el.children).forEach((child, i) =>
      visit(child as HTMLElement, `${path} > ${child.tagName.toLowerCase()}[${i}]`)
    );
  };
  visit(root, 'root');
  if (offenders.length > 0) {
    throw new Error(`发现硬编码颜色（应改用 --gm- / --oc- 变量）:\n${offenders.join('\n')}`);
  }
}

/** 断言元素内联样式只包含运行时计算值白名单（坐标/几何），不含主题色相关声明 */
const RUNTIME_STYLE_KEYS = new Set([
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'maxWidth',
  'maxHeight',
  'minWidth',
  'minHeight',
  'transform',
  'translateX',
  'translateY',
  'opacity',
  'zIndex',
  'flex',
  'flexBasis',
  'gridColumn',
  'gridRow',
  'pointerEvents',
  'position',
]);

export function expectOnlyRuntimeInlineStyles(el: HTMLElement): void {
  const violations: string[] = [];
  for (let i = 0; i < el.style.length; i += 1) {
    const prop = el.style[i];
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (!RUNTIME_STYLE_KEYS.has(camel) && !camel.startsWith('--')) {
      violations.push(prop);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `内联样式只允许运行时计算值，发现主题/样式声明应迁到 styles.css class: ${violations.join(', ')}`
    );
  }
}

/**
 * 断言元素带有语义 class 且其样式由 CSS 类承担（不在内联样式中硬编码颜色）
 * 综合常见组件改造后的断言入口
 */
export function expectThemedClass(el: HTMLElement, classNames: string | string[]): void {
  expectSemanticClass(el, classNames);
  expectNoHardcodedHex(el);
}
