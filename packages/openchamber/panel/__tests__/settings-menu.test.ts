/**
 * 显示设置菜单单元测试
 * 覆盖菜单渲染、开关切换与勾号同步、外部点击关闭、重复打开唯一性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showSettingsMenu, hideSettingsMenu } from '../components/settings-menu';
import { setState, createInitialState, getState } from '../state';
import { setLocale } from '../i18n';

/**
 * 构造打开菜单用的鼠标事件
 * @returns 带坐标的 click 事件
 */
function createClickEvent(): MouseEvent {
  return new MouseEvent('click', { bubbles: true, clientX: 20, clientY: 30 });
}

/**
 * 获取设置菜单元素
 * @returns 菜单元素
 */
function getMenu(): HTMLElement {
  const menu = document.getElementById('git-settings-menu');
  expect(menu).toBeTruthy();
  return menu as HTMLElement;
}

/**
 * 按 data-key 查找开关项
 * @param key displaySettings 字段键
 * @returns 开关项元素
 */
function getItem(key: string): HTMLElement {
  const item = getMenu().querySelector<HTMLElement>(`[data-key="${key}"]`);
  expect(item).toBeTruthy();
  return item as HTMLElement;
}

/**
 * 读取开关项的勾号文本
 * @param key displaySettings 字段键
 * @returns 勾号文本（选中为 ✓，未选中为空串）
 */
function getCheck(key: string): string {
  const check = getItem(key).querySelector<HTMLElement>('.git-settings-check');
  expect(check).toBeTruthy();
  return check!.textContent ?? '';
}

describe('settings-menu', () => {
  beforeEach(() => {
    // 使用假计时器接管 show 结束时注册的 setTimeout(0)
    vi.useFakeTimers();
    setLocale('zh-CN');
    setState(s => Object.assign(s, createInitialState()));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hideSettingsMenu();
    // 执行排队的 setTimeout(0)，让全局 click 关闭监听注册后自清理
    vi.runAllTimers();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('showSettingsMenu 渲染', () => {
    it('打开后应在指针位置渲染菜单、中文标题与三个开关项且默认全部勾选', () => {
      showSettingsMenu(createClickEvent());

      const menu = getMenu();
      expect(menu.style.position).toBe('fixed');
      expect(menu.style.left).toBe('20px');
      expect(menu.style.top).toBe('30px');
      expect(menu.textContent).toContain('显示设置');

      const items = Array.from(menu.querySelectorAll('[data-key]'));
      expect(items.map(el => el.textContent)).toEqual([
        '✓显示作者列',
        '✓显示日期列',
        '✓显示哈希列',
      ]);
    });

    it('重复打开应只保留一个菜单', () => {
      showSettingsMenu(createClickEvent());
      showSettingsMenu(createClickEvent());

      expect(document.querySelectorAll('#git-settings-menu')).toHaveLength(1);
    });

    it('hideSettingsMenu 应移除菜单且无菜单时不报错', () => {
      expect(() => hideSettingsMenu()).not.toThrow();

      showSettingsMenu(createClickEvent());
      hideSettingsMenu();

      expect(document.getElementById('git-settings-menu')).toBeNull();
    });

    it('菜单容器应应用背景、边框、圆角、内边距、层级与阴影样式', () => {
      showSettingsMenu(createClickEvent());

      const menu = getMenu();
      expect(menu.style.background).toBe('rgb(45, 45, 45)');
      expect(menu.style.border).toBe('1px solid rgb(68, 68, 68)');
      expect(menu.style.borderRadius).toBe('4px');
      expect(menu.style.padding).toBe('4px 0px');
      expect(menu.style.zIndex).toBe('1000');
      expect(menu.style.minWidth).toBe('160px');
      expect(menu.style.boxShadow).toBe('0 2px 8px rgba(0, 0, 0, 0.5)');
    });

    it('标题与分隔线应应用字号、颜色与分隔样式', () => {
      showSettingsMenu(createClickEvent());

      const menu = getMenu();
      const title = menu.firstElementChild as HTMLElement;
      expect(title.style.padding).toBe('6px 12px');
      expect(title.style.fontSize).toBe('11px');
      expect(title.style.color).toBe('rgb(136, 136, 136)');

      const separator = title.nextElementSibling as HTMLElement;
      expect(separator.style.background).toBe('rgb(68, 68, 68)');
      expect(separator.style.margin).toBe('4px 0px');
    });

    it('开关项与勾号应应用布局与高亮色样式', () => {
      showSettingsMenu(createClickEvent());

      const item = getItem('showAuthor');
      expect(item.style.padding).toBe('6px 12px');
      expect(item.style.cursor).toBe('pointer');
      expect(item.style.fontSize).toBe('12px');
      expect(item.style.color).toBe('rgb(204, 204, 204)');
      expect(item.style.display).toBe('flex');
      expect(item.style.alignItems).toBe('center');
      expect(item.style.gap).toBe('6px');

      const check = item.querySelector<HTMLElement>('.git-settings-check');
      expect(check).toBeTruthy();
      expect(check!.style.width).toBe('12px');
      expect(check!.style.flex).toBe('0 0 12px');
      expect(check!.style.color).toBe('rgb(76, 175, 80)');
    });
  });

  describe('开关切换', () => {
    it('点击开关项应切换对应 displaySettings 并刷新勾号，菜单保持打开', () => {
      showSettingsMenu(createClickEvent());
      // 注册外部关闭监听，确保菜单内点击不会被误判为外部点击
      vi.runAllTimers();

      // 关闭 showAuthor
      getItem('showAuthor').click();
      expect(getState().displaySettings.showAuthor).toBe(false);
      expect(getCheck('showAuthor')).toBe('');
      expect(document.getElementById('git-settings-menu')).toBeTruthy();

      // 菜单保持打开，可再次切换回来
      getItem('showAuthor').click();
      expect(getState().displaySettings.showAuthor).toBe(true);
      expect(getCheck('showAuthor')).toBe('✓');

      // 切换另一项不影响其余项
      getItem('showHash').click();
      expect(getState().displaySettings.showHash).toBe(false);
      expect(getState().displaySettings.showDate).toBe(true);
      expect(getCheck('showHash')).toBe('');
      expect(document.getElementById('git-settings-menu')).toBeTruthy();
    });

    it('点击标题或分隔线不应改变任何开关状态', () => {
      showSettingsMenu(createClickEvent());
      const menu = getMenu();

      const title = menu.firstElementChild as HTMLElement;
      expect(title.textContent).toBe('显示设置');
      title.click();

      const separator = title.nextElementSibling as HTMLElement;
      expect(separator.style.height).toBe('1px');
      separator.click();

      expect(getState().displaySettings).toEqual({
        showAuthor: true,
        showDate: true,
        showHash: true,
      });
    });

    it('菜单缺少开关项时同步勾号不应抛错', () => {
      // 让 querySelector 对 showDate 项返回 null，模拟菜单缺项
      const original = Element.prototype.querySelector;
      const spy = vi.spyOn(Element.prototype, 'querySelector').mockImplementation(function (
        this: Element,
        sel: string,
      ): Element | null {
        if (sel === '[data-key="showDate"]') return null;
        return original.call(this, sel) as Element | null;
      });

      try {
        expect(() => showSettingsMenu(createClickEvent())).not.toThrow();
        // 自验证 mock 生效：缺项查询确实返回 null
        expect(
          Element.prototype.querySelector.call(getMenu(), '[data-key="showDate"]'),
        ).toBeNull();
      } finally {
        spy.mockRestore();
      }

      expect(document.getElementById('git-settings-menu')).toBeTruthy();
    });
  });

  describe('悬停高亮', () => {
    it('鼠标移入开关项应高亮该项背景', () => {
      showSettingsMenu(createClickEvent());

      const item = getItem('showAuthor');
      item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

      expect(item.style.background).toBe('rgb(58, 58, 58)');
    });

    it('鼠标移入标题不应高亮标题背景', () => {
      showSettingsMenu(createClickEvent());

      const title = getMenu().firstElementChild as HTMLElement;
      title.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

      expect(title.style.background).toBe('');
    });

    it('鼠标移出开关项应恢复透明背景', () => {
      showSettingsMenu(createClickEvent());

      const item = getItem('showDate');
      item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      expect(item.style.background).toBe('rgb(58, 58, 58)');

      item.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      expect(item.style.background).toBe('transparent');
    });

    it('鼠标移出标题不应改变标题背景', () => {
      showSettingsMenu(createClickEvent());

      const title = getMenu().firstElementChild as HTMLElement;
      title.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

      expect(title.style.background).toBe('');
    });
  });

  describe('嵌套子元素事件委托守卫', () => {
    /**
     * 向指定开关项内插入一个带 data-key 的嵌套 div
     * 用于验证委托处理器的 parentElement === menu 守卫：
     * 嵌套元素自身带 key，但不是菜单的直接子项
     * @param key 所属开关项的 data-key
     * @returns 嵌套 div 元素
     */
    function insertNestedChild(key: string): HTMLElement {
      const nested = document.createElement('div');
      nested.dataset.key = key;
      nested.textContent = '嵌套子元素';
      getItem(key).appendChild(nested);
      return nested;
    }

    it('鼠标移入或移出带 data-key 的嵌套子元素均不应触发高亮', () => {
      showSettingsMenu(createClickEvent());
      const nested = insertNestedChild('showAuthor');
      const item = getItem('showAuthor');

      nested.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      expect(nested.style.background).toBe('');
      expect(item.style.background).toBe('');

      nested.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      expect(nested.style.background).toBe('');
      expect(item.style.background).toBe('');
    });

    it('点击带 data-key 的嵌套子元素不应切换开关状态', () => {
      showSettingsMenu(createClickEvent());
      const nested = insertNestedChild('showAuthor');

      nested.click();

      // 状态保持不变、勾号仍为选中、菜单不因该点击关闭
      expect(getState().displaySettings.showAuthor).toBe(true);
      expect(getCheck('showAuthor')).toBe('✓');
      expect(document.getElementById('git-settings-menu')).toBeTruthy();
    });
  });

  describe('关闭行为', () => {
    it('点击菜单外部应关闭菜单', () => {
      showSettingsMenu(createClickEvent());
      // 触发 setTimeout(0) 注册全局 click 关闭监听
      vi.runAllTimers();
      expect(document.getElementById('git-settings-menu')).toBeTruthy();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-settings-menu')).toBeNull();
    });

    it('旧菜单关闭监听残留时，点击新菜单内部不应被误关', () => {
      // 第一次打开后不冲刷计时器，其延迟注册的监听在第二次打开后仍会触发
      showSettingsMenu(createClickEvent());
      showSettingsMenu(createClickEvent());
      vi.runAllTimers();

      getItem('showDate').click();

      expect(document.getElementById('git-settings-menu')).toBeTruthy();
      expect(getState().displaySettings.showDate).toBe(false);

      // 外部点击仍能关闭新菜单
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.getElementById('git-settings-menu')).toBeNull();
    });

    it('hideSettingsMenu 应以 click 事件名移除外部点击监听', () => {
      showSettingsMenu(createClickEvent());
      // 冲刷延迟注册，让全局 click 监听真正挂到 document 上
      vi.runAllTimers();

      const spy = vi.spyOn(document, 'removeEventListener');
      hideSettingsMenu();

      expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('无外部监听时 hideSettingsMenu 不应调用 removeEventListener', () => {
      // 先确保 closeHandler 为空
      hideSettingsMenu();

      const spy = vi.spyOn(document, 'removeEventListener');
      hideSettingsMenu();

      expect(spy).not.toHaveBeenCalled();
    });

    it('旧菜单残留监听自清理时应移除 click 监听', () => {
      // 打开后先隐藏菜单，再冲刷计时器：监听被注册但菜单已断开
      showSettingsMenu(createClickEvent());
      hideSettingsMenu();
      vi.runAllTimers();

      const spy = vi.spyOn(document, 'removeEventListener');
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});
