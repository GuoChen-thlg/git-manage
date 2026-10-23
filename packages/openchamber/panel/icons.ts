/**
 * SVG 图标定义
 * 基于 IntelliJ 风格的图标
 */

/** 图标类型定义 */
export interface Icon {
  svg: string;
  width?: number;
  height?: number;
}

/** 图标集合 */
export const ICONS: Record<string, Icon> = {
  // 隐藏分支面板 (←)：分支面板展开时显示，点击可收起
  hideBranches: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 13L5 8L10 3" stroke="#6E6E6E" stroke-width="2"/></svg>`,
  },
  // 显示分支面板 (>)：分支面板隐藏时显示，点击可展开
  showBranches: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 13L11 8L6 3" stroke="#6E6E6E" stroke-width="2"/></svg>`,
  },
  // 新建分支 (+)
  newBranch: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V14M2 8H14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // 签出分支 (checkout)
  checkout: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect width="2" height="12.332" x="7.927" y=".901" fill="#389FD6" transform="rotate(45 8.927 7.067)"/><polygon fill="#389FD6" points="3 6 10 13 3 13"/></g></svg>`,
  },
  // 删除分支 (trash)
  delete: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4H13M5 4V3C5 2.45 5.45 2 6 2H10C10.55 2 11 2.45 11 3V4M4 4L5 14H11L12 4M6.5 7V11M9.5 7V11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 更新所选（IDEA AllIcons.Actions.CheckOut 字形，Update Selected 动作图标；新 UI 下渲染为灰色）
  updateSelected: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect width="2" height="12.332" x="7.927" y=".901" fill="#6E6E6E" transform="rotate(45 8.927 7.067)"/><polygon fill="#6E6E6E" points="3 6 10 13 3 13"/></g></svg>`,
  },
  // 刷新 (refresh)
  refresh: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.5747152,11.8852806 C11.4741474,13.1817355 9.83247882,14.0044386 7.99865879,14.0044386 C5.03907292,14.0044386 2.57997332,11.8615894 2.08820756,9.0427473 L3.94774327,9.10768372 C4.43372186,10.8898575 6.06393114,12.2000519 8.00015362,12.2000519 C9.30149237,12.2000519 10.4645985,11.6082097 11.2349873,10.6790094 L9.05000019,8.71167959 L14.0431479,8.44999981 L14.3048222,13.4430431 L12.5747152,11.8852806 Z M3.42785637,4.11741586 C4.52839138,2.82452748 6.16775464,2.00443857 7.99865879,2.00443857 C10.918604,2.00443857 13.3513802,4.09026967 13.8882946,6.8532307 L12.0226389,6.78808057 C11.5024872,5.05935553 9.89838095,3.8000774 8.00015362,3.8000774 C6.69867367,3.8000774 5.53545628,4.39204806 4.76506921,5.32142241 L6.95482203,7.29304326 L1.96167436,7.55472304 L1.70000005,2.56167973 L3.42785637,4.11741586 Z" fill="#6E6E6E"/></svg>`,
  },
  // 收藏 (star)
  favorite: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon fill="#F4AF3D" fill-rule="evenodd" points="7.998 11.522 3.673 14.311 4.989 9.336 1 6.084 6.138 5.798 7.998 1 9.858 5.798 14.996 6.084 11.007 9.336 12.323 14.311"/></svg>`,
  },
  // 未收藏 (star outline)
  favoriteOutline: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1L10.2 5.4L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.4L8 1Z" stroke="#F4AF3D" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  },
  // 设置 (gear)
  settings: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="3" stroke="#6E6E6E" stroke-width="1.5"/></svg>`,
  },
  // 全部展开 (expand)
  expandAll: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect width="12" height="2" x="2" y="1" fill="#6E6E6E"/><rect width="12" height="2" x="2" y="13" fill="#6E6E6E"/><polygon fill="#6E6E6E" points="8 9 11.5 12 4.5 12" transform="matrix(1 0 0 -1 0 21)"/><polygon fill="#6E6E6E" points="8 4 11.5 7 4.5 7"/></g></svg>`,
  },
  // 排序 (sort)
  sort: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3V13M4 13L2 11M4 13L6 11M12 13V3M12 3L10 5M12 3L14 5" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 远程 (globe)
  remote: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="#6E6E6E" stroke-width="1.5"/><path d="M2 8H14M8 2C10 4 10 12 8 14M6 2C4 4 4 12 6 14M10 2C12 4 12 12 10 14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // Pull (下载)
  pull: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // Push (上传)
  push: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10V2M8 2L5 5M8 2L11 5M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 关闭 (x)
  close: {
    svg: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L8 8M8 2L2 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // 更多选项 (more)
  more: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="3" r="1.5" fill="#6E6E6E"/><circle cx="8" cy="8" r="1.5" fill="#6E6E6E"/><circle cx="8" cy="13" r="1.5" fill="#6E6E6E"/></svg>`,
  },
  // 正则 (regex)
  regex: {
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7C3 5 5 3 7 3C9 3 11 5 11 7C11 9 9 11 7 11" stroke="#6E6E6E" stroke-width="1.2" stroke-linecap="round"/><path d="M4 4L2 2M10 4L12 2" stroke="#6E6E6E" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  },
  // 搜索 (magnifier)
  search: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="4.5" stroke="#6E6E6E" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // 当前分支 (checkmark)
  currentBranch: {
    svg: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8L7 11L12 5" stroke="#589df6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 未推送 (上传箭头)
  unpushed: {
    svg: `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10V2M8 2L5 5M8 2L11 5" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 未拉取 (下载箭头)
  unpulled: {
    svg: `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="#589df6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 本地分支 (分支图标)
  localBranch: {
    svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 2V14M12 2V14M4 8H12M4 5H12M4 11H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // 远程分支 (分支图标)
  remoteBranch: {
    svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 2V14M12 2V14M4 8H12M4 5H12M4 11H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="5" r="1.5" fill="#6E6E6E"/><circle cx="12" cy="5" r="1.5" fill="#6E6E6E"/></svg>`,
  },
  // 标签 (tag)
  tag: {
    svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2H7L14 9L9 14L2 7V2Z" stroke="#6E6E6E" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  },
  // 加载中 (spinner)
  loading: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/></path></svg>`,
  },
  // 下载 (download)
  download: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 对比 (compare)
  compare: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3V13M12 3V13M4 8H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><path d="M6 5L3 8L6 11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 5L13 8L10 11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // 分支图标 (branch)
  branchIcon: {
    svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2V14M11 2V14M5 8H11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="5" cy="5" r="2" fill="#6E6E6E"/><circle cx="11" cy="11" r="2" fill="#6E6E6E"/></svg>`,
  },
  // 图形 (graph)
  graph: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="2" stroke="#6E6E6E" stroke-width="1.5"/><circle cx="4" cy="12" r="2" stroke="#6E6E6E" stroke-width="1.5"/><circle cx="12" cy="8" r="2" stroke="#6E6E6E" stroke-width="1.5"/><path d="M4 6V10M6 4H8L10 8M6 12H8L10 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // 设置齿轮 (gearSettings)
  gearSettings: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="3" stroke="#6E6E6E" stroke-width="1.5"/></svg>`,
  },
  // 跳转到引用 (goToRef)
  goToRef: {
    svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
};

/**
 * 获取图标 HTML 字符串
 */
export function getIcon(name: string): string {
  return ICONS[name]?.svg ?? '';
}

/**
 * 创建图标元素
 */
export function createIconElement(name: string): HTMLElement {
  const icon = ICONS[name];
  if (!icon) {
    const span = document.createElement('span');
    span.textContent = '?';
    return span;
  }
  
  const div = document.createElement('div');
  div.innerHTML = icon.svg;
  div.style.display = 'inline-flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  
  const svg = div.firstElementChild as SVGElement;
  if (svg) {
    svg.style.width = `${icon.width ?? 16}px`;
    svg.style.height = `${icon.height ?? 16}px`;
  }
  
  return div;
}
