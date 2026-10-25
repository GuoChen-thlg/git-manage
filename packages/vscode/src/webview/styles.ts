/**
 * 面板样式
 * 采用 VS Code 主题变量，跟随用户当前主题自动适配明暗。
 */

export const PANEL_CSS = `
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; height: 100%; overflow: hidden;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}
/* 上下布局：内容区 + 底部页签 */
#app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
#content { display: flex; flex: 1; overflow: hidden; min-height: 0; }
#bottom {
  flex-shrink: 0; display: flex; flex-direction: column;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
  max-height: 45vh;
}
#bottom-tabs { display: flex; flex-shrink: 0; }
#bottom-tabs .tab {
  padding: 4px 14px; font-size: 11px; cursor: pointer;
  color: var(--vscode-descriptionForeground);
  border-right: 1px solid var(--vscode-panel-border);
}
#bottom-tabs .tab.active {
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  border-bottom: 2px solid var(--vscode-focusBorder);
}
#bottom-body { flex: 1; overflow: auto; min-height: 0; display: none; }
#bottom-body.open { display: block; }

/* 左侧图标列（对齐现有面板 40px 宽） */
#sidebar {
  width: 40px; min-width: 40px; display: flex; flex-direction: column;
  align-items: center; padding: 4px 0; gap: 2px;
  background: var(--vscode-sideBar-background);
  border-right: 1px solid var(--vscode-panel-border);
  overflow-y: auto;
}
.icon-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 3px; cursor: pointer; border: none; background: transparent;
  color: var(--vscode-icon-foreground); padding: 0;
}
.icon-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
.icon-btn.active { background: var(--vscode-toolbar-activeBackground); }
.icon-btn[disabled] { opacity: 0.4; cursor: default; }
.icon-btn svg { width: 16px; height: 16px; }

/* 中间列：工具栏 + 提交列表 */
#center { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* 顶部工具栏 */
#toolbar {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
  flex-shrink: 0; flex-wrap: wrap;
}
#toolbar input[type="text"] {
  padding: 3px 6px; background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px; font-size: 12px; outline: none; min-width: 140px;
}
/* 正则语法错误时高亮，避免用户误以为「搜不到」是没数据 */
#toolbar input.invalid {
  border-color: var(--vscode-inputValidation-errorBorder);
  background: var(--vscode-inputValidation-errorBackground, var(--vscode-input-background));
}
#toolbar .tb-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; font-size: 11px; cursor: pointer;
  background: transparent; color: var(--vscode-foreground);
  border: 1px solid var(--vscode-panel-border); border-radius: 3px;
}
#toolbar .tb-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
#toolbar .tb-btn.active {
  background: var(--vscode-toolbar-activeBackground);
  border-color: var(--vscode-focusBorder);
}
#toolbar .tb-sep { width: 1px; height: 16px; background: var(--vscode-panel-border); margin: 0 2px; }

/* 分区通用 */
#branches, #commits, #detail {
  display: flex; flex-direction: column;
  overflow: hidden; min-width: 0;
}
#branches { width: 240px; min-width: 180px; border-right: 1px solid var(--vscode-panel-border); }
#commits { flex: 1; border-right: 1px solid var(--vscode-panel-border); }
#detail { width: 360px; min-width: 240px; }

/* 分区标题 */
.section-title {
  padding: 6px 10px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--vscode-descriptionForeground);
  border-bottom: 1px solid var(--vscode-panel-border);
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
}
.section-title .spacer { flex: 1; }
.section-title button {
  background: transparent; border: none; cursor: pointer;
  color: var(--vscode-foreground); padding: 2px 6px; border-radius: 3px;
  font-size: 11px;
}
.section-title button:hover { background: var(--vscode-toolbar-hoverBackground); }

/* 列表容器 */
.list { flex: 1; overflow-y: auto; overflow-x: hidden; }

/* 分支项 */
.group-header {
  padding: 4px 10px; font-size: 11px; font-weight: 600;
  color: var(--vscode-descriptionForeground);
  cursor: pointer; user-select: none;
}
.group-header:hover { background: var(--vscode-list-hoverBackground); }
.branch-item {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 10px 3px 22px; cursor: pointer;
  font-size: 12px; white-space: nowrap;
}
.branch-item:hover { background: var(--vscode-list-hoverBackground); }
.branch-item.selected {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}
.branch-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.branch-item.current .name { font-weight: 600; }
.branch-item .dot { color: var(--vscode-charts-green); font-size: 10px; }
.branch-item .star {
  font-size: 11px; color: var(--vscode-descriptionForeground);
  cursor: pointer; flex-shrink: 0; width: 12px; text-align: center;
}
.branch-item .star.on { color: var(--vscode-charts-yellow, #e2c08d); }

/* 分支搜索框 */
.branch-search { padding: 4px 6px; border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0; }
.branch-search input {
  width: 100%; padding: 3px 6px; font-size: 12px;
  background: var(--vscode-input-background); color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; outline: none;
}

/* 提交项 */
.commit-item {
  display: flex;
  gap: 8px; align-items: center;
  padding: 3px 10px; cursor: pointer; font-size: 12px;
  /* 行内不允许溢出，否则标题会被推到可视区域外 */
  overflow: hidden; min-width: 0;
}
.commit-item .graph { flex: 0 0 auto; display: flex; align-items: center; width: 40px; }
.commit-item .hash {
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
  flex: 0 0 auto;
}
.commit-item:hover { background: var(--vscode-list-hoverBackground); }
.commit-item.selected {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}
/* 标题占用剩余空间并可收缩，空间不足时省略而不是溢出 */
.commit-item .msg {
  flex: 1 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* 日期与作者空间不足时让位给标题，并各自省略 */
.commit-item .meta {
  color: var(--vscode-descriptionForeground); font-size: 11px;
  flex: 0 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 110px;
}

/* 详情 */
.detail-body { flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; }
.detail-body .field { margin-bottom: 6px; word-break: break-word; }
.detail-body .label { color: var(--vscode-descriptionForeground); margin-right: 6px; }
.detail-body .message { white-space: pre-wrap; margin-bottom: 10px; }

/* 文件差异 */
.file-row {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 6px; cursor: pointer; font-size: 12px;
  border-radius: 3px;
}
.file-row:hover { background: var(--vscode-list-hoverBackground); }
.file-row .path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-row .stat { font-size: 11px; }
.file-row .arrow { width: 10px; color: var(--vscode-descriptionForeground); flex-shrink: 0; }

/* 差异内容 */
.diff-box { margin-top: 4px; }
.diff-lines {
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size, 12px);
  margin: 2px 0 8px 0;
  border-left: 2px solid var(--vscode-panel-border);
  overflow-x: auto;
}
/* 行宽需随最长内容增长，否则横向滚动时背景色只覆盖容器宽度那一截 */
.diff-line {
  display: grid;
  grid-template-columns: 34px 34px minmax(0, 1fr);
  white-space: pre;
  /* 至少撑满容器，内容更宽时由内部 code 撑开整行 */
  min-width: 100%;
  width: max-content;
}
.diff-line .ln {
  color: var(--vscode-editorLineNumber-foreground);
  text-align: right; padding-right: 6px; user-select: none;
}
.diff-line .code { padding-left: 6px; }
.diff-line.add { background: var(--vscode-diffEditor-insertedLineBackground, rgba(155,185,85,0.2)); }
.diff-line.delete { background: var(--vscode-diffEditor-removedLineBackground, rgba(255,0,0,0.2)); }
.diff-line.context { color: var(--vscode-foreground); }

/* 空态与错误 */
.empty, .error {
  padding: 16px 12px; font-size: 12px;
  color: var(--vscode-descriptionForeground); text-align: center;
}
.error { color: var(--vscode-errorForeground); }

/* 提示条 */
#toast {
  position: fixed; right: 16px; bottom: 16px; max-width: 420px;
  padding: 8px 12px; border-radius: 4px; font-size: 12px;
  background: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-notifications-border);
  color: var(--vscode-notifications-foreground);
  display: none; white-space: pre-wrap;
}
#toast.show { display: block; }
#toast.error { border-color: var(--vscode-errorForeground); }

/* 控制台命令日志 */
.cmd-list { font-family: var(--vscode-editor-font-family); font-size: 12px; }
.cmd-row {
  display: grid; grid-template-columns: 18px 1fr auto;
  gap: 8px; padding: 2px 10px; align-items: baseline;
}
.cmd-row:hover { background: var(--vscode-list-hoverBackground); }
.cmd-status { color: var(--vscode-charts-green); }
.cmd-status.fail { color: var(--vscode-errorForeground); }
.cmd-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmd-meta { color: var(--vscode-descriptionForeground); font-size: 11px; }

/* Worktrees */
.wt-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 10px; font-size: 12px;
}
.wt-row:hover { background: var(--vscode-list-hoverBackground); }
.wt-path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wt-branch { color: var(--vscode-charts-blue, #589df6); font-size: 11px; }
.wt-main { color: var(--vscode-descriptionForeground); font-size: 11px; }
.wt-row button {
  padding: 1px 8px; font-size: 11px; cursor: pointer;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none; border-radius: 3px;
}


/* 内置对话框：Webview 中原生 prompt/confirm 不可用，改用自绘 */
.dlg-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}
.dlg-box {
  min-width: 300px; max-width: 460px; padding: 14px 16px;
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.dlg-message {
  font-size: 12px; margin-bottom: 10px;
  color: var(--vscode-foreground); white-space: pre-wrap; word-break: break-word;
}
.dlg-input {
  width: 100%; padding: 4px 8px; margin-bottom: 12px; font-size: 12px;
  background: var(--vscode-input-background); color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
  border-radius: 3px; outline: none;
}
.dlg-input:focus { border-color: var(--vscode-focusBorder); }
.dlg-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dlg-btn {
  padding: 4px 14px; font-size: 12px; cursor: pointer; border-radius: 3px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid transparent;
}
.dlg-btn.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}
.dlg-btn:hover { filter: brightness(1.15); }

/* 工具栏下拉菜单（与 OpenChamber 的工具栏下拉一致） */
.dd-menu {
  position: fixed; z-index: 100; min-width: 160px; max-height: 60vh; overflow-y: auto;
  padding: 4px 0;
  background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
  color: var(--vscode-menu-foreground, var(--vscode-foreground));
  border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border));
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  font-size: 12px;
}
.dd-item {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px 4px 4px; cursor: pointer; white-space: nowrap;
}
.dd-item:hover { background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground)); }
.dd-item.disabled { opacity: 0.45; cursor: default; }
.dd-check { width: 14px; text-align: center; flex-shrink: 0; }
.dd-label { overflow: hidden; text-overflow: ellipsis; }
.dd-sep { height: 1px; background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border)); margin: 4px 0; }
.dd-group {
  padding: 4px 10px; font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

/* 对话框：字段与日期选择 */
.dlg-field { margin-bottom: 10px; }
.dlg-field-label {
  font-size: 11px; margin-bottom: 4px;
  color: var(--vscode-descriptionForeground);
}
.dlg-date {
  width: 100%; padding: 4px 8px; font-size: 12px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
  border-radius: 3px;
  /* 让内置日历图标在深色主题下可见 */
  color-scheme: dark light;
}
.dlg-hint {
  font-size: 11px; min-height: 14px;
  color: var(--vscode-descriptionForeground);
}
.dlg-box.wide { min-width: 420px; }

/* 路径树 */
.ptree {
  height: 260px; overflow: auto; margin-bottom: 8px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
  border-radius: 3px;
  padding: 4px 0;
  font-size: 12px;
}
.ptree-row {
  display: flex; align-items: center; gap: 4px;
  padding: 2px 8px; cursor: pointer; white-space: nowrap;
}
.ptree-row:hover { background: var(--vscode-list-hoverBackground); }
.ptree-arrow { width: 12px; flex-shrink: 0; color: var(--vscode-descriptionForeground); }
.ptree-check { width: 14px; flex-shrink: 0; text-align: center; }
.ptree-name { overflow: hidden; text-overflow: ellipsis; }
.ptree-name.dir { font-weight: 600; }
`;
