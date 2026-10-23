/**
 * 右键菜单组件单元测试
 * 覆盖分支右键菜单、单提交/批量提交右键菜单与菜单隐藏逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showContextMenu, showCommitContextMenu, hideContextMenu } from '../components/context-menu';
import { host } from '../host';
import { getState, setState, createInitialState, Branch, CommitInfo, FileDiff } from '../state';
import { setLocale } from '../i18n';
import { ServiceClient, DeleteBranchResult } from '../service';

// 宿主模块打桩：避免真实 connectHost 握手，并在用例中断言 toast 调用
vi.mock('../host', () => ({
  host: { toast: vi.fn().mockResolvedValue(undefined) },
}));

/** 测试目录 */
const DIRECTORY = '/repo';

/** 测试分支 */
const branch: Branch = { name: 'dev', isCurrent: false, isRemote: false };

/**
 * 删除分支成功响应样例（本地分支、有 upstream、服务端允许删跟踪分支）
 * 满足 service.deleteBranch 上游契约 DeleteBranchResult
 */
const deleteOk: DeleteBranchResult = {
  success: true,
  kind: 'local',
  tip: 'abc123',
  upstream: { remote: 'origin', branch: 'dev' },
  canDeleteTracking: true,
};

/** 通知卡片 id（components/notify 自绘卡片） */
const NOTIFY_ID = 'git-branch-deleted-notify';

/** 剪贴板写入 mock */
let writeTextMock: ReturnType<typeof vi.fn>;

/** confirm mock */
let confirmMock: ReturnType<typeof vi.fn>;

/**
 * 构造 service mock（只提供菜单用到的方法）
 * @returns 可传给菜单的 ServiceClient 替身
 */
function createMockService(): ServiceClient {
  return {
    checkoutBranch: vi.fn().mockResolvedValue(undefined),
    getBranches: vi.fn().mockResolvedValue([{ name: 'feature', isCurrent: false, isRemote: false }]),
    mergeBranch: vi.fn().mockResolvedValue(undefined),
    rebaseBranch: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    saveFavorites: vi.fn().mockResolvedValue(undefined),
    deleteBranch: vi.fn().mockResolvedValue(deleteOk),
    restoreBranch: vi.fn().mockResolvedValue({ success: true }),
    deleteRemoteBranch: vi.fn().mockResolvedValue({ success: true }),
    cherryPick: vi.fn().mockResolvedValue(undefined),
    revert: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    checkoutNewBranch: vi.fn().mockResolvedValue(undefined),
    renameBranch: vi.fn().mockResolvedValue(undefined),
    diffVsLocal: vi.fn().mockResolvedValue([]),
  } as unknown as ServiceClient;
}

/**
 * 构造测试用提交
 * @param overrides 覆盖字段
 * @returns 提交信息对象
 */
function createCommit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    hash: 'abc123',
    shortHash: 'abc1234',
    message: '修复缺陷',
    authorName: '测试者',
    authorEmail: 'tester@example.com',
    date: '2026-09-27',
    parents: ['def456'],
    ...overrides,
  };
}

/**
 * 构造右键点击事件
 * @returns 带坐标的 contextmenu 事件
 */
function createContextMenuEvent(): MouseEvent {
  return new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 });
}

/**
 * 按文案查找直接菜单项
 * @param menu 菜单容器
 * @param label 菜单项文案
 * @returns 菜单项元素，找不到返回 undefined
 */
function findMenuItem(menu: HTMLElement, label: string): HTMLElement | undefined {
  return Array.from(menu.children).find(el => el.textContent === label) as HTMLElement | undefined;
}

/**
 * 按文案查找通知卡片上的动作链接
 * @param label 链接文案
 * @returns 链接元素，找不到返回 undefined
 */
function findNotifyLink(label: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll(`#${NOTIFY_ID} a`))
    .find(el => el.textContent === label) as HTMLElement | undefined;
}

/**
 * 冲刷微任务队列，等待异步 action 完成
 * @param rounds 冲刷轮数
 */
async function flush(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

/**
 * 断言样式颜色值（兼容 3/6 位 hex，jsdom 可能把 hex 规范化为 rgb 字符串）
 * @param actual 实际样式值
 * @param hex 期望的十六进制颜色
 */
function expectStyleColor(actual: string, hex: string): void {
  // 3 位 hex 展开为 6 位
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  expect([hex, full, `rgb(${r}, ${g}, ${b})`]).toContain(actual);
}

/**
 * 获取当前菜单元素
 * @returns 菜单元素
 */
function getMenu(): HTMLElement {
  const menu = document.getElementById('git-context-menu');
  expect(menu).toBeTruthy();
  return menu as HTMLElement;
}

describe('context-menu', () => {
  beforeEach(() => {
    // 使用假计时器接管 show* 结束时注册的 setTimeout(0)
    vi.useFakeTimers();
    setLocale('zh-CN');
    setState(s => Object.assign(s, createInitialState()));
    document.body.innerHTML = '';
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);
    // 每例重置 toast mock 实现：防止 afterEach 的 restoreAllMocks 清空后返回值不再是 Promise 而断链
    vi.mocked(host.toast).mockReset();
    vi.mocked(host.toast).mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    hideContextMenu();
    // 执行排队的 setTimeout(0)，让全局 click 关闭监听注册后自清理
    vi.runAllTimers();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('showContextMenu 分支右键菜单', () => {
    it('派发 contextmenu 事件后应在指针位置渲染菜单与全部中文菜单项', () => {
      const service = createMockService();
      const trigger = document.createElement('div');
      document.body.appendChild(trigger);
      trigger.addEventListener('contextmenu', (e) => {
        showContextMenu(e as MouseEvent, branch, service, DIRECTORY);
      });

      trigger.dispatchEvent(createContextMenuEvent());

      const menu = getMenu();
      expect(menu.style.position).toBe('fixed');
      expect(menu.style.left).toBe('10px');
      expect(menu.style.top).toBe('10px');

      const labels = (Array.from(menu.children) as HTMLElement[])
        .filter(el => el.style.height !== '1px')
        .map(el => el.textContent);
      expect(labels).toEqual([
        '签出分支',
        '重命名分支',
        '合并到当前分支',
        '变基到此分支',
        '拉取',
        '推送',
        '添加收藏',
        '删除分支',
      ]);
      // 3 条分隔线
      const separators = (Array.from(menu.children) as HTMLElement[]).filter(el => el.style.height === '1px');
      expect(separators).toHaveLength(3);
      expectStyleColor(separators[0].style.background, '#444');
    });

    it('删除分支项应显示为危险红色，普通项与分隔线为默认样式', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      const menu = getMenu();
      const dangerItem = findMenuItem(menu, '删除分支');
      const normalItem = findMenuItem(menu, '签出分支');

      expect(dangerItem).toBeTruthy();
      expectStyleColor(dangerItem!.style.color, '#f44336');
      expect(normalItem).toBeTruthy();
      expectStyleColor(normalItem!.style.color, '#ccc');
      expect(normalItem!.style.cursor).toBe('pointer');
    });

    it('悬停菜单项应显示高亮，移出后恢复透明', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      const item = findMenuItem(getMenu(), '签出分支')!;
      item.dispatchEvent(new MouseEvent('mouseenter'));
      expect(item.style.background).not.toBe('');
      expect(item.style.background).not.toBe('transparent');

      item.dispatchEvent(new MouseEvent('mouseleave'));
      expect(item.style.background).toBe('transparent');
    });

    it('点击签出分支应调用 checkoutBranch 并刷新分支列表后关闭菜单', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '签出分支')!.click();
      await flush();

      expect(service.checkoutBranch).toHaveBeenCalledWith(DIRECTORY, 'dev');
      expect(service.getBranches).toHaveBeenCalledWith(DIRECTORY);
      expect(getState().branches).toEqual([
        { name: 'feature', isCurrent: false, isRemote: false },
      ]);
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击合并到当前分支应调用 mergeBranch', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '合并到当前分支')!.click();
      await flush();

      expect(service.mergeBranch).toHaveBeenCalledWith(DIRECTORY, 'dev');
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击变基到此分支应调用 rebaseBranch', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '变基到此分支')!.click();
      await flush();

      expect(service.rebaseBranch).toHaveBeenCalledWith(DIRECTORY, 'dev');
    });

    it('点击拉取与推送应分别调用 pull 与 push', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      findMenuItem(getMenu(), '拉取')!.click();
      await flush();

      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      findMenuItem(getMenu(), '推送')!.click();
      await flush();

      expect(service.pull).toHaveBeenCalledWith(DIRECTORY);
      expect(service.push).toHaveBeenCalledWith(DIRECTORY);
    });

    it('点击添加收藏应切换 favorites 并保存到远端', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '添加收藏')!.click();
      await flush();

      expect(getState().favorites.has('dev')).toBe(true);
      expect(service.saveFavorites).toHaveBeenCalledWith(DIRECTORY, ['dev']);
    });

    it('已收藏分支应显示取消收藏并可取消', async () => {
      const service = createMockService();
      setState(s => {
        s.favorites = new Set(['dev']);
      });

      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      const item = findMenuItem(getMenu(), '取消收藏');
      expect(item).toBeTruthy();

      item!.click();
      await flush();

      expect(getState().favorites.has('dev')).toBe(false);
      expect(service.saveFavorites).toHaveBeenCalledWith(DIRECTORY, []);
    });

    it('点击删除分支应直接调用 deleteBranch，不调用 confirm、不打开对话框', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      // 对齐 IDEA：无原生 confirm、无自定义确认对话框，点菜单即直接删除
      expect(confirmMock).not.toHaveBeenCalled();
      expect(service.deleteBranch).toHaveBeenCalledWith(DIRECTORY, 'dev');
      expect(document.getElementById('delete-branch-ok')).toBeNull();
      expect(document.getElementById('delete-branch-message')).toBeNull();
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('删除成功应出现 IDEA 式通知卡片（正文 + 还原/删除跟踪两条动作链接）并刷新分支列表', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      const card = document.getElementById(NOTIFY_ID);
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('已删除的分支: dev');
      expect(Array.from(card!.querySelectorAll('a')).map(a => a.textContent))
        .toEqual(['还原', '删除跟踪的分支']);

      expect(service.getBranches).toHaveBeenCalledWith(DIRECTORY);
      expect(getState().branches).toEqual([
        { name: 'feature', isCurrent: false, isRemote: false },
      ]);
      // 成功提示已由通知卡片取代：不发任何 toast
      expect(host.toast).not.toHaveBeenCalled();
    });

    it('当前分支的删除项应禁用（样式置灰），点击与悬停都无响应', async () => {
      const currentBranch: Branch = { name: 'main', isCurrent: true, isRemote: false };
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), currentBranch, service, DIRECTORY);

      const item = findMenuItem(getMenu(), '删除分支')!;
      expect(item.style.cursor).toBe('default');
      expectStyleColor(item.style.color, '#666');

      // 悬停不高亮（跳过禁用项）
      item.dispatchEvent(new MouseEvent('mouseenter'));
      expect(item.style.background).toBe('');

      // 点击不执行动作、不打开对话框、不关闭菜单（回归：委托处理曾漏检 disabled）
      item.click();
      await flush();
      expect(service.deleteBranch).not.toHaveBeenCalled();
      expect(document.getElementById('delete-branch-ok')).toBeNull();
      expect(document.getElementById('git-context-menu')).toBeTruthy();
    });

    it('deleteBranch reject NOT_MERGED 时应打开强制删除对话框（打开即 force 模式，不弹两次、不自动重发）', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(
        new Error(JSON.stringify({ code: 'NOT_MERGED', message: 'not merged' }))
      );
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      // 打开即强制模式：正文与按钮直接是 force 文案，且仅弹一次
      expect(document.getElementById('delete-branch-message')!.textContent)
        .toBe('分支 dev 尚未合并到当前分支，强制删除将丢失其上的提交。');
      expect(document.getElementById('delete-branch-ok')!.textContent).toBe('强制删除');
      expect(document.querySelectorAll('#delete-branch-ok')).toHaveLength(1);
      expect((document.getElementById('delete-branch-ok') as HTMLButtonElement).disabled).toBe(false);
      // 直接删除只发起了 1 次，未自动重发；尚未成功也未发通知
      expect(service.deleteBranch).toHaveBeenCalledTimes(1);
      expect(document.getElementById(NOTIFY_ID)).toBeNull();
    });

    it('强制对话框确认应以 force=true 删除并发出通知卡片', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(
        new Error(JSON.stringify({ code: 'NOT_MERGED', message: 'not merged' }))
      );
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();
      document.getElementById('delete-branch-ok')!.click();
      await flush();

      expect(service.deleteBranch).toHaveBeenNthCalledWith(1, DIRECTORY, 'dev');
      expect(service.deleteBranch).toHaveBeenNthCalledWith(2, DIRECTORY, 'dev', true);
      // 对话框关闭，通知照发（与直接删除成功同一条链路）
      expect(document.getElementById('delete-branch-ok')).toBeNull();
      expect(document.getElementById(NOTIFY_ID)!.textContent).toContain('已删除的分支: dev');
      expect(getState().branches).toEqual([
        { name: 'feature', isCurrent: false, isRemote: false },
      ]);
    });

    it('强制对话框点取消应关闭且不再调用 service.deleteBranch', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(
        new Error(JSON.stringify({ code: 'NOT_MERGED', message: 'not merged' }))
      );
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();
      document.getElementById('delete-branch-cancel')!.click();
      await flush();

      // 取消后不再删除：仅剩最初的直接删除调用，且不发通知
      expect(service.deleteBranch).toHaveBeenCalledTimes(1);
      expect(document.getElementById('delete-branch-ok')).toBeNull();
      expect(document.getElementById(NOTIFY_ID)).toBeNull();
    });

    it('点击通知「还原」应调用 restoreBranch、刷新分支列表并显示还原成功提示', async () => {
      const service = createMockService();
      vi.mocked(service.getBranches).mockResolvedValue([
        { name: 'dev', isCurrent: true, isRemote: false },
      ]);
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();
      findNotifyLink('还原')!.click();
      await flush();

      expect(service.restoreBranch).toHaveBeenCalledWith(DIRECTORY, 'dev', 'abc123', {
        remote: 'origin',
        branch: 'dev',
      });
      // 删除刷新 + 还原刷新共两次
      expect(service.getBranches).toHaveBeenCalledTimes(2);
      expect(getState().branches).toEqual([
        { name: 'dev', isCurrent: true, isRemote: false },
      ]);
      expect(host.toast).toHaveBeenCalledTimes(1);
      const request = vi.mocked(host.toast).mock.calls[0][0];
      expect(request.kind).toBe('success');
      expect(String(request.message)).toContain('dev');
      // 还原成功后卡片关闭
      expect(document.getElementById(NOTIFY_ID)).toBeNull();
    });

    it('点击通知「删除跟踪的分支」应调用 deleteRemoteBranch', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();
      findNotifyLink('删除跟踪的分支')!.click();
      await flush();

      expect(service.deleteRemoteBranch).toHaveBeenCalledWith(DIRECTORY, 'origin', 'dev');
      expect(document.getElementById(NOTIFY_ID)).toBeNull();
    });

    it('删除远程分支（kind=remote）时通知卡片应无动作链接', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockResolvedValue({
        success: true,
        kind: 'remote',
        tip: 'abc123',
        upstream: null,
        canDeleteTracking: false,
      });
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      const card = document.getElementById(NOTIFY_ID);
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('已删除的分支: dev');
      expect(card!.querySelectorAll('a')).toHaveLength(0);
      expect(findNotifyLink('还原')).toBeUndefined();
      expect(findNotifyLink('删除跟踪的分支')).toBeUndefined();
    });

    it('deleteBranch reject NOT_FOUND 时应弹错误 toast（branch.notFound）且不打开对话框', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(
        new Error(JSON.stringify({ code: 'NOT_FOUND', message: 'no such branch' }))
      );
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      expect(host.toast).toHaveBeenCalledTimes(1);
      const request = vi.mocked(host.toast).mock.calls[0][0];
      expect(request.kind).toBe('error');
      expect(String(request.message)).toBe('分支 dev 不存在');
      expect(document.getElementById('delete-branch-ok')).toBeNull();
      expect(document.getElementById(NOTIFY_ID)).toBeNull();

      // 失败输出 [context-menu] JSON 日志
      const debugCall = vi.mocked(console.debug).mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('branch_delete_failed')
      );
      expect(debugCall).toBeTruthy();
      expect(JSON.parse(String(debugCall![0])))
        .toMatchObject({ prefix: '[context-menu]', branch: 'dev', code: 'NOT_FOUND' });
    });

    it('deleteBranch reject GIT_ERROR 时应弹错误 toast（deleteFailed 前缀 + 原始 message）', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(
        new Error(JSON.stringify({ code: 'GIT_ERROR', message: "error: cannot delete branch 'dev'" }))
      );
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      expect(host.toast).toHaveBeenCalledTimes(1);
      const request = vi.mocked(host.toast).mock.calls[0][0];
      expect(request.kind).toBe('error');
      expect(String(request.message)).toBe("删除分支失败: error: cannot delete branch 'dev'");
      expect(document.getElementById('delete-branch-ok')).toBeNull();
    });

    it('deleteBranch reject 非 JSON（网络层等）时应按 deleteFailed 前缀原样透出', async () => {
      const service = createMockService();
      vi.mocked(service.deleteBranch).mockRejectedValueOnce(new Error('网络连接中断'));
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      expect(host.toast).toHaveBeenCalledTimes(1);
      const request = vi.mocked(host.toast).mock.calls[0][0];
      expect(request.kind).toBe('error');
      expect(String(request.message)).toBe('删除分支失败: 网络连接中断');
      expect(document.getElementById('delete-branch-ok')).toBeNull();
    });

    it('删除成功但刷新分支列表失败时通知照发，仅记日志且不显示错误', async () => {
      const service = createMockService();
      vi.mocked(service.getBranches).mockRejectedValueOnce(new Error('刷新失败'));
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();

      // 删除成功事实优先：通知照发、不弹任何错误 toast
      expect(document.getElementById(NOTIFY_ID)).toBeTruthy();
      expect(host.toast).not.toHaveBeenCalled();
      const errorCall = vi.mocked(console.error).mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('branch_delete_refresh_error')
      );
      expect(errorCall).toBeTruthy();
      const payload = JSON.parse(String(errorCall![0]));
      expect(payload.prefix).toBe('[context-menu]');
      expect(payload.branch).toBe('dev');
    });

    it('删除的是选中分支时应清空 selectedBranch，还原回调后恢复', async () => {
      const service = createMockService();
      setState(s => { s.selectedBranch = branch; });
      vi.mocked(service.getBranches).mockResolvedValue([
        { name: 'dev', isCurrent: true, isRemote: false },
      ]);
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '删除分支')!.click();
      await flush();
      expect(getState().selectedBranch).toBeNull();

      findNotifyLink('还原')!.click();
      await flush();

      expect(service.restoreBranch).toHaveBeenCalledWith(DIRECTORY, 'dev', 'abc123', {
        remote: 'origin',
        branch: 'dev',
      });
      expect(getState().selectedBranch?.name).toBe('dev');
    });

    it('点击重命名分支应打开重命名对话框', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      findMenuItem(getMenu(), '重命名分支')!.click();
      await flush();

      const input = document.getElementById('rename-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('dev');
      // 菜单已关闭
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击分隔线不应关闭菜单', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      vi.runAllTimers();

      const menu = getMenu();
      const separator = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px')!;
      separator.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-context-menu')).toBeTruthy();
    });

    it('点击菜单外部应关闭菜单', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      // 触发 setTimeout(0) 注册全局 click 关闭监听
      vi.runAllTimers();
      expect(document.getElementById('git-context-menu')).toBeTruthy();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('重复打开菜单应只保留一个菜单', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      expect(document.querySelectorAll('#git-context-menu')).toHaveLength(1);
    });

    it('hideContextMenu 应移除菜单且无菜单时安全', () => {
      const service = createMockService();
      expect(() => hideContextMenu()).not.toThrow();

      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      hideContextMenu();

      expect(document.getElementById('git-context-menu')).toBeNull();
    });
  });

  describe('showCommitContextMenu 单提交菜单', () => {
    it('应在指针位置渲染单提交菜单项与分隔线', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      const menu = getMenu();
      expect(menu.style.left).toBe('10px');
      expect(menu.style.top).toBe('10px');

      const labels = (Array.from(menu.children) as HTMLElement[])
        .filter(el => el.style.height !== '1px')
        .map(el => el.textContent);
      expect(labels).toEqual([
        '复制提交哈希',
        'Cherry-pick',
        '与本地比较',
        '将当前分支重置到此处',
        '回滚提交',
        '新建分支',
        '新建标签',
      ]);
      const separators = (Array.from(menu.children) as HTMLElement[]).filter(el => el.style.height === '1px');
      expect(separators).toHaveLength(3);
    });

    it('点击复制提交哈希应写入剪贴板', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '复制提交哈希')!.click();
      await flush();

      expect(writeTextMock).toHaveBeenCalledWith('abc123');
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击 Cherry-pick 应调用 service.cherryPick', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), 'Cherry-pick')!.click();
      await flush();

      expect(service.cherryPick).toHaveBeenCalledWith(DIRECTORY, 'abc123');
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击回滚提交应调用 service.revert', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '回滚提交')!.click();
      await flush();

      expect(service.revert).toHaveBeenCalledWith(DIRECTORY, 'abc123');
    });

    it('点击与本地比较应调用 diffVsLocal 并更新 diffs 后关闭菜单', async () => {
      const service = createMockService();
      const sampleDiff: FileDiff = { path: 'src/app.ts', additions: 2, deletions: 1, lines: [] };
      vi.mocked(service.diffVsLocal).mockResolvedValue([sampleDiff]);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '与本地比较')!.click();
      await flush();

      expect(service.diffVsLocal).toHaveBeenCalledWith(DIRECTORY, 'abc123');
      expect(getState().diffs).toEqual([sampleDiff]);
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击新建标签应记录日志并关闭菜单', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '新建标签')!.click();
      await flush();

      expect(console.log).toHaveBeenCalledWith('[git-manager] New Tag from commit:', 'abc123');
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('点击重置应打开对话框并按默认 soft 模式执行', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '将当前分支重置到此处')!.click();
      await flush();

      const okButton = document.getElementById('reset-ok');
      expect(okButton).toBeTruthy();

      okButton!.click();
      await flush();

      expect(service.reset).toHaveBeenCalledWith(DIRECTORY, 'abc123', 'soft');
      // 对话框已关闭
      expect(document.getElementById('reset-ok')).toBeNull();
    });

    it('点击新建分支应打开对话框并创建分支后刷新列表', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      findMenuItem(getMenu(), '新建分支')!.click();
      await flush();

      const input = document.getElementById('new-branch-from-commit') as HTMLInputElement;
      expect(input).toBeTruthy();

      input.value = 'feature/x';
      document.getElementById('branch-ok')!.click();
      await flush();

      expect(service.checkoutNewBranch).toHaveBeenCalledWith(DIRECTORY, 'feature/x');
      expect(getState().branches).toEqual([
        { name: 'feature', isCurrent: false, isRemote: false },
      ]);
      expect(document.getElementById('new-branch-from-commit')).toBeNull();
    });

    it('点击分隔线不应关闭单提交菜单', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      vi.runAllTimers();

      const menu = getMenu();
      const separator = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px')!;
      separator.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-context-menu')).toBeTruthy();
    });

    it('点击菜单外部应关闭单提交菜单', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      vi.runAllTimers();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-context-menu')).toBeNull();
    });
  });

  describe('showCommitContextMenu 批量菜单', () => {
    /** 批量选中的提交哈希（旧→新） */
    const batchHashes = ['h1', 'h2', 'h3'];

    it('batchHashes 多于 1 个时应渲染批量菜单与禁用首项', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);

      const menu = getMenu();
      const labels = (Array.from(menu.children) as HTMLElement[])
        .filter(el => el.style.height !== '1px')
        .map(el => el.textContent);
      expect(labels).toEqual([
        '已选中 3 个提交',
        '复制哈希列表',
        'Cherry-pick 全部 (3)',
        'Revert 全部 (3)',
      ]);
      // 仅 1 条分隔线
      expect((Array.from(menu.children) as HTMLElement[]).filter(el => el.style.height === '1px')).toHaveLength(1);

      // 首项为禁用态
      const disabledItem = findMenuItem(menu, '已选中 3 个提交')!;
      expect(disabledItem.style.cursor).toBe('default');
      expectStyleColor(disabledItem.style.color, '#666');
    });

    it('点击复制哈希列表应按换行拼接写入剪贴板', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);

      findMenuItem(getMenu(), '复制哈希列表')!.click();
      await flush();

      expect(writeTextMock).toHaveBeenCalledWith('h1\nh2\nh3');
    });

    it('确认后点击 Cherry-pick 全部应逐个调用 service.cherryPick', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);

      findMenuItem(getMenu(), 'Cherry-pick 全部 (3)')!.click();
      await flush();

      expect(confirmMock).toHaveBeenCalledWith('确定对 3 个提交执行 Cherry-pick 吗？');
      expect(service.cherryPick).toHaveBeenCalledTimes(3);
      expect(service.cherryPick).toHaveBeenNthCalledWith(1, DIRECTORY, 'h1');
      expect(service.cherryPick).toHaveBeenNthCalledWith(2, DIRECTORY, 'h2');
      expect(service.cherryPick).toHaveBeenNthCalledWith(3, DIRECTORY, 'h3');
      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('取消确认时不应执行批量 Cherry-pick', async () => {
      confirmMock.mockReturnValue(false);
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);

      findMenuItem(getMenu(), 'Cherry-pick 全部 (3)')!.click();
      await flush();

      expect(service.cherryPick).not.toHaveBeenCalled();
    });

    it('确认后点击 Revert 全部应逐个调用 service.revert', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);

      findMenuItem(getMenu(), 'Revert 全部 (3)')!.click();
      await flush();

      expect(confirmMock).toHaveBeenCalledWith('确定对 3 个提交执行 Revert 吗？');
      expect(service.revert).toHaveBeenCalledTimes(3);
      expect(service.revert).toHaveBeenNthCalledWith(1, DIRECTORY, 'h1');
      expect(service.revert).toHaveBeenNthCalledWith(3, DIRECTORY, 'h3');
    });

    it('点击菜单外部应关闭批量菜单', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, batchHashes);
      vi.runAllTimers();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('git-context-menu')).toBeNull();
    });

    it('batchHashes 只有 1 个时应回退为单提交菜单', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, ['h1']);

      const labels = (Array.from(getMenu().children) as HTMLElement[])
        .filter(el => el.style.height !== '1px')
        .map(el => el.textContent);
      expect(labels).toContain('复制提交哈希');
      expect(labels).not.toContain('已选中 1 个提交');
    });
  });

  describe('内联样式细节', () => {
    it('分支菜单容器、菜单项与分隔线应应用完整内联样式', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      const menu = getMenu();
      expectStyleColor(menu.style.background, '#2d2d2d');
      expect(menu.style.border).toMatch(/^1px solid/);
      expect(menu.style.borderRadius).toBe('4px');
      expect(menu.style.padding).toMatch(/^4px 0(px)?$/);
      expect(menu.style.zIndex).toBe('1000');
      expect(menu.style.minWidth).toBe('160px');
      expect(menu.style.boxShadow).toContain('0 2px 8px');

      const item = findMenuItem(menu, '签出分支')!;
      expect(item.style.padding).toBe('6px 12px');
      expect(item.style.fontSize).toBe('12px');

      const sep = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px') as HTMLElement;
      expect(sep.style.margin).toMatch(/^4px 0(px)?$/);
    });

    it('单提交菜单的菜单项与分隔线应应用默认样式', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      const menu = getMenu();
      const item = findMenuItem(menu, '复制提交哈希')!;
      expect(item.style.padding).toBe('6px 12px');
      expect(item.style.fontSize).toBe('12px');
      expect(item.style.cursor).toBe('pointer');
      expectStyleColor(item.style.color, '#ccc');

      const sep = (Array.from(menu.children) as HTMLElement[]).find(el => el.style.height === '1px') as HTMLElement;
      expectStyleColor(sep.style.background, '#444');
      expect(sep.style.margin).toMatch(/^4px 0(px)?$/);
    });
  });

  describe('失败路径日志', () => {
    it('分支菜单各项操作失败时应打印对应中文错误日志', async () => {
      const err = new Error('模拟服务失败');
      const cases: Array<{ label: string; method: string; message: string }> = [
        { label: '签出分支', method: 'checkoutBranch', message: '[git-manager] 签出分支失败:' },
        { label: '合并到当前分支', method: 'mergeBranch', message: '[git-manager] 合并分支失败:' },
        { label: '变基到此分支', method: 'rebaseBranch', message: '[git-manager] 变基失败:' },
        { label: '拉取', method: 'pull', message: '[git-manager] 拉取失败:' },
        { label: '推送', method: 'push', message: '[git-manager] 推送失败:' },
        { label: '添加收藏', method: 'saveFavorites', message: '[git-manager] 保存收藏失败:' },
        // 删除分支失败走错误 toast 与 [context-menu] JSON 日志，不打印该风格 console.error
      ];

      for (const c of cases) {
        const service = createMockService();
        const failing = vi.fn().mockRejectedValue(err);
        (service as unknown as Record<string, typeof failing>)[c.method] = failing;

        showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
        findMenuItem(getMenu(), c.label)!.click();
        await flush();

        expect(console.error).toHaveBeenCalledWith(c.message, err);
      }
    });

    it('单提交 Cherry-pick 与 Revert 失败时应打印对应错误日志', async () => {
      const err = new Error('模拟操作失败');
      const service = createMockService();
      vi.mocked(service.cherryPick).mockRejectedValue(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), 'Cherry-pick')!.click();
      await flush();
      expect(console.error).toHaveBeenCalledWith('[git-manager] Cherry-pick 失败:', err);

      vi.mocked(service.revert).mockRejectedValue(err);
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '回滚提交')!.click();
      await flush();
      expect(console.error).toHaveBeenCalledWith('[git-manager] Revert 失败:', err);
    });

    it('与本地比较失败时应打印 compare_local_error JSON 日志且不覆盖 diffs', async () => {
      const err = new Error('diff 服务不可用');
      const service = createMockService();
      vi.mocked(service.diffVsLocal).mockRejectedValue(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '与本地比较')!.click();
      await flush();

      // 找到 compare_local_error 的 JSON 日志并解析断言
      const errorSpy = vi.mocked(console.error);
      const jsonCall = errorSpy.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('compare_local_error')
      );
      expect(jsonCall).toBeTruthy();

      const payload = JSON.parse(String(jsonCall![0]));
      expect(payload.prefix).toBe('[context-menu]');
      expect(payload.event).toBe('compare_local_error');
      expect(payload.hash).toBe('abc123');
      expect(String(payload.error)).toContain('diff 服务不可用');
      // 失败时 diffs 保持初始值
      expect(getState().diffs).toEqual([]);
    });

    it('批量复制哈希失败时应打印错误日志', async () => {
      const err = new Error('剪贴板不可用');
      writeTextMock.mockRejectedValue(err);
      const service = createMockService();

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, ['h1', 'h2', 'h3']);
      findMenuItem(getMenu(), '复制哈希列表')!.click();
      await flush();

      expect(console.error).toHaveBeenCalledWith('[git-manager] 复制哈希列表失败:', err);
    });

    it('批量 Cherry-pick 中断时应打印错误并停止后续提交', async () => {
      const err = new Error('cherry-pick 失败');
      const service = createMockService();
      vi.mocked(service.cherryPick)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, ['h1', 'h2', 'h3']);
      findMenuItem(getMenu(), 'Cherry-pick 全部 (3)')!.click();
      await flush();

      expect(console.error).toHaveBeenCalledWith('[git-manager] 批量 Cherry-pick 中断于 h2:', err);
      // 中断后不应继续处理 h3
      expect(service.cherryPick).toHaveBeenCalledTimes(2);
    });

    it('批量 Revert 中断时应打印错误并停止后续提交', async () => {
      const err = new Error('revert 失败');
      const service = createMockService();
      vi.mocked(service.revert)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY, ['h1', 'h2', 'h3']);
      findMenuItem(getMenu(), 'Revert 全部 (3)')!.click();
      await flush();

      expect(console.error).toHaveBeenCalledWith('[git-manager] 批量 Revert 中断于 h2:', err);
      expect(service.revert).toHaveBeenCalledTimes(2);
    });
  });

  describe('悬停与点击委托细节', () => {
    it('分支菜单容器自身不响应悬停高亮与恢复', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      const menu = getMenu();
      menu.dispatchEvent(new MouseEvent('mouseenter'));
      expectStyleColor(menu.style.background, '#2d2d2d');

      menu.dispatchEvent(new MouseEvent('mouseleave'));
      expectStyleColor(menu.style.background, '#2d2d2d');
    });

    it('单提交菜单悬停与移出仅作用于菜单项，容器自身无响应', () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      const menu = getMenu();
      // 容器自身：高亮与恢复都不应生效
      menu.dispatchEvent(new MouseEvent('mouseenter'));
      expectStyleColor(menu.style.background, '#2d2d2d');
      menu.dispatchEvent(new MouseEvent('mouseleave'));
      expectStyleColor(menu.style.background, '#2d2d2d');

      // 菜单项：精确高亮色与恢复
      const item = findMenuItem(menu, '复制提交哈希')!;
      item.dispatchEvent(new MouseEvent('mouseenter'));
      expectStyleColor(item.style.background, '#3a3a3a');
      item.dispatchEvent(new MouseEvent('mouseleave'));
      expect(item.style.background).toBe('transparent');
    });

    it('点击分支菜单项内的嵌套元素不应执行动作或关闭菜单', async () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);

      const menu = getMenu();
      const item = findMenuItem(menu, '合并到当前分支')!;
      const nested = document.createElement('div');
      nested.textContent = '合并到当前分支';
      item.appendChild(nested);

      nested.click();
      await flush();

      expect(service.mergeBranch).not.toHaveBeenCalled();
      expect(document.getElementById('git-context-menu')).toBeTruthy();
    });

    it('点击单提交菜单项内的嵌套元素不应执行动作或关闭菜单', async () => {
      const service = createMockService();
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);

      const menu = getMenu();
      const item = findMenuItem(menu, 'Cherry-pick')!;
      const nested = document.createElement('div');
      nested.textContent = 'Cherry-pick';
      item.appendChild(nested);

      nested.click();
      await flush();

      expect(service.cherryPick).not.toHaveBeenCalled();
      expect(document.getElementById('git-context-menu')).toBeTruthy();
    });

    it('已有菜单时打开单提交菜单应先移除旧菜单', () => {
      const service = createMockService();
      showContextMenu(createContextMenuEvent(), branch, service, DIRECTORY);
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      expect(document.querySelectorAll('#git-context-menu')).toHaveLength(1);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      expect(document.querySelectorAll('#git-context-menu')).toHaveLength(1);
    });
  });

  describe('提交对话框细节', () => {
    /**
     * 打开重置对话框
     * @param service 菜单与对话框共用的服务客户端
     * @returns 对话框遮罩层元素
     */
    async function openResetDialog(service: ServiceClient): Promise<HTMLElement> {
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '将当前分支重置到此处')!.click();
      await flush();
      const overlay = document.body.lastElementChild as HTMLElement;
      expect(overlay).toBeTruthy();
      return overlay;
    }

    /**
     * 打开从提交创建分支对话框
     * @param service 菜单与对话框共用的服务客户端
     * @returns 对话框遮罩层元素
     */
    async function openCreateDialog(service: ServiceClient): Promise<HTMLElement> {
      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '新建分支')!.click();
      await flush();
      const overlay = document.body.lastElementChild as HTMLElement;
      expect(overlay).toBeTruthy();
      return overlay;
    }

    it('点击取消按钮应关闭重置对话框', async () => {
      const overlay = await openResetDialog(createMockService());
      expect(document.getElementById('reset-cancel')).toBeTruthy();

      document.getElementById('reset-cancel')!.click();

      expect(overlay.isConnected).toBe(false);
    });

    it('重置对话框点遮罩层应关闭，点内容区不关闭', async () => {
      const overlay = await openResetDialog(createMockService());

      const title = Array.from(overlay.querySelectorAll('div'))
        .find(el => el.textContent === 'Reset Current Branch to Here');
      expect(title).toBeTruthy();
      title!.click();
      expect(document.getElementById('reset-ok')).toBeTruthy();

      overlay.click();
      expect(document.getElementById('reset-ok')).toBeNull();
    });

    it('执行重置失败时应打印错误日志', async () => {
      const err = new Error('reset 失败');
      const service = createMockService();
      vi.mocked(service.reset).mockRejectedValue(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '将当前分支重置到此处')!.click();
      await flush();

      document.getElementById('reset-ok')!.click();
      await flush();

      expect(console.error).toHaveBeenCalledWith('[git-manager] Reset 失败:', err);
      expect(document.getElementById('reset-ok')).toBeNull();
    });

    it('打开创建分支对话框应自动聚焦名称输入框', async () => {
      await openCreateDialog(createMockService());
      const input = document.getElementById('new-branch-from-commit') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(document.activeElement).toBe(input);
    });

    it('点击取消按钮应关闭创建分支对话框', async () => {
      const overlay = await openCreateDialog(createMockService());
      expect(document.getElementById('branch-cancel')).toBeTruthy();

      document.getElementById('branch-cancel')!.click();

      expect(overlay.isConnected).toBe(false);
    });

    it('创建分支对话框点遮罩层应关闭，点内容区不关闭', async () => {
      const overlay = await openCreateDialog(createMockService());

      const title = Array.from(overlay.querySelectorAll('div'))
        .find(el => el.textContent === '从提交创建分支');
      expect(title).toBeTruthy();
      title!.click();
      expect(document.getElementById('new-branch-from-commit')).toBeTruthy();

      overlay.click();
      expect(document.getElementById('new-branch-from-commit')).toBeNull();
    });

    it('分支名为空或纯空白时点创建不应调用服务', async () => {
      const service = createMockService();
      await openCreateDialog(service);

      const input = document.getElementById('new-branch-from-commit') as HTMLInputElement;
      const okButton = document.getElementById('branch-ok')!;

      input.value = '   ';
      okButton.click();
      await flush();
      expect(service.checkoutNewBranch).not.toHaveBeenCalled();
      expect(document.getElementById('new-branch-from-commit')).toBeTruthy();

      input.value = '';
      okButton.click();
      await flush();
      expect(service.checkoutNewBranch).not.toHaveBeenCalled();
      expect(document.getElementById('new-branch-from-commit')).toBeTruthy();
    });

    it('创建分支失败时应打印错误日志', async () => {
      const err = new Error('创建分支失败');
      const service = createMockService();
      vi.mocked(service.checkoutNewBranch).mockRejectedValue(err);

      showCommitContextMenu(createContextMenuEvent(), createCommit(), service, DIRECTORY);
      findMenuItem(getMenu(), '新建分支')!.click();
      await flush();

      const input = document.getElementById('new-branch-from-commit') as HTMLInputElement;
      input.value = 'feature/fail';
      document.getElementById('branch-ok')!.click();
      await flush();

      expect(console.error).toHaveBeenCalledWith('[git-manager] 创建分支失败:', err);
      expect(document.getElementById('new-branch-from-commit')).toBeNull();
    });

    it('回车键可创建分支，其它按键不触发', async () => {
      const service = createMockService();
      await openCreateDialog(service);

      const input = document.getElementById('new-branch-from-commit') as HTMLInputElement;
      input.value = 'feature/enter';

      // 非 Enter 按键：不创建、对话框保持打开
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(service.checkoutNewBranch).not.toHaveBeenCalled();
      expect(document.getElementById('new-branch-from-commit')).toBeTruthy();

      // Enter 按键：创建分支并关闭对话框
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush();
      expect(service.checkoutNewBranch).toHaveBeenCalledWith(DIRECTORY, 'feature/enter');
      expect(document.getElementById('new-branch-from-commit')).toBeNull();
    });
  });
});
