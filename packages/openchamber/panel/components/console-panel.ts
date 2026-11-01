/**
 * 控制台面板
 * 展示扩展自身执行过的 git 命令日志（命令、耗时、退出码、输出）。
 *
 * 能力边界：本扩展的 git 命令由 service 进程通过 execFile 直接执行，
 * 不经过宿主 shell 体系，因此订阅宿主 shell 看不到这些命令，
 * 改由 core 层在 gitExec 中记录环形缓冲、面板定时轮询增量。
 */

import { html } from '../html';
import { t } from '../i18n';
import type { GitCommandLogEntry, ServiceClient } from '../service';
import { mountButton, type ButtonHandle } from '@openchamber/sdk/ui';

/** 单次轮询窗口大小 */
const POLL_INTERVAL_MS = 1000;

/** 面板句柄 */
export interface ConsolePanelHandle {
  /** 释放定时器 */
  dispose: () => void;
}

/**
 * 格式化时间戳为本地时分秒
 * @param ts 毫秒时间戳
 * @returns 展示文本
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/**
 * 创建控制台面板
 * @param container 挂载容器
 * @param service service 客户端
 * @param directory 仓库目录；为空则展示所有仓库的命令
 * @returns 面板句柄
 */
export function createConsolePanel(
  container: HTMLElement,
  service: ServiceClient,
  directory: string,
): ConsolePanelHandle {
  let disposed = false;
  /** 定时轮询器 */
  let pollTimer: number | null = null;
  /** 已拉取到的最大日志 id，用于增量拉取 */
  let lastId = 0;
  /** 当前展示的日志（旧→新） */
  let entries: GitCommandLogEntry[] = [];
  /** 当前展开查看输出的日志 id */
  let selectedId: number | null = null;

  container.innerHTML = '';
  // 不覆盖容器尺寸：由调用方控制，面板自身占满下层
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.minHeight = '0';

  const header = html`
    <div class="gm-console-header">
      <span data-log-count>0</span>
      <span>${t('console.commandCount')}</span>
      <span class="gm-console-header-spacer"></span>
      <div data-log-clear class="gm-console-clear-slot"></div>
    </div>
  `;
  container.appendChild(header);

  const body = html`
    <div class="gm-console-body"></div>
  `;
  container.appendChild(body);

  // 左侧：命令列表
  const listEl = html`
    <div data-log-list class="gm-console-list"></div>
  `;
  body.appendChild(listEl);

  // 右侧：选中命令的完整输出
  const outputEl = html`
    <div data-log-output class="gm-console-output"></div>
  `;
  body.appendChild(outputEl);

  const countEl = header.querySelector('[data-log-count]') as HTMLElement;

  /**
   * 渲染左侧命令列表
   */
  const renderList = (): void => {
    countEl.textContent = String(entries.length);
    listEl.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gm-console-empty';
      empty.textContent = t('console.noCommands');
      listEl.appendChild(empty);
      return;
    }

    // 新命令在顶部，便于直接看到最近一次操作
    for (const entry of [...entries].reverse()) {
      const row = document.createElement('div');
      row.dataset.logId = String(entry.id);
      // 主题/几何走 class；选中态由 class 承载，失败态文字色走 gm-console-row-fail
      row.className = 'gm-console-row'
        + (selectedId === entry.id ? ' gm-console-row-selected' : '')
        + (entry.ok ? '' : ' gm-console-row-fail');

      const cmd = document.createElement('div');
      cmd.className = 'gm-console-cmd';
      cmd.textContent = entry.command;
      cmd.title = entry.command;
      row.appendChild(cmd);

      const meta = document.createElement('div');
      meta.className = 'gm-console-meta';
      meta.textContent = `${formatTime(entry.startedAt)} · ${entry.durationMs}ms · ${entry.ok ? '0' : entry.exitCode}`;
      row.appendChild(meta);

      row.addEventListener('click', () => {
        selectedId = entry.id;
        renderList();
        renderOutput();
      });

      listEl.appendChild(row);
    }
  };

  /**
   * 渲染右侧选中命令的输出
   */
  const renderOutput = (): void => {
    if (selectedId === null) {
      outputEl.textContent = t('console.selectCommand');
      return;
    }
    const entry = entries.find(e => e.id === selectedId);
    if (!entry) {
      outputEl.textContent = t('console.selectCommand');
      return;
    }
    const parts = [`$ ${entry.command}`, `# ${entry.cwd}`, ''];
    if (entry.stdout) parts.push(entry.stdout);
    if (entry.stderr) parts.push(entry.stderr);
    if (!entry.stdout && !entry.stderr) parts.push(t('console.noOutput'));
    outputEl.textContent = parts.join('\n');
  };

  /**
   * 拉取增量日志
   */
  const refresh = async (): Promise<void> => {
    if (disposed) return;
    try {
      const logs = await service.getCommandLogs(directory, lastId);
      if (disposed) return;
      if (logs.length > 0) {
        lastId = Math.max(lastId, ...logs.map(l => l.id));
        entries = [...entries, ...logs];
        // 保持缓冲上限与 core 一致，避免长时间运行无限增长
        if (entries.length > 200) entries = entries.slice(-200);
        renderList();
        // 未选中任何命令时自动选中最新一条，避免右侧空白
        if (selectedId === null) selectedId = entries[entries.length - 1]!.id;
        renderOutput();
        console.debug(JSON.stringify({
          prefix: '[console]',
          event: 'logs_loaded',
          added: logs.length,
          total: entries.length,
        }));
      }
    } catch (err) {
      if (disposed) return;
      console.error(JSON.stringify({ prefix: '[console]', event: 'load_error', error: String(err) }));
      outputEl.textContent = `${t('console.loadFailed')}: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  // 清空按钮改用 SDK UI Kit（handle 纳入 dispose 流程）
  let clearHandle: ButtonHandle | null = null;
  clearHandle = mountButton(header.querySelector('[data-log-clear]') as HTMLElement, {
    label: t('console.clear'),
    variant: 'secondary',
    size: 'sm',
    onClick: () => {
      // 清空日志（同时清 service 端缓冲，否则下一轮又会拉回来）
      void (async () => {
        try {
          await service.clearCommandLogs(directory);
          entries = [];
          selectedId = null;
          renderList();
          renderOutput();
        } catch (err) {
          console.error(JSON.stringify({ prefix: '[console]', event: 'clear_error', error: String(err) }));
        }
      })();
    },
  });

  // 首屏拉全量，之后每秒拉增量（git 命令没有推送通道）
  void refresh().then(() => {
    if (disposed) return;
    pollTimer = window.setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
  });

  renderList();
  renderOutput();

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = null;
      clearHandle?.dispose();
      clearHandle = null;
      container.innerHTML = '';
    },
  };
}
