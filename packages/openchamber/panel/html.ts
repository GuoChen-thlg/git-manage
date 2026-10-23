/**
 * html 标签模板函数
 * 用于创建 DOM 元素，替代 document.createElement
 *
 * 使用示例:
 * const el = html`<div class="foo">${content}</div>`;
 * const el = html`<button onclick=${handler}>Click</button>`;
 */

type EventAttributes = {
  [K in keyof HTMLElementEventMap as `on${K}`]?: (e: HTMLElementEventMap[K]) => void;
};

type HtmlAttributes = Partial<Omit<HTMLElement, 'style' | 'children'>> & EventAttributes & {
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  ref?: { current: HTMLElement | null };
};

/**
 * html 标签模板函数
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): HTMLElement {
  const parts: string[] = [];
  const domElements: (HTMLElement | SVGElement)[][] = [];

  for (let i = 0; i < strings.length; i++) {
    parts.push(strings[i]);
    if (i < values.length) {
      const value = values[i];
      if (value == null || value === false) {
        // 忽略 null/undefined/false
      } else if (typeof value === 'string') {
        // 仅以 < 开头的字符串视为原始 HTML（如 getIcon 返回的 <svg> 图标），
        // 其余含尖括号的普通文本（如 `名字 <邮箱>`）一律转义，避免中段标签被吞
        if (value.startsWith('<')) {
          parts.push(value);
        } else {
          parts.push(escapeHTML(value));
        }
      } else if (typeof value === 'number') {
        parts.push(String(value));
      } else if (typeof value === 'boolean') {
        parts.push(value ? 'true' : '');
      } else if (Array.isArray(value)) {
        const arrElements: (HTMLElement | SVGElement)[] = [];
        for (const item of value) {
          if (item instanceof HTMLElement || item instanceof SVGElement) {
            arrElements.push(item);
            parts.push(`<!--m-${domElements.length}-${arrElements.length - 1}-->`);
          } else {
            parts.push(String(item ?? ''));
          }
        }
        if (arrElements.length > 0) {
          domElements.push(arrElements);
        }
      } else if (value instanceof HTMLElement || value instanceof SVGElement) {
        const idx = domElements.length;
        domElements.push([value]);
        parts.push(`<!--m-${idx}-0-->`);
      }
    }
  }

  const rawHTML = parts.join('');
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  try {
    container.innerHTML = rawHTML;

    const root = container.firstElementChild as HTMLElement;
    if (!root) {
      throw new Error('无法解析 HTML 模板');
    }

    // 遍历所有注释节点，替换为实际的 DOM 元素
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null);
    const comments: Comment[] = [];
    let node: Comment | null;
    while ((node = walker.nextNode() as Comment | null)) {
      comments.push(node);
    }

    for (const comment of comments) {
      const text = comment.textContent || '';
      const match = text.match(/^m-(\d+)-(\d+)$/);
      if (match) {
        const [, groupIdx, elemIdx] = match;
        const group = domElements[parseInt(groupIdx)];
        if (group) {
          const elem = group[parseInt(elemIdx)];
          if (elem) {
            comment.parentNode?.replaceChild(elem, comment);
          }
        }
      }
    }

    return root;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 辅助函数：创建带属性的元素
 */
export function h(
  tag: string,
  attrs?: HtmlAttributes | null,
  ...children: (HTMLElement | string | number | boolean | null)[]
): HTMLElement {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) {
        setAttribute(el, key, value);
      }
    }
  }

  for (const child of children) {
    if (child == null) {
      continue;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (typeof child === 'boolean') {
      el.appendChild(document.createTextNode(String(child)));
    } else {
      // 走到这里 child 已排除原始类型；运行时可能混入 SVG 元素（非 HTMLElement 实例）。
      // instanceof 左侧若直接用 child 会被收窄为 never 触发 TS2358，先声明为 Node 再判断
      const node: Node = child;
      if (node instanceof HTMLElement || node instanceof SVGElement) {
        el.appendChild(node);
      }
    }
  }

  return el;
}

/**
 * 设置属性
 */
function setAttribute(el: HTMLElement, key: string, value: unknown): void {
  if (key.startsWith('on') && typeof value === 'function') {
    const eventName = key.slice(2).toLowerCase();
    el.addEventListener(eventName, value as EventListener);
  } else if (key === 'class') {
    if (typeof value === 'string') {
      el.className = value;
    } else if (Array.isArray(value)) {
      el.className = value.filter(Boolean).join(' ');
    }
  } else if (key === 'style') {
    if (typeof value === 'string') {
      el.style.cssText = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(el.style, value);
    }
  } else if (key === 'ref' && typeof value === 'object' && value !== null) {
    (value as { current: HTMLElement | null }).current = el;
  } else if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(key, '');
    } else {
      el.removeAttribute(key);
    }
  } else if (value != null) {
    el.setAttribute(key, String(value));
  }
}

/**
 * 辅助函数：渲染列表
 */
export function map<T, R extends HTMLElement | string | number = HTMLElement | string>(
  items: T[],
  render: (item: T, index: number) => R
): R[] {
  return items.map(render);
}

/**
 * 辅助函数：条件渲染
 */
export function when(
  condition: unknown,
  trueCase: () => HTMLElement | string,
  falseCase?: () => HTMLElement | string
): HTMLElement | string | null {
  if (condition) {
    return trueCase();
  }
  return falseCase ? falseCase() : null;
}

/**
 * 辅助函数：创建文本节点
 */
export function text(content: string | number): Text {
  return document.createTextNode(String(content));
}
