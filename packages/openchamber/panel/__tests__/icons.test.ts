import { describe, it, expect } from 'vitest';
import { ICONS, getIcon, createIconElement } from '../icons';

describe('icons', () => {
  describe('ICONS', () => {
    it('应该包含所有必要的图标', () => {
      const requiredIcons = [
        'hideBranches',
        'newBranch',
        'checkout',
        'delete',
        'refresh',
        'favorite',
        'favoriteOutline',
        'settings',
        'expandAll',
        'sort',
        'remote',
        'pull',
        'push',
        'close',
        'more',
        'regex',
        'search',
        'currentBranch',
        'unpushed',
        'unpulled',
        'localBranch',
        'remoteBranch',
        'tag',
        'loading',
      ];

      for (const icon of requiredIcons) {
        expect(ICONS[icon]).toBeDefined();
        expect(ICONS[icon].svg).toBeTruthy();
        expect(ICONS[icon].svg).toContain('<svg');
      }
    });

    it('每个图标都应该有有效的 SVG', () => {
      for (const [, icon] of Object.entries(ICONS)) {
        expect(icon.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(icon.svg).toContain('viewBox=');
      }
    });
  });

  describe('getIcon', () => {
    it('应该返回图标 SVG 字符串', () => {
      const svg = getIcon('refresh');
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 16 16"');
    });

    it('应该在图标不存在时返回空字符串', () => {
      const svg = getIcon('nonexistent');
      expect(svg).toBe('');
    });
  });

  describe('createIconElement', () => {
    it('应该创建图标元素', () => {
      const element = createIconElement('refresh');
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.innerHTML).toContain('<svg');
    });

    it('应该在图标不存在时返回问号', () => {
      const element = createIconElement('nonexistent');
      expect(element.textContent).toBe('?');
    });

    it('应该设置正确的样式', () => {
      const element = createIconElement('refresh');
      expect(element.style.display).toBe('inline-flex');
      expect(element.style.alignItems).toBe('center');
      expect(element.style.justifyContent).toBe('center');
    });
  });

  describe('createIconElement 尺寸与健壮性（变异体补充）', () => {
    it('图标未声明宽高时应默认设置为 16px', () => {
      const element = createIconElement('refresh');
      const svg = element.firstElementChild as SVGElement | null;

      expect(svg).not.toBeNull();
      expect(svg!.style.width).toBe('16px');
      expect(svg!.style.height).toBe('16px');
    });

    it('图标声明了显式宽高时应使用声明值', () => {
      ICONS['__sized'] = {
        svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="18" fill="#000000"/></svg>',
        width: 24,
        height: 18,
      };
      try {
        const element = createIconElement('__sized');
        const svg = element.firstElementChild as SVGElement | null;

        expect(svg).not.toBeNull();
        expect(svg!.style.width).toBe('24px');
        expect(svg!.style.height).toBe('18px');
      } finally {
        delete ICONS['__sized'];
      }
    });

    it('图标内容不含 SVG 元素时应跳过尺寸设置且不抛错', () => {
      ICONS['__broken'] = { svg: 'plain-text' };
      try {
        const element = createIconElement('__broken');

        expect(element.textContent).toBe('plain-text');
        expect(element.querySelector('svg')).toBeNull();
        // 不应因首元素为空而访问 null.style 抛错
        expect(element.style.display).toBe('inline-flex');
      } finally {
        delete ICONS['__broken'];
      }
    });
  });
});
