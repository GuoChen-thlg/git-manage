"use strict";
(() => {
  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/ui/dom.js
  var STYLE_ID = "oc-sdk-ui-style";
  var ensureStyle = (css) => {
    const existing = document.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== css) {
        existing.textContent = css;
      }
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  };
  var el = (tag, className) => {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  };
  var button = (className) => {
    const node = el("button", className);
    node.type = "button";
    return node;
  };
  var setText = (node, text) => {
    const next = text ?? "";
    if (node.textContent !== next) {
      node.textContent = next;
    }
  };

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/scrollbar-style.js
  var GUEST_SCROLLBAR_CSS = `
:root {
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 40%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 65%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  * { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  :root::-webkit-scrollbar, body::-webkit-scrollbar { background: var(--oc-bg, inherit); }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--oc-scrollbar-thumb);
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  * { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/ui/style.js
  var OC_ALIAS = {
    "surface-background": "bg",
    "surface-elevated": "elevated",
    "surface-elevated-foreground": "elevated-fg",
    "surface-foreground": "fg",
    "surface-muted-foreground": "muted",
    "surface-muted": "muted-surface",
    "surface-subtle": "subtle",
    "interactive-border": "border",
    "interactive-hover": "hover",
    "interactive-active": "active",
    "interactive-selection": "selection",
    "interactive-selection-foreground": "selection-fg",
    "interactive-focus-ring": "focus",
    "primary": "primary",
    "primary-foreground": "primary-fg",
    "primary-text": "primary-text",
    "success-text": "success-text",
    "warning-text": "warning-text",
    "error-text": "error-text",
    "info-text": "info-text",
    "status-success": "success",
    "status-warning": "warning",
    "status-error": "error",
    "status-info": "info",
    "font-sans": "font",
    "font-mono": "mono",
    "radius": "radius"
  };
  var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
  var bg = v("surface-background", "transparent");
  var elevated = v("surface-elevated", "transparent");
  var elevatedFg = v("surface-elevated-foreground", "inherit");
  var fg = v("surface-foreground", "inherit");
  var muted = v("surface-muted-foreground", "gray");
  var secondary = v("surface-muted", "transparent");
  var border = v("interactive-border", "currentColor");
  var hover = v("interactive-hover", "transparent");
  var active = v("interactive-active", "transparent");
  var selection = v("interactive-selection", "transparent");
  var selectionFg = v("interactive-selection-foreground", "inherit");
  var focus = v("interactive-focus-ring", "currentColor");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusRing = `box-shadow: 0 0 0 2px ${focus};`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
.oc-sdk { box-sizing: border-box; color: ${fg}; font-family: ${font}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${focusRing} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${radius}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: ${elevated}; color: ${elevatedFg}; border-color: ${border}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${radius}; background: ${elevated}; color: ${elevatedFg}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${mix(border, 60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${focus}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${v("status-error", "red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${v("status-error", "red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${muted}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${border}; border-radius: 6px; background: ${elevated}; color: ${elevatedFg}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${muted}; }
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${mix(border, 60)}; border-radius: 12px; background: ${elevated}; color: ${elevatedFg}; box-shadow: 0 8px 24px ${mix(fg, 12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
.oc-sdk-option[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${border}; border-radius: 4px; color: ${primary}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(primary, 65, border)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusRing} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${muted}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${muted}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${hover}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${mono}; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${border}; border-top-color: ${primary}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${mix("var(--oc-sdk-tone)", 40)}; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${mix(border, 40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${muted}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${border}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/ui/button.js
  var ring = () => {
    const spinner = document.createElement("span");
    spinner.className = "oc-sdk-spinner-ring";
    spinner.setAttribute("aria-hidden", "true");
    return spinner;
  };
  var mountButton = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = button("oc-sdk oc-sdk-btn");
    const spinner = ring();
    const label = document.createElement("span");
    node.append(label);
    root2.append(node);
    const paint = () => {
      node.dataset.variant = props.variant ?? "default";
      node.dataset.size = props.size ?? "default";
      node.disabled = Boolean(props.disabled) || Boolean(props.loading);
      node.dataset.loading = props.loading ? "true" : "false";
      node.setAttribute("aria-busy", props.loading ? "true" : "false");
      if (props.loading && spinner.parentNode !== node) {
        node.prepend(spinner);
      } else if (!props.loading && spinner.parentNode === node) {
        spinner.remove();
      }
      setText(label, props.label);
    };
    const onClick = () => {
      if (props.disabled || props.loading) {
        return;
      }
      props.onClick();
    };
    node.addEventListener("click", onClick);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.removeEventListener("click", onClick);
        node.remove();
      }
    };
  };

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/ui/empty.js
  var mountEmpty = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const shell = el("div", "oc-sdk oc-sdk-empty");
    const title = el("h2", "oc-sdk-empty-title");
    const body = el("p", "oc-sdk-empty-body");
    const slot = el("div", "oc-sdk-empty-action");
    shell.append(title, body, slot);
    root2.append(shell);
    let action = null;
    const paint = () => {
      setText(title, props.title);
      setText(body, props.body);
      body.hidden = !props.body;
      slot.hidden = !props.action;
      if (!props.action) {
        action?.dispose();
        action = null;
        return;
      }
      const next = { label: props.action.label, onClick: props.action.onClick };
      if (action) {
        action.update(next);
      } else {
        action = mountButton(slot, { ...next, variant: "outline", size: "sm" });
      }
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        action?.dispose();
        action = null;
        shell.remove();
      }
    };
  };

  // panel/html.ts
  function html(strings, ...values) {
    const parts = [];
    const domElements = [];
    for (let i = 0; i < strings.length; i++) {
      parts.push(strings[i]);
      if (i < values.length) {
        const value = values[i];
        if (value == null || value === false) {
        } else if (typeof value === "string") {
          if (value.startsWith("<")) {
            parts.push(value);
          } else {
            parts.push(escapeHTML(value));
          }
        } else if (typeof value === "number") {
          parts.push(String(value));
        } else if (typeof value === "boolean") {
          parts.push(value ? "true" : "");
        } else if (Array.isArray(value)) {
          const arrElements = [];
          for (const item of value) {
            if (item instanceof HTMLElement || item instanceof SVGElement) {
              arrElements.push(item);
              parts.push(`<!--m-${domElements.length}-${arrElements.length - 1}-->`);
            } else {
              parts.push(String(item ?? ""));
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
    const rawHTML = parts.join("");
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);
    try {
      container.innerHTML = rawHTML;
      const root2 = container.firstElementChild;
      if (!root2) {
        throw new Error("\u65E0\u6CD5\u89E3\u6790 HTML \u6A21\u677F");
      }
      const walker = document.createTreeWalker(root2, NodeFilter.SHOW_COMMENT, null);
      const comments = [];
      let node;
      while (node = walker.nextNode()) {
        comments.push(node);
      }
      for (const comment of comments) {
        const text = comment.textContent || "";
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
      return root2;
    } finally {
      document.body.removeChild(container);
    }
  }
  function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
  var GUEST_TOAST_MAX = 500;
  var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
  var GUEST_COMPOSE_TEXT_MAX = 16e3;
  var GUEST_ATTACH_ID_MAX = 128;
  var GUEST_ATTACH_TITLE_MAX = 200;
  var GUEST_ATTACH_URL_MAX = 2e3;
  var GUEST_ATTACH_TEXT_MAX = 16e3;
  var GUEST_ATTACH_AUTHOR_MAX = 80;
  var GUEST_ATTACH_BRANCH_MAX = 200;
  var GUEST_ATTACH_DATA_MAX = 16e3;
  var GUEST_REQUEST_PATH_MAX = 2e3;
  var GUEST_REQUEST_TIMEOUT_MS = 2e4;
  var GUEST_FILE_PATH_MAX = 1024;
  var GUEST_FILE_CONTENT_MAX = 2e6;
  var GUEST_GENERATE_PROMPT_MAX = 64e3;
  var GUEST_GENERATE_SYSTEM_MAX = 8e3;
  var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
  var GUEST_GENERATE_TIMEOUT_MS = 9e4;
  var GUEST_BADGE_MAX = 999;
  var GUEST_RESOLVE_ERROR_MAX = 500;
  var HOST_REQUEST_ERROR_CODES = [
    "HOST_UNAVAILABLE",
    "HOST_TIMEOUT",
    "HOST_REJECTED",
    "DISCONNECTED",
    "DISABLED",
    "BAD_PATH",
    "NO_INTEGRATION",
    "NO_SERVICE",
    "SERVICE_FAILED",
    "NO_SESSION",
    "SESSION_BUSY",
    "NOT_GRANTED",
    "NO_DIRECTORY",
    "NOT_FOUND",
    "FILE_TOO_LARGE",
    "DENIED",
    "NO_MODEL",
    "MODEL_FAILED"
  ];
  var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
  var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
  var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
  var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
  var isJsonValue = (value) => {
    if (value === void 0)
      return false;
    if (value === null || value === true || value === false)
      return true;
    if (String(value) === value)
      return true;
    if (Number(value) === value)
      return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(isJsonValue);
    if (Object(value) === value)
      return Object.values(value).every(isJsonValue);
    return false;
  };
  var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= GUEST_ATTACH_DATA_MAX;
  var clampBranch = (value) => value?.trim().slice(0, GUEST_ATTACH_BRANCH_MAX) ?? "";
  var clampAttachRequest = (request) => {
    const id = request.id.trim().slice(0, GUEST_ATTACH_ID_MAX);
    const title = request.title.trim().slice(0, GUEST_ATTACH_TITLE_MAX);
    const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
    const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text) {
      next.text = text;
    }
    if (author) {
      next.author = author;
    }
    if (kind === "pull") {
      const head = clampBranch(request.branches?.head);
      const base = clampBranch(request.branches?.base);
      if (head && base) {
        next.branches = { head, base };
      }
    }
    if (isAttachData(request.data)) {
      next.data = request.data;
    }
    return next;
  };
  var clampStartSessionRequest = (request) => {
    const next = clampAttachRequest(request);
    if (request.projectId)
      next.projectId = request.projectId;
    if (request.navigation)
      next.navigation = request.navigation;
    if (request.worktree) {
      next.worktree = request.worktree;
    }
    return next;
  };
  var clampPromptRequest = (request) => {
    const next = {
      text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX)
    };
    if (request.send) {
      next.send = true;
    }
    return next;
  };
  var clampBadgeCount = (count) => {
    if (count === null || !Number.isFinite(count))
      return null;
    return Math.min(GUEST_BADGE_MAX, Math.max(0, Math.round(count)));
  };
  var isGuestFilePath = (value) => value.length > 0 && value.length <= GUEST_FILE_PATH_MAX && !value.includes("\0") && !value.includes("\\");
  var isGuestRequestPath = (value) => {
    if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) {
      return false;
    }
    if (value.length > GUEST_REQUEST_PATH_MAX) {
      return false;
    }
    const segments = value.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  };
  var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
  var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
  var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
  var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
  var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
  var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
  var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
  var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
  var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
  var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
    "workspace",
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action"
  ]);
  var asWireRecord = (data) => Object(data) === data ? data : null;
  var isNonEmptyString = (value) => String(value) === value && value.length > 0;
  var readResultMessage = (wire) => {
    if (!isNonEmptyString(wire.id))
      return null;
    if (wire.ok === true) {
      const message = {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: true
      };
      if (Object(wire.payload) === wire.payload) {
        message.payload = wire.payload;
      }
      return message;
    }
    if (wire.ok === false && isNonEmptyString(wire.error)) {
      return {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: false,
        error: wire.error,
        code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
      };
    }
    return null;
  };
  var readHostMessage = (data) => {
    const wire = asWireRecord(data);
    if (!wire || wire.channel !== OPENCHAMBER_SDK_CHANNEL || wire.v !== OPENCHAMBER_SDK_API_VERSION)
      return null;
    if (wire.type === "result")
      return readResultMessage(wire);
    if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload)
      return null;
    return wire;
  };

  // ../../node_modules/.pnpm/@openchamber+sdk@1.24.1/node_modules/@openchamber/sdk/dist/host.js
  var HostRequestError = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "HostRequestError";
      this.code = code;
    }
  };
  var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", 'Request path must start with "/" and stay on the declared origin.'));
  var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options = {}) => {
    const target = options.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    let resolveHandler = null;
    let actionHandler = null;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    let disposed = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
    const lifecycleFromSession = (session) => {
      if (!session)
        return null;
      return {
        sessionId: session.id,
        phase: session.busy ? "started" : "completed"
      };
    };
    const post = (message) => {
      target.parent.postMessage(message, "*");
    };
    const emit = (listeners, value) => {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const onMessage = (event) => {
      if (!(event instanceof MessageEvent))
        return;
      if (!acceptSource(event.source))
        return;
      const message = readHostMessage(event.data);
      if (!message)
        return;
      if (message.type === "workspace") {
        const listener = workspaceListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "ready") {
        lastReady = message.payload;
        lastLifecycle = lifecycleFromSession(message.payload.session);
        emit(readyListeners, message.payload);
        emit(directoryListeners, message.payload.directory);
        emit(sessionListeners, message.payload.session);
        if (lastLifecycle) {
          emit(lifecycleListeners, lastLifecycle);
        }
        emit(connectionListeners, message.payload.connection);
        emit(settingsListeners, message.payload.settings);
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "directory") {
        if (lastReady) {
          lastReady = { ...lastReady, directory: message.payload.directory };
        }
        emit(directoryListeners, message.payload.directory);
        return;
      }
      if (message.type === "session") {
        if (lastReady) {
          lastReady = { ...lastReady, session: message.payload.session };
        }
        if (!message.payload.session) {
          lastLifecycle = null;
        } else if (lastLifecycle?.sessionId !== message.payload.session.id) {
          lastLifecycle = lifecycleFromSession(message.payload.session);
        }
        emit(sessionListeners, message.payload.session);
        return;
      }
      if (message.type === "session-lifecycle") {
        lastLifecycle = message.payload;
        emit(lifecycleListeners, message.payload);
        return;
      }
      if (message.type === "connection") {
        if (lastReady) {
          lastReady = { ...lastReady, connection: message.payload.connection };
        }
        emit(connectionListeners, message.payload.connection);
        return;
      }
      if (message.type === "settings") {
        if (lastReady) {
          lastReady = { ...lastReady, settings: message.payload.settings };
        }
        emit(settingsListeners, message.payload.settings);
        return;
      }
      if (message.type === "item") {
        if (lastReady) {
          lastReady = { ...lastReady, item: message.payload.item };
        }
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "action-result",
              id: message.id,
              payload
            });
        };
        const handler = actionHandler;
        if (!handler) {
          answer({ ok: false, error: "This extension does not handle background actions." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      if (message.type === "resolve") {
        const answer = (payload) => {
          post({
            channel: OPENCHAMBER_SDK_CHANNEL,
            v: OPENCHAMBER_SDK_API_VERSION,
            type: "resolve-result",
            id: message.id,
            payload
          });
        };
        const handler = resolveHandler;
        if (!handler) {
          answer({ error: "This extension does not resolve commands." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      const waiter = pending.get(message.id);
      if (!waiter)
        return;
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.ok) {
        waiter.resolve(message.payload);
        return;
      }
      waiter.reject(new HostRequestError(message.code, message.error));
    };
    target.addEventListener("message", onMessage);
    post({
      channel: OPENCHAMBER_SDK_CHANNEL,
      v: OPENCHAMBER_SDK_API_VERSION,
      type: "hello"
    });
    const send = (message, timeoutMs = requestTimeoutMs) => {
      if (disposed || target.parent === target) {
        return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(message.id);
          reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
        }, timeoutMs);
        pending.set(message.id, { resolve, reject, timer });
        post(message);
      });
    };
    const request = (message) => send(message).then(() => void 0);
    const envelope = { channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION };
    const requireIdentity = (value, maximum = 1024) => {
      if (!value.trim() || value.length > maximum)
        throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
    };
    const readWorkspace = async (query) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const result = await send({ ...envelope, type: "workspace-read", id: nextId(ids), payload: query });
      if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) {
        throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
      }
      return result;
    };
    const subscribeWorkspace = async (query, listener) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const subscriptionId = nextId(ids);
      workspaceListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "workspace-subscribe", id: nextId(ids), payload: { subscriptionId, query } });
      } catch (error) {
        workspaceListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const storage = async (payload) => {
      if ("key" in payload && (payload.key.length === 0 || payload.key.length > GUEST_STORAGE_KEY_MAX)) {
        throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
      }
      if (payload.op === "set" && !isJsonValue(payload.value)) {
        throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
      }
      if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > GUEST_STORAGE_VALUE_BYTES) {
        throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
      }
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
    return {
      onAction: (handler) => {
        actionHandler = handler;
        return () => {
          if (actionHandler === handler)
            actionHandler = null;
        };
      },
      listProjects: async () => {
        const result = await readWorkspace({ kind: "projects" });
        if (result.kind !== "projects")
          throw new HostRequestError("HOST_REJECTED", "Expected projects.");
        return result;
      },
      listWorktrees: async (projectId) => {
        const result = await readWorkspace({ kind: "worktrees", projectId });
        if (result.kind !== "worktrees")
          throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
        return result;
      },
      listSessions: async (projectId) => {
        const result = await readWorkspace({ kind: "sessions", projectId });
        if (result.kind !== "sessions")
          throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
        return result;
      },
      onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
        if (snapshot.kind === "projects")
          listener(snapshot);
      }),
      onWorktrees: (projectId, listener) => subscribeWorkspace({ kind: "worktrees", projectId }, (snapshot) => {
        if (snapshot.kind === "worktrees")
          listener(snapshot);
      }),
      onSessions: (projectId, listener) => subscribeWorkspace({ kind: "sessions", projectId }, (snapshot) => {
        if (snapshot.kind === "sessions")
          listener(snapshot);
      }),
      openSession: async (sessionId) => {
        requireIdentity(sessionId);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId } });
      },
      storage: {
        get: async (key) => {
          const result = await storage({ op: "get", key });
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key, value) => {
          await storage({ op: "set", key, value });
        },
        delete: async (key) => {
          await storage({ op: "delete", key });
        },
        keys: async () => {
          const result = await storage({ op: "keys" });
          if (result.op !== "keys")
            throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
          return result.keys;
        }
      },
      onReady: (listener) => {
        readyListeners.add(listener);
        if (lastReady)
          listener(lastReady);
        return () => {
          readyListeners.delete(listener);
        };
      },
      onDirectory: (listener) => {
        directoryListeners.add(listener);
        if (lastReady)
          listener(lastReady.directory);
        return () => {
          directoryListeners.delete(listener);
        };
      },
      onSession: (listener) => {
        sessionListeners.add(listener);
        if (lastReady)
          listener(lastReady.session);
        return () => {
          sessionListeners.delete(listener);
        };
      },
      onSessionLifecycle: (listener) => {
        lifecycleListeners.add(listener);
        if (lastLifecycle)
          listener(lastLifecycle);
        return () => {
          lifecycleListeners.delete(listener);
        };
      },
      onConnection: (listener) => {
        connectionListeners.add(listener);
        if (lastReady)
          listener(lastReady.connection);
        return () => {
          connectionListeners.delete(listener);
        };
      },
      onSettings: (listener) => {
        settingsListeners.add(listener);
        if (lastReady)
          listener(lastReady.settings);
        return () => {
          settingsListeners.delete(listener);
        };
      },
      onItem: (listener) => {
        itemListeners.add(listener);
        if (lastReady)
          listener(lastReady.item);
        return () => {
          itemListeners.delete(listener);
        };
      },
      onResolve: (handler) => {
        resolveHandler = handler;
        return () => {
          if (resolveHandler === handler)
            resolveHandler = null;
        };
      },
      toast: (payload) => {
        const message = payload.message.trim();
        if (!message || message.length > GUEST_TOAST_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to ${GUEST_TOAST_MAX} characters.`));
        }
        if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > GUEST_CLIPBOARD_TEXT_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
        }
        return request({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "toast",
          id: nextId(ids),
          payload: { ...payload, message }
        });
      },
      openUrl: (url) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-url",
        id: nextId(ids),
        payload: { url }
      }),
      openSurface: (surfaceId) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-surface",
        id: nextId(ids),
        payload: { surfaceId }
      }),
      writeClipboard: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text }
      }),
      compose: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "compose",
        id: nextId(ids),
        payload
      }),
      attach: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "attach",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      startSession: async (payload) => {
        if (payload.projectId !== void 0)
          requireIdentity(payload.projectId);
        const worktree = payload.worktree;
        if (worktree && worktree !== true) {
          if (worktree.kind === "existing")
            requireIdentity(worktree.directory);
          else {
            if (worktree.name !== void 0)
              requireIdentity(worktree.name, 200);
            if (worktree.baseBranch !== void 0)
              requireIdentity(worktree.baseBranch, 200);
          }
        }
        const result = await send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "start-session",
          id: nextId(ids),
          payload: clampStartSessionRequest(payload)
        }, options.requestTimeoutMs ?? 18e4);
        if (!isStartSessionResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
        }
        return result;
      },
      prompt: (payload) => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "prompt",
        id: nextId(ids),
        payload: clampPromptRequest(payload)
      }).then((result) => {
        if (!isPromptResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
        }
        return result;
      }),
      sessionLink: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "session-link",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      close: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "close",
        id: nextId(ids)
      }),
      oauthStart: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-start",
        id: nextId(ids)
      }),
      oauthDisconnect: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-disconnect",
        id: nextId(ids)
      }),
      request: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
        }
        return result;
      }),
      serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
        }
        return result;
      }),
      serviceStatus: () => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-status",
        id: nextId(ids)
      }).then((result) => {
        if (!isServiceStatusResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
        }
        return result;
      }),
      readFile: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-read",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileReadResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
        }
        return result;
      }),
      writeFile: (path, content) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content }
        }).then((result) => {
          if (!isFileWriteResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
          }
          return result;
        });
      },
      listDir: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-list",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileListResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
        }
        return result;
      }),
      stat: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-stat",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileStatResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
        }
        return result;
      }),
      generate: (input) => {
        const prompt = input.prompt.trim();
        const system = input.system?.trim();
        if (prompt.length === 0 || prompt.length > GUEST_GENERATE_PROMPT_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
        }
        if (system !== void 0 && (system.length === 0 || system.length > GUEST_GENERATE_SYSTEM_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
        }
        const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
        if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
        }
        const payload = { prompt };
        if (system !== void 0)
          payload.system = system;
        if (maxOutputTokens !== void 0)
          payload.maxOutputTokens = maxOutputTokens;
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "generate",
          id: nextId(ids),
          payload
        }, options.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      setBadge: (count) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count) }
      }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        disposed = true;
        resolveHandler = null;
        actionHandler = null;
        target.removeEventListener("message", onMessage);
        for (const waiter of pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
        }
        pending.clear();
        readyListeners.clear();
        directoryListeners.clear();
        sessionListeners.clear();
        lifecycleListeners.clear();
        connectionListeners.clear();
        settingsListeners.clear();
        itemListeners.clear();
      }
    };
  };

  // panel/host.ts
  var host = connectHost();

  // panel/state.ts
  function createInitialState() {
    return {
      branches: [],
      allCommits: [],
      filteredCommits: [],
      selectedCommit: null,
      selectedCommits: /* @__PURE__ */ new Set(),
      selectedBranch: null,
      commitDetail: null,
      diffs: [],
      gitStatus: null,
      branchFilter: "",
      commitSearch: "",
      logBranch: null,
      loading: false,
      favorites: /* @__PURE__ */ new Set(),
      filterAuthor: "",
      filterDateFrom: "",
      filterDateTo: "",
      filterPaths: [],
      branchPanelHidden: false,
      sortMode: "default",
      displaySettings: { showAuthor: true, showDate: true, showHash: true },
      searchRegex: false,
      searchCaseSensitive: false
    };
  }
  var StateManager = class {
    state;
    listeners = /* @__PURE__ */ new Set();
    constructor(initialState) {
      this.state = initialState;
    }
    /** 获取当前状态 */
    getState() {
      return this.state;
    }
    /** 更新状态 */
    setState(updater) {
      updater(this.state);
      this.notifyListeners();
    }
    /** 订阅状态变更 */
    subscribe(callback) {
      this.listeners.add(callback);
      return () => {
        this.listeners.delete(callback);
      };
    }
    /** 通知监听器 */
    notifyListeners() {
      for (const listener of this.listeners) {
        listener(this.state);
      }
    }
  };
  var stateManager = new StateManager(createInitialState());
  var getState = () => stateManager.getState();
  var setState = (updater) => stateManager.setState(updater);
  var subscribeState = (callback) => stateManager.subscribe(callback);
  function pickFields(fields) {
    const state = getState();
    const snap = {};
    for (const field of fields) {
      snap[field] = state[field];
    }
    return snap;
  }
  function subscribeFields(fields, callback) {
    let prev = pickFields(fields);
    return subscribeState((state) => {
      const changed = [];
      for (const field of fields) {
        if (prev[field] !== state[field]) {
          changed.push(field);
        }
      }
      if (changed.length === 0) return;
      prev = pickFields(fields);
      callback(changed);
    });
  }

  // panel/i18n.ts
  var en = {
    "branch.checkout": "Checkout Branch",
    "branch.rename": "Rename Branch",
    "branch.merge": "Merge into Current Branch",
    "branch.rebase": "Rebase onto Here",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "Add to Favorites",
    "branch.unfavorite": "Remove from Favorites",
    "branch.delete": "Delete Branch",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "Branch {name} has not been merged into the current branch. Force deleting will lose its commits.",
    "branch.forceDeleteButton": "Force Delete",
    "branch.notFound": "Branch {name} does not exist",
    "branch.deleteFailed": "Failed to delete branch",
    "branch.notifyDeleted": "Deleted branch: {name}",
    "branch.restore": "Restore",
    "branch.deleteTracking": "Delete Tracking Branch",
    "branch.restoreSuccess": "Branch {name} restored",
    "branch.restoreFailed": "Failed to restore branch",
    "branch.deleteTrackingFailed": "Failed to delete tracking branch",
    "commit.copyRevision": "Copy Revision Number",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Compare with Local",
    "commit.reset": "Reset Current Branch to Here",
    "commit.revert": "Revert Commit",
    "commit.newBranch": "New Branch",
    "commit.newTag": "New Tag",
    "batch.selected": "{n} commits selected",
    "batch.copyHashes": "Copy Hash List",
    "batch.cherryPickAll": "Cherry-pick All ({n})",
    "batch.revertAll": "Revert All ({n})",
    "batch.confirmCherryPick": "Cherry-pick {n} selected commits?",
    "batch.confirmRevert": "Revert {n} selected commits?",
    "file.showDiff": "Show Diff",
    "file.showDiffNew": "Show Diff in a New Window",
    "file.compareLocal": "Compare with Local",
    "file.compareBeforeLocal": "Compare Before with Local",
    "file.editSource": "Edit Source",
    "file.openRepoVersion": "Open Repository Version",
    "file.revertChanges": "Revert Selected Changes",
    "file.cherryPickChanges": "Cherry-Pick Selected Changes",
    "file.createPatch": "Create Patch",
    "file.getFromRevision": "Get from Revision",
    "file.historyUpTo": "History Up to Here",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Hide Git Branches",
    "sidebar.showBranches": "Show Git Branches",
    "sidebar.newBranch": "New Branch",
    "sidebar.refresh": "Refresh",
    "sidebar.update": "Update Selected",
    "sidebar.checkout": "Checkout",
    "sidebar.merge": "Merge",
    "sidebar.search": "Search",
    "sidebar.favorite": "Favorite",
    "sidebar.settings": "Settings",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "Expand All",
    "sidebar.sort": "Sort",
    "sidebar.close": "Close",
    "sidebar.noSelectedBranch": "No branch selected",
    "settings.title": "Display Settings",
    "settings.showAuthor": "Show Author Column",
    "settings.showDate": "Show Date Column",
    "settings.showHash": "Show Hash Column",
    "goto.title": "Go to Reference",
    "goto.placeholder": "Enter hash or branch name",
    "goto.notFound": "No matches found",
    "goto.ok": "Go",
    "sort.dateAsc": "Sort: Date Ascending",
    "sort.authorAsc": "Sort: Author",
    "sort.messageAsc": "Sort: Message",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Branch",
    "filter.user": "User",
    "filter.date": "Date",
    "filter.path": "Path",
    "filter.selectAll": "Select All",
    "filter.regex": "Regular Expression",
    "filter.case": "Case Sensitive",
    "filter.all": "All",
    "filter.localBranches": "Local Branches",
    "filter.remoteBranches": "Remote Branches",
    "filter.favorites": "Favorites",
    "filter.today": "Today",
    "filter.thisWeek": "This Week",
    "filter.thisMonth": "This Month",
    "filter.thisYear": "This Year",
    "filter.custom": "Custom\u2026",
    "filter.dateFrom": "From Date",
    "filter.dateTo": "To Date",
    "filter.chooseFolder": "Choose folder\u2026",
    "filter.ok": "OK",
    "filter.cancel": "Cancel",
    "filter.clear": "Clear",
    // 路径过滤（多选）
    "filter.selectPaths": "Select paths to filter by",
    "filter.editPaths": "Edit paths\u2026",
    "filter.maxPaths": "At most 100 paths allowed",
    "filter.noPaths": "No selectable paths",
    "filter.loadPathsFailed": "Failed to load paths"
  };
  var zhCN = {
    "branch.checkout": "\u7B7E\u51FA\u5206\u652F",
    "branch.rename": "\u91CD\u547D\u540D\u5206\u652F",
    "branch.merge": "\u5408\u5E76\u5230\u5F53\u524D\u5206\u652F",
    "branch.rebase": "\u53D8\u57FA\u5230\u6B64\u5206\u652F",
    "branch.pull": "\u62C9\u53D6",
    "branch.push": "\u63A8\u9001",
    "branch.favorite": "\u6DFB\u52A0\u6536\u85CF",
    "branch.unfavorite": "\u53D6\u6D88\u6536\u85CF",
    "branch.delete": "\u5220\u9664\u5206\u652F",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "\u5206\u652F {name} \u5C1A\u672A\u5408\u5E76\u5230\u5F53\u524D\u5206\u652F\uFF0C\u5F3A\u5236\u5220\u9664\u5C06\u4E22\u5931\u5176\u4E0A\u7684\u63D0\u4EA4\u3002",
    "branch.forceDeleteButton": "\u5F3A\u5236\u5220\u9664",
    "branch.notFound": "\u5206\u652F {name} \u4E0D\u5B58\u5728",
    "branch.deleteFailed": "\u5220\u9664\u5206\u652F\u5931\u8D25",
    "branch.notifyDeleted": "\u5DF2\u5220\u9664\u7684\u5206\u652F: {name}",
    "branch.restore": "\u8FD8\u539F",
    "branch.deleteTracking": "\u5220\u9664\u8DDF\u8E2A\u7684\u5206\u652F",
    "branch.restoreSuccess": "\u5206\u652F {name} \u5DF2\u8FD8\u539F",
    "branch.restoreFailed": "\u8FD8\u539F\u5206\u652F\u5931\u8D25",
    "branch.deleteTrackingFailed": "\u5220\u9664\u8DDF\u8E2A\u7684\u5206\u652F\u5931\u8D25",
    "commit.copyRevision": "\u590D\u5236\u63D0\u4EA4\u54C8\u5E0C",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "\u4E0E\u672C\u5730\u6BD4\u8F83",
    "commit.reset": "\u5C06\u5F53\u524D\u5206\u652F\u91CD\u7F6E\u5230\u6B64\u5904",
    "commit.revert": "\u56DE\u6EDA\u63D0\u4EA4",
    "commit.newBranch": "\u65B0\u5EFA\u5206\u652F",
    "commit.newTag": "\u65B0\u5EFA\u6807\u7B7E",
    "batch.selected": "\u5DF2\u9009\u4E2D {n} \u4E2A\u63D0\u4EA4",
    "batch.copyHashes": "\u590D\u5236\u54C8\u5E0C\u5217\u8868",
    "batch.cherryPickAll": "Cherry-pick \u5168\u90E8 ({n})",
    "batch.revertAll": "Revert \u5168\u90E8 ({n})",
    "batch.confirmCherryPick": "\u786E\u5B9A\u5BF9 {n} \u4E2A\u63D0\u4EA4\u6267\u884C Cherry-pick \u5417\uFF1F",
    "batch.confirmRevert": "\u786E\u5B9A\u5BF9 {n} \u4E2A\u63D0\u4EA4\u6267\u884C Revert \u5417\uFF1F",
    "file.showDiff": "\u663E\u793A\u5DEE\u5F02",
    "file.showDiffNew": "\u65B0\u7A97\u53E3\u663E\u793A\u5DEE\u5F02",
    "file.compareLocal": "\u4E0E\u672C\u5730\u6BD4\u8F83",
    "file.compareBeforeLocal": "\u6BD4\u8F83\u6539\u52A8\u524D\u4E0E\u672C\u5730",
    "file.editSource": "\u7F16\u8F91\u6E90\u6587\u4EF6",
    "file.openRepoVersion": "\u6253\u5F00\u4ED3\u5E93\u7248\u672C",
    "file.revertChanges": "\u56DE\u6EDA\u9009\u4E2D\u66F4\u6539",
    "file.cherryPickChanges": "\u6458\u53D6\u9009\u4E2D\u66F4\u6539",
    "file.createPatch": "\u521B\u5EFA\u8865\u4E01",
    "file.getFromRevision": "\u4ECE\u7248\u672C\u83B7\u53D6",
    "file.historyUpTo": "\u6B64\u5904\u4E3A\u6B62\u7684\u5386\u53F2",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "\u9690\u85CF Git \u5206\u652F",
    "sidebar.showBranches": "\u663E\u793A Git \u5206\u652F",
    "sidebar.newBranch": "\u65B0\u5EFA\u5206\u652F",
    "sidebar.refresh": "\u5237\u65B0",
    "sidebar.update": "\u66F4\u65B0\u6240\u9009",
    "sidebar.checkout": "\u7B7E\u51FA",
    "sidebar.merge": "\u5408\u5E76",
    "sidebar.search": "\u641C\u7D22",
    "sidebar.favorite": "\u6536\u85CF",
    "sidebar.settings": "\u8BBE\u7F6E",
    "sidebar.pull": "\u62C9\u53D6",
    "sidebar.expandAll": "\u5C55\u5F00\u5168\u90E8",
    "sidebar.sort": "\u6392\u5E8F",
    "sidebar.close": "\u5173\u95ED",
    "sidebar.noSelectedBranch": "\u672A\u9009\u4E2D\u5206\u652F",
    "settings.title": "\u663E\u793A\u8BBE\u7F6E",
    "settings.showAuthor": "\u663E\u793A\u4F5C\u8005\u5217",
    "settings.showDate": "\u663E\u793A\u65E5\u671F\u5217",
    "settings.showHash": "\u663E\u793A\u54C8\u5E0C\u5217",
    "goto.title": "\u8DF3\u8F6C\u5230\u5F15\u7528",
    "goto.placeholder": "\u8F93\u5165\u54C8\u5E0C\u6216\u5206\u652F\u540D",
    "goto.notFound": "\u672A\u627E\u5230\u5339\u914D\u9879",
    "goto.ok": "\u8DF3\u8F6C",
    "sort.dateAsc": "\u6392\u5E8F: \u65E5\u671F\u5347\u5E8F",
    "sort.authorAsc": "\u6392\u5E8F: \u4F5C\u8005",
    "sort.messageAsc": "\u6392\u5E8F: \u6D88\u606F",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "\u5206\u652F",
    "filter.user": "\u7528\u6237",
    "filter.date": "\u65E5\u671F",
    "filter.path": "\u8DEF\u5F84",
    "filter.selectAll": "\u5168\u9009",
    "filter.regex": "\u6B63\u5219\u8868\u8FBE\u5F0F",
    "filter.case": "\u5927\u5C0F\u5199\u654F\u611F",
    "filter.all": "\u5168\u90E8",
    "filter.localBranches": "\u672C\u5730\u5206\u652F",
    "filter.remoteBranches": "\u8FDC\u7A0B\u5206\u652F",
    "filter.favorites": "\u6536\u85CF",
    "filter.today": "\u4ECA\u5929",
    "filter.thisWeek": "\u672C\u5468",
    "filter.thisMonth": "\u672C\u6708",
    "filter.thisYear": "\u4ECA\u5E74",
    "filter.custom": "\u81EA\u5B9A\u4E49\u2026",
    "filter.dateFrom": "\u5F00\u59CB\u65E5\u671F",
    "filter.dateTo": "\u7ED3\u675F\u65E5\u671F",
    "filter.chooseFolder": "\u9009\u62E9\u6587\u4EF6\u5939\u2026",
    "filter.ok": "\u786E\u5B9A",
    "filter.cancel": "\u53D6\u6D88",
    "filter.clear": "\u6E05\u9664",
    // 路径过滤（多选）
    "filter.selectPaths": "\u9009\u62E9\u8981\u8FC7\u6EE4\u7684\u8DEF\u5F84",
    "filter.editPaths": "\u7F16\u8F91\u8DEF\u5F84\u2026",
    "filter.maxPaths": "\u6700\u591A\u53EF\u9009 100 \u9879",
    "filter.noPaths": "\u65E0\u53EF\u9009\u8DEF\u5F84",
    "filter.loadPathsFailed": "\u52A0\u8F7D\u8DEF\u5F84\u5931\u8D25"
  };
  var zhTW = {
    "branch.checkout": "\u7C3D\u51FA\u5206\u652F",
    "branch.rename": "\u91CD\u65B0\u547D\u540D\u5206\u652F",
    "branch.merge": "\u5408\u4F75\u5230\u76EE\u524D\u5206\u652F",
    "branch.rebase": "Rebase \u5230\u6B64\u5206\u652F",
    "branch.pull": "\u62C9\u53D6",
    "branch.push": "\u63A8\u9001",
    "branch.favorite": "\u52A0\u5165\u6536\u85CF",
    "branch.unfavorite": "\u53D6\u6D88\u6536\u85CF",
    "branch.delete": "\u522A\u9664\u5206\u652F",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "\u5206\u652F {name} \u5C1A\u672A\u5408\u4F75\u5230\u76EE\u524D\u5206\u652F\uFF0C\u5F37\u5236\u522A\u9664\u5C07\u907A\u5931\u5176\u4E0A\u7684\u63D0\u4EA4\u3002",
    "branch.forceDeleteButton": "\u5F37\u5236\u522A\u9664",
    "branch.notFound": "\u5206\u652F {name} \u4E0D\u5B58\u5728",
    "branch.deleteFailed": "\u522A\u9664\u5206\u652F\u5931\u6557",
    "branch.notifyDeleted": "\u5DF2\u522A\u9664\u7684\u5206\u652F: {name}",
    "branch.restore": "\u9084\u539F",
    "branch.deleteTracking": "\u522A\u9664\u8FFD\u8E64\u7684\u5206\u652F",
    "branch.restoreSuccess": "\u5206\u652F {name} \u5DF2\u9084\u539F",
    "branch.restoreFailed": "\u9084\u539F\u5206\u652F\u5931\u6557",
    "branch.deleteTrackingFailed": "\u522A\u9664\u8FFD\u8E64\u7684\u5206\u652F\u5931\u6557",
    "commit.copyRevision": "\u8907\u88FD\u63D0\u4EA4\u96DC\u6E4A",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "\u8207\u672C\u6A5F\u6BD4\u8F03",
    "commit.reset": "\u5C07\u76EE\u524D\u5206\u652F\u91CD\u8A2D\u5230\u6B64\u8655",
    "commit.revert": "\u9084\u539F\u63D0\u4EA4",
    "commit.newBranch": "\u65B0\u5EFA\u5206\u652F",
    "commit.newTag": "\u65B0\u5EFA\u6A19\u7C64",
    "batch.selected": "\u5DF2\u9078\u53D6 {n} \u500B\u63D0\u4EA4",
    "batch.copyHashes": "\u8907\u88FD\u96DC\u6E4A\u6E05\u55AE",
    "batch.cherryPickAll": "\u5168\u90E8 Cherry-pick ({n})",
    "batch.revertAll": "\u5168\u90E8\u9084\u539F ({n})",
    "batch.confirmCherryPick": "\u78BA\u5B9A\u5C0D {n} \u500B\u9078\u53D6\u63D0\u4EA4\u57F7\u884C Cherry-pick \u55CE\uFF1F",
    "batch.confirmRevert": "\u78BA\u5B9A\u5C0D {n} \u500B\u9078\u53D6\u63D0\u4EA4\u57F7\u884C\u9084\u539F\u55CE\uFF1F",
    "file.showDiff": "\u986F\u793A\u5DEE\u7570",
    "file.showDiffNew": "\u5728\u65B0\u8996\u7A97\u986F\u793A\u5DEE\u7570",
    "file.compareLocal": "\u8207\u672C\u6A5F\u6BD4\u8F03",
    "file.compareBeforeLocal": "\u6BD4\u8F03\u8B8A\u66F4\u524D\u8207\u672C\u6A5F",
    "file.editSource": "\u7DE8\u8F2F\u539F\u59CB\u6A94",
    "file.openRepoVersion": "\u958B\u555F\u5132\u5B58\u5EAB\u7248\u672C",
    "file.revertChanges": "\u9084\u539F\u9078\u53D6\u7684\u8B8A\u66F4",
    "file.cherryPickChanges": "\u6458\u53D6\u9078\u53D6\u7684\u8B8A\u66F4",
    "file.createPatch": "\u5EFA\u7ACB\u88DC\u4E01",
    "file.getFromRevision": "\u5F9E\u7248\u672C\u53D6\u5F97",
    "file.historyUpTo": "\u81F3\u6B64\u7684\u6B77\u53F2",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "\u96B1\u85CF Git \u5206\u652F",
    "sidebar.showBranches": "\u986F\u793A Git \u5206\u652F",
    "sidebar.newBranch": "\u65B0\u5EFA\u5206\u652F",
    "sidebar.refresh": "\u91CD\u65B0\u6574\u7406",
    "sidebar.update": "\u66F4\u65B0",
    "sidebar.checkout": "\u7C3D\u51FA",
    "sidebar.merge": "\u5408\u4F75",
    "sidebar.search": "\u641C\u5C0B",
    "sidebar.favorite": "\u6536\u85CF",
    "sidebar.settings": "\u8A2D\u5B9A",
    "sidebar.pull": "\u62C9\u53D6",
    "sidebar.expandAll": "\u5168\u90E8\u5C55\u958B",
    "sidebar.sort": "\u6392\u5E8F",
    "sidebar.close": "\u95DC\u9589",
    "sidebar.noSelectedBranch": "\u672A\u9078\u53D6\u5206\u652F",
    "settings.title": "\u986F\u793A\u8A2D\u5B9A",
    "settings.showAuthor": "\u986F\u793A\u4F5C\u8005\u6B04",
    "settings.showDate": "\u986F\u793A\u65E5\u671F\u6B04",
    "settings.showHash": "\u986F\u793A\u96DC\u6E4A\u6B04",
    "goto.title": "\u8DF3\u81F3\u53C3\u7167",
    "goto.placeholder": "\u8F38\u5165\u96DC\u6E4A\u6216\u5206\u652F\u540D\u7A31",
    "goto.notFound": "\u627E\u4E0D\u5230\u7B26\u5408\u9805\u76EE",
    "goto.ok": "\u8DF3\u81F3",
    "sort.dateAsc": "\u6392\u5E8F: \u65E5\u671F\u905E\u589E",
    "sort.authorAsc": "\u6392\u5E8F: \u4F5C\u8005",
    "sort.messageAsc": "\u6392\u5E8F: \u8A0A\u606F",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "\u5206\u652F",
    "filter.user": "\u4F7F\u7528\u8005",
    "filter.date": "\u65E5\u671F",
    "filter.path": "\u8DEF\u5F91",
    "filter.selectAll": "\u5168\u9078",
    "filter.regex": "\u6B63\u5247\u8868\u9054\u5F0F",
    "filter.case": "\u5340\u5206\u5927\u5C0F\u5BEB",
    "filter.all": "\u5168\u90E8",
    "filter.localBranches": "\u672C\u6A5F\u5206\u652F",
    "filter.remoteBranches": "\u9060\u7AEF\u5206\u652F",
    "filter.favorites": "\u6536\u85CF",
    "filter.today": "\u4ECA\u5929",
    "filter.thisWeek": "\u672C\u9031",
    "filter.thisMonth": "\u672C\u6708",
    "filter.thisYear": "\u4ECA\u5E74",
    "filter.custom": "\u81EA\u8A02\u2026",
    "filter.dateFrom": "\u958B\u59CB\u65E5\u671F",
    "filter.dateTo": "\u7D50\u675F\u65E5\u671F",
    "filter.chooseFolder": "\u9078\u64C7\u8CC7\u6599\u593E\u2026",
    "filter.ok": "\u78BA\u5B9A",
    "filter.cancel": "\u53D6\u6D88",
    "filter.clear": "\u6E05\u9664",
    // 路径过滤（多选）
    "filter.selectPaths": "\u9078\u64C7\u8981\u904E\u6FFE\u7684\u8DEF\u5F91",
    "filter.editPaths": "\u7DE8\u8F2F\u8DEF\u5F91\u2026",
    "filter.maxPaths": "\u6700\u591A\u53EF\u9078 100 \u9805",
    "filter.noPaths": "\u7121\u53EF\u9078\u8DEF\u5F91",
    "filter.loadPathsFailed": "\u8F09\u5165\u8DEF\u5F91\u5931\u6557"
  };
  var de = {
    "branch.checkout": "Branch auschecken",
    "branch.rename": "Branch umbenennen",
    "branch.merge": "In aktuelle Branch zusammenf\xFChren",
    "branch.rebase": "Hierher rebase",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "Zu Favoriten hinzuf\xFCgen",
    "branch.unfavorite": "Aus Favoriten entfernen",
    "branch.delete": "Branch l\xF6schen",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "Der Branch {name} wurde nicht mit dem aktuellen Branch zusammengef\xFChrt. Ein erzwungenes L\xF6schen f\xFChrt zum Verlust der Commits.",
    "branch.forceDeleteButton": "Erzwungenes L\xF6schen",
    "branch.notFound": "Branch {name} existiert nicht",
    "branch.deleteFailed": "Branch konnte nicht gel\xF6scht werden",
    "branch.notifyDeleted": "Gel\xF6schter Branch: {name}",
    "branch.restore": "Wiederherstellen",
    "branch.deleteTracking": "Tracking-Branch l\xF6schen",
    "branch.restoreSuccess": "Branch {name} wiederhergestellt",
    "branch.restoreFailed": "Branch konnte nicht wiederhergestellt werden",
    "branch.deleteTrackingFailed": "Tracking-Branch konnte nicht gel\xF6scht werden",
    "commit.copyRevision": "Commit-Hash kopieren",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Mit Lokal vergleichen",
    "commit.reset": "Aktuellen Branch hierher zur\xFCcksetzen",
    "commit.revert": "Commit umkehren",
    "commit.newBranch": "Neue Branch",
    "commit.newTag": "Neues Tag",
    "batch.selected": "{n} Commits ausgew\xE4hlt",
    "batch.copyHashes": "Hash-Liste kopieren",
    "batch.cherryPickAll": "Alle cherry-picken ({n})",
    "batch.revertAll": "Alle umkehren ({n})",
    "batch.confirmCherryPick": "{n} ausgew\xE4hlte Commits cherry-picken?",
    "batch.confirmRevert": "{n} ausgew\xE4hlte Commits umkehren?",
    "file.showDiff": "Diff anzeigen",
    "file.showDiffNew": "Diff in neuem Fenster anzeigen",
    "file.compareLocal": "Mit Lokal vergleichen",
    "file.compareBeforeLocal": "Vorher mit Lokal vergleichen",
    "file.editSource": "Quellcode bearbeiten",
    "file.openRepoVersion": "Repository-Version \xF6ffnen",
    "file.revertChanges": "Ausgew\xE4hlte \xC4nderungen zur\xFCcksetzen",
    "file.cherryPickChanges": "Ausgew\xE4hlte \xC4nderungen cherry-picken",
    "file.createPatch": "Patch erstellen",
    "file.getFromRevision": "Aus Revision laden",
    "file.historyUpTo": "Historie bis hierher",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Git-Branches ausblenden",
    "sidebar.showBranches": "Git-Branches anzeigen",
    "sidebar.newBranch": "Neue Branch",
    "sidebar.refresh": "Aktualisieren",
    "sidebar.update": "Aktualisieren",
    "sidebar.checkout": "Auschecken",
    "sidebar.merge": "Zusammenf\xFChren",
    "sidebar.search": "Suchen",
    "sidebar.favorite": "Favorit",
    "sidebar.settings": "Einstellungen",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "Alle ausklappen",
    "sidebar.sort": "Sortieren",
    "sidebar.close": "Schlie\xDFen",
    "sidebar.noSelectedBranch": "Keine Branch ausgew\xE4hlt",
    "settings.title": "Anzeigeeinstellungen",
    "settings.showAuthor": "Autorspalte anzeigen",
    "settings.showDate": "Datenspalte anzeigen",
    "settings.showHash": "Hash-Spalte anzeigen",
    "goto.title": "Zu Referenz springen",
    "goto.placeholder": "Hash oder Branch-Namen eingeben",
    "goto.notFound": "Keine \xDCbereinstimmung gefunden",
    "goto.ok": "Springen",
    "sort.dateAsc": "Sortieren: Datum aufsteigend",
    "sort.authorAsc": "Sortieren: Autor",
    "sort.messageAsc": "Sortieren: Nachricht",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Branch",
    "filter.user": "Benutzer",
    "filter.date": "Datum",
    "filter.path": "Pfad",
    "filter.selectAll": "Alle ausw\xE4hlen",
    "filter.regex": "Regul\xE4rer Ausdruck",
    "filter.case": "Gro\xDF-/Kleinschreibung",
    "filter.all": "Alle",
    "filter.localBranches": "Lokale Branches",
    "filter.remoteBranches": "Remote-Branches",
    "filter.favorites": "Favoriten",
    "filter.today": "Heute",
    "filter.thisWeek": "Diese Woche",
    "filter.thisMonth": "Dieser Monat",
    "filter.thisYear": "Dieses Jahr",
    "filter.custom": "Benutzerdefiniert\u2026",
    "filter.dateFrom": "Von Datum",
    "filter.dateTo": "Bis Datum",
    "filter.chooseFolder": "Ordner ausw\xE4hlen\u2026",
    "filter.ok": "OK",
    "filter.cancel": "Abbrechen",
    "filter.clear": "L\xF6schen",
    // 路径过滤（多选）
    "filter.selectPaths": "Pfade zum Filtern ausw\xE4hlen",
    "filter.editPaths": "Pfade bearbeiten\u2026",
    "filter.maxPaths": "H\xF6chstens 100 Pfade zul\xE4ssig",
    "filter.noPaths": "Keine ausw\xE4hlbaren Pfade",
    "filter.loadPathsFailed": "Pfade konnten nicht geladen werden"
  };
  var fr = {
    "branch.checkout": "Checkout de la branche",
    "branch.rename": "Renommer la branche",
    "branch.merge": "Fusionner avec la branche actuelle",
    "branch.rebase": "Rebase ici",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "Ajouter aux favoris",
    "branch.unfavorite": "Retirer des favoris",
    "branch.delete": "Supprimer la branche",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "La branche {name} n'a pas \xE9t\xE9 fusionn\xE9e avec la branche actuelle. La suppression forc\xE9e fera perdre ses commits.",
    "branch.forceDeleteButton": "Suppression forc\xE9e",
    "branch.notFound": "La branche {name} n'existe pas",
    "branch.deleteFailed": "\xC9chec de la suppression de la branche",
    "branch.notifyDeleted": "Branche supprim\xE9e : {name}",
    "branch.restore": "Restaurer",
    "branch.deleteTracking": "Supprimer la branche de suivi",
    "branch.restoreSuccess": "La branche {name} a \xE9t\xE9 restaur\xE9e",
    "branch.restoreFailed": "\xC9chec de la restauration de la branche",
    "branch.deleteTrackingFailed": "\xC9chec de la suppression de la branche de suivi",
    "commit.copyRevision": "Copier le hash du commit",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Comparer avec local",
    "commit.reset": "R\xE9initialiser la branche actuelle ici",
    "commit.revert": "Annuler le commit",
    "commit.newBranch": "Nouvelle branche",
    "commit.newTag": "Nouveau tag",
    "batch.selected": "{n} commits s\xE9lectionn\xE9s",
    "batch.copyHashes": "Copier la liste des hash",
    "batch.cherryPickAll": "Tout cherry-picker ({n})",
    "batch.revertAll": "Tout annuler ({n})",
    "batch.confirmCherryPick": "Cherry-picker les {n} commits s\xE9lectionn\xE9s ?",
    "batch.confirmRevert": "Annuler les {n} commits s\xE9lectionn\xE9s ?",
    "file.showDiff": "Afficher le diff",
    "file.showDiffNew": "Afficher le diff dans une nouvelle fen\xEAtre",
    "file.compareLocal": "Comparer avec local",
    "file.compareBeforeLocal": "Comparer avant avec local",
    "file.editSource": "Modifier la source",
    "file.openRepoVersion": "Ouvrir la version du d\xE9p\xF4t",
    "file.revertChanges": "Annuler les changements s\xE9lectionn\xE9s",
    "file.cherryPickChanges": "Cherry-pick des changements s\xE9lectionn\xE9s",
    "file.createPatch": "Cr\xE9er un patch",
    "file.getFromRevision": "R\xE9cup\xE9rer depuis la r\xE9vision",
    "file.historyUpTo": "Historique jusqu'ici",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Masquer les branches Git",
    "sidebar.showBranches": "Afficher les branches Git",
    "sidebar.newBranch": "Nouvelle branche",
    "sidebar.refresh": "Actualiser",
    "sidebar.update": "Mettre \xE0 jour",
    "sidebar.checkout": "Checkout",
    "sidebar.merge": "Fusionner",
    "sidebar.search": "Rechercher",
    "sidebar.favorite": "Favori",
    "sidebar.settings": "Param\xE8tres",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "Tout d\xE9velopper",
    "sidebar.sort": "Trier",
    "sidebar.close": "Fermer",
    "sidebar.noSelectedBranch": "Aucune branche s\xE9lectionn\xE9e",
    "settings.title": "Param\xE8tres d'affichage",
    "settings.showAuthor": "Afficher la colonne de l'auteur",
    "settings.showDate": "Afficher la colonne de date",
    "settings.showHash": "Afficher la colonne de hash",
    "goto.title": "Aller \xE0 la r\xE9f\xE9rence",
    "goto.placeholder": "Saisir un hash ou un nom de branche",
    "goto.notFound": "Aucun r\xE9sultat trouv\xE9",
    "goto.ok": "Aller",
    "sort.dateAsc": "Trier : date croissante",
    "sort.authorAsc": "Trier : auteur",
    "sort.messageAsc": "Trier : message",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Branche",
    "filter.user": "Utilisateur",
    "filter.date": "Date",
    "filter.path": "Chemin",
    "filter.selectAll": "Tout s\xE9lectionner",
    "filter.regex": "Expression rationnelle",
    "filter.case": "Respecter la casse",
    "filter.all": "Tout",
    "filter.localBranches": "Branches locales",
    "filter.remoteBranches": "Branches distantes",
    "filter.favorites": "Favoris",
    "filter.today": "Aujourd'hui",
    "filter.thisWeek": "Cette semaine",
    "filter.thisMonth": "Ce mois-ci",
    "filter.thisYear": "Cette ann\xE9e",
    "filter.custom": "Personnalis\xE9\u2026",
    "filter.dateFrom": "Date de d\xE9but",
    "filter.dateTo": "Date de fin",
    "filter.chooseFolder": "Choisir un dossier\u2026",
    "filter.ok": "OK",
    "filter.cancel": "Annuler",
    "filter.clear": "Effacer",
    // 路径过滤（多选）
    "filter.selectPaths": "S\xE9lectionner les chemins \xE0 filtrer",
    "filter.editPaths": "Modifier les chemins\u2026",
    "filter.maxPaths": "Au maximum 100 chemins autoris\xE9s",
    "filter.noPaths": "Aucun chemin s\xE9lectionnable",
    "filter.loadPathsFailed": "\xC9chec du chargement des chemins"
  };
  var uk = {
    "branch.checkout": "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 \u0433\u0456\u043B\u043A\u0443",
    "branch.rename": "\u041F\u0435\u0440\u0435\u0439\u043C\u0435\u043D\u0443\u0432\u0430\u0442\u0438 \u0433\u0456\u043B\u043A\u0443",
    "branch.merge": "\u0417\u043B\u0438\u0442\u0438 \u0432 \u043F\u043E\u0442\u043E\u0447\u043D\u0443 \u0433\u0456\u043B\u043A\u0443",
    "branch.rebase": "Rebase \u043D\u0430 \u0446\u044E \u0433\u0456\u043B\u043A\u0443",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "\u0414\u043E\u0434\u0430\u0442\u0438 \u0434\u043E \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E",
    "branch.unfavorite": "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E",
    "branch.delete": "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0456\u043B\u043A\u0443",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "\u0413\u0456\u043B\u043A\u0443 {name} \u043D\u0435 \u0437\u043B\u0438\u0442\u043E \u0432 \u043F\u043E\u0442\u043E\u0447\u043D\u0443 \u0433\u0456\u043B\u043A\u0443. \u041F\u0440\u0438\u043C\u0443\u0441\u043E\u0432\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F \u043F\u0440\u0438\u0437\u0432\u0435\u0434\u0435 \u0434\u043E \u0432\u0442\u0440\u0430\u0442\u0438 \u0457\u0457 \u043A\u043E\u043C\u0456\u0442\u0456\u0432.",
    "branch.forceDeleteButton": "\u041F\u0440\u0438\u043C\u0443\u0441\u043E\u0432\u043E \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438",
    "branch.notFound": "\u0413\u0456\u043B\u043A\u0443 {name} \u043D\u0435 \u0456\u0441\u043D\u0443\u0454",
    "branch.deleteFailed": "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0456\u043B\u043A\u0443",
    "branch.notifyDeleted": "\u0412\u0438\u0434\u0430\u043B\u0435\u043D\u0430 \u0433\u0456\u043B\u043A\u0430: {name}",
    "branch.restore": "\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438",
    "branch.deleteTracking": "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0456\u043B\u043A\u0443 \u0432\u0456\u0434\u0441\u0442\u0435\u0436\u0435\u043D\u043D\u044F",
    "branch.restoreSuccess": "\u0413\u0456\u043B\u043A\u0443 {name} \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    "branch.restoreFailed": "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u0433\u0456\u043B\u043A\u0443",
    "branch.deleteTrackingFailed": "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0456\u043B\u043A\u0443 \u0432\u0456\u0434\u0441\u0442\u0435\u0436\u0435\u043D\u043D\u044F",
    "commit.copyRevision": "\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u0445\u0435\u0448 \u043A\u043E\u043C\u0456\u0442\u0443",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0437 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0438\u043C",
    "commit.reset": "\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u043F\u043E\u0442\u043E\u0447\u043D\u0443 \u0433\u0456\u043B\u043A\u0443 \u043D\u0430 \u0446\u0435\u0439 \u043A\u043E\u043C\u0456\u0442",
    "commit.revert": "\u0412\u0456\u0434\u043A\u043E\u0442\u0438\u0442\u0438 \u043A\u043E\u043C\u0456\u0442",
    "commit.newBranch": "\u041D\u043E\u0432\u0430 \u0433\u0456\u043B\u043A\u0430",
    "commit.newTag": "\u041D\u043E\u0432\u0438\u0439 \u0442\u0435\u0433",
    "batch.selected": "\u0412\u0438\u0431\u0440\u0430\u043D\u043E {n} \u043A\u043E\u043C\u0456\u0442\u0456\u0432",
    "batch.copyHashes": "\u041A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0445\u0435\u0448\u0456\u0432",
    "batch.cherryPickAll": "Cherry-pick \u0443\u0441\u0456\u0445 ({n})",
    "batch.revertAll": "\u0412\u0456\u0434\u043A\u043E\u0442\u0438\u0442\u0438 \u0432\u0441\u0456 ({n})",
    "batch.confirmCherryPick": "\u0412\u0438\u043A\u043E\u043D\u0430\u0442\u0438 cherry-pick \u0434\u043B\u044F {n} \u0432\u0438\u0431\u0440\u0430\u043D\u0438\u0445 \u043A\u043E\u043C\u0456\u0442\u0456\u0432?",
    "batch.confirmRevert": "\u0412\u0456\u0434\u043A\u043E\u0442\u0438\u0442\u0438 {n} \u0432\u0438\u0431\u0440\u0430\u043D\u0438\u0445 \u043A\u043E\u043C\u0456\u0442\u0456\u0432?",
    "file.showDiff": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 diff",
    "file.showDiffNew": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 diff \u0443 \u043D\u043E\u0432\u043E\u043C\u0443 \u0432\u0456\u043A\u043D\u0456",
    "file.compareLocal": "\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0437 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0438\u043C",
    "file.compareBeforeLocal": "\u041F\u043E\u0440\u0456\u0432\u043D\u044F\u0442\u0438 \u0434\u043E \u0437\u043C\u0456\u043D \u0437 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0438\u043C",
    "file.editSource": "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0434\u0436\u0435\u0440\u0435\u043B\u043E",
    "file.openRepoVersion": "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0432\u0435\u0440\u0441\u0456\u044E \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0456\u044E",
    "file.revertChanges": "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0432\u0438\u0431\u0440\u0430\u043D\u0456 \u0437\u043C\u0456\u043D\u0438",
    "file.cherryPickChanges": "Cherry-pick \u0432\u0438\u0431\u0440\u0430\u043D\u0438\u0445 \u0437\u043C\u0456\u043D",
    "file.createPatch": "\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043F\u0430\u0442\u0447",
    "file.getFromRevision": "\u041E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u0437 \u0440\u0435\u0432\u0456\u0437\u0456\u0457",
    "file.historyUpTo": "\u0406\u0441\u0442\u043E\u0440\u0456\u044F \u0434\u043E \u0446\u044C\u043E\u0433\u043E \u043C\u0456\u0441\u0446\u044F",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "\u041F\u0440\u0438\u0445\u043E\u0432\u0430\u0442\u0438 \u0433\u0456\u043B\u043A\u0438 Git",
    "sidebar.showBranches": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 \u0433\u0456\u043B\u043A\u0438 Git",
    "sidebar.newBranch": "\u041D\u043E\u0432\u0430 \u0433\u0456\u043B\u043A\u0430",
    "sidebar.refresh": "\u041E\u043D\u043E\u0432\u0438\u0442\u0438",
    "sidebar.update": "\u041E\u043D\u043E\u0432\u0438\u0442\u0438",
    "sidebar.checkout": "\u041F\u0435\u0440\u0435\u0439\u0442\u0438",
    "sidebar.merge": "\u0417\u043B\u0438\u0442\u0438",
    "sidebar.search": "\u041F\u043E\u0448\u0443\u043A",
    "sidebar.favorite": "\u041E\u0431\u0440\u0430\u043D\u0435",
    "sidebar.settings": "\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "\u0420\u043E\u0437\u0433\u043E\u0440\u043D\u0443\u0442\u0438 \u0432\u0441\u0456",
    "sidebar.sort": "\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F",
    "sidebar.close": "\u0417\u0430\u043A\u0440\u0438\u0442\u0438",
    "sidebar.noSelectedBranch": "\u0413\u0456\u043B\u043A\u0443 \u043D\u0435 \u0432\u0438\u0431\u0440\u0430\u043D\u043E",
    "settings.title": "\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0432\u0456\u0434\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F",
    "settings.showAuthor": "\u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u043E\u0432\u043F\u0435\u0446\u044C \u0430\u0432\u0442\u043E\u0440\u0430",
    "settings.showDate": "\u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u043E\u0432\u043F\u0435\u0446\u044C \u0434\u0430\u0442\u0438",
    "settings.showHash": "\u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u043E\u0432\u043F\u0435\u0446\u044C \u0445\u0435\u0448\u0443",
    "goto.title": "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043E \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0443",
    "goto.placeholder": "\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u0445\u0435\u0448 \u0430\u0431\u043E \u043D\u0430\u0437\u0432\u0443 \u0433\u0456\u043B\u043A\u0438",
    "goto.notFound": "\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
    "goto.ok": "\u041F\u0435\u0440\u0435\u0439\u0442\u0438",
    "sort.dateAsc": "\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F: \u0437\u0430 \u0434\u0430\u0442\u043E\u044E",
    "sort.authorAsc": "\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F: \u0437\u0430 \u0430\u0432\u0442\u043E\u0440\u043E\u043C",
    "sort.messageAsc": "\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F: \u0437\u0430 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F\u043C",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "\u0413\u0456\u043B\u043A\u0430",
    "filter.user": "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447",
    "filter.date": "\u0414\u0430\u0442\u0430",
    "filter.path": "\u0428\u043B\u044F\u0445",
    "filter.selectAll": "\u0412\u0438\u0431\u0440\u0430\u0442\u0438 \u0432\u0441\u0456",
    "filter.regex": "\u0420\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u0438\u0439 \u0432\u0438\u0440\u0430\u0437",
    "filter.case": "\u0417 \u0443\u0440\u0430\u0445\u0443\u0432\u0430\u043D\u043D\u044F\u043C \u0440\u0435\u0433\u0456\u0441\u0442\u0440\u0443",
    "filter.all": "\u0423\u0441\u0456",
    "filter.localBranches": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0456 \u0433\u0456\u043B\u043A\u0438",
    "filter.remoteBranches": "\u0412\u0456\u0434\u0434\u0430\u043B\u0435\u043D\u0456 \u0433\u0456\u043B\u043A\u0438",
    "filter.favorites": "\u041E\u0431\u0440\u0430\u043D\u0435",
    "filter.today": "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456",
    "filter.thisWeek": "\u0426\u0435\u0439 \u0442\u0438\u0436\u0434\u0435\u043D\u044C",
    "filter.thisMonth": "\u0426\u0435\u0439 \u043C\u0456\u0441\u044F\u0446\u044C",
    "filter.thisYear": "\u0426\u0435\u0439 \u0440\u0456\u043A",
    "filter.custom": "\u0412\u043B\u0430\u0441\u043D\u0438\u0439\u2026",
    "filter.dateFrom": "\u0414\u0430\u0442\u0430 \u043F\u043E\u0447\u0430\u0442\u043A\u0443",
    "filter.dateTo": "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044F",
    "filter.chooseFolder": "\u0412\u0438\u0431\u0440\u0430\u0442\u0438 \u0442\u0435\u043A\u0443\u2026",
    "filter.ok": "\u0413\u0430\u0440\u0430\u0437\u0434",
    "filter.cancel": "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438",
    "filter.clear": "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438",
    // 路径过滤（多选）
    "filter.selectPaths": "\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0448\u043B\u044F\u0445\u0438 \u0434\u043B\u044F \u0444\u0456\u043B\u044C\u0442\u0440\u0443\u0432\u0430\u043D\u043D\u044F",
    "filter.editPaths": "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0448\u043B\u044F\u0445\u0438\u2026",
    "filter.maxPaths": "\u0429\u043E\u043D\u0430\u0439\u0431\u0456\u043B\u044C\u0448\u0435 100 \u0448\u043B\u044F\u0445\u0456\u0432",
    "filter.noPaths": "\u041D\u0435\u043C\u0430\u0454 \u0448\u043B\u044F\u0445\u0456\u0432 \u0434\u043B\u044F \u0432\u0438\u0431\u043E\u0440\u0443",
    "filter.loadPathsFailed": "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0448\u043B\u044F\u0445\u0438"
  };
  var es = {
    "branch.checkout": "Checkout de la rama",
    "branch.rename": "Renombrar rama",
    "branch.merge": "Fusionar en la rama actual",
    "branch.rebase": "Rebase aqu\xED",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "A\xF1adir a favoritos",
    "branch.unfavorite": "Quitar de favoritos",
    "branch.delete": "Eliminar rama",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "La rama {name} no se ha fusionado con la rama actual. La eliminaci\xF3n forzada har\xE1 perder sus commits.",
    "branch.forceDeleteButton": "Eliminar de forma forzada",
    "branch.notFound": "La rama {name} no existe",
    "branch.deleteFailed": "Error al eliminar la rama",
    "branch.notifyDeleted": "Rama eliminada: {name}",
    "branch.restore": "Restaurar",
    "branch.deleteTracking": "Eliminar rama de seguimiento",
    "branch.restoreSuccess": "La rama {name} se ha restaurado",
    "branch.restoreFailed": "Error al restaurar la rama",
    "branch.deleteTrackingFailed": "Error al eliminar la rama de seguimiento",
    "commit.copyRevision": "Copiar hash del commit",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Comparar con local",
    "commit.reset": "Restablecer la rama actual aqu\xED",
    "commit.revert": "Revertir commit",
    "commit.newBranch": "Nueva rama",
    "commit.newTag": "Nueva etiqueta",
    "batch.selected": "{n} commits seleccionados",
    "batch.copyHashes": "Copiar lista de hashes",
    "batch.cherryPickAll": "Cherry-pick de todos ({n})",
    "batch.revertAll": "Revertir todos ({n})",
    "batch.confirmCherryPick": "\xBFCherry-pick de los {n} commits seleccionados?",
    "batch.confirmRevert": "\xBFRevertir los {n} commits seleccionados?",
    "file.showDiff": "Mostrar diff",
    "file.showDiffNew": "Mostrar diff en una ventana nueva",
    "file.compareLocal": "Comparar con local",
    "file.compareBeforeLocal": "Comparar antes con local",
    "file.editSource": "Editar c\xF3digo fuente",
    "file.openRepoVersion": "Abrir versi\xF3n del repositorio",
    "file.revertChanges": "Revertir cambios seleccionados",
    "file.cherryPickChanges": "Cherry-pick de cambios seleccionados",
    "file.createPatch": "Crear parche",
    "file.getFromRevision": "Obtener de la revisi\xF3n",
    "file.historyUpTo": "Historia hasta aqu\xED",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Ocultar ramas de Git",
    "sidebar.showBranches": "Mostrar ramas de Git",
    "sidebar.newBranch": "Nueva rama",
    "sidebar.refresh": "Actualizar",
    "sidebar.update": "Actualizar",
    "sidebar.checkout": "Checkout",
    "sidebar.merge": "Fusionar",
    "sidebar.search": "Buscar",
    "sidebar.favorite": "Favorito",
    "sidebar.settings": "Configuraci\xF3n",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "Expandir todo",
    "sidebar.sort": "Ordenar",
    "sidebar.close": "Cerrar",
    "sidebar.noSelectedBranch": "Ninguna rama seleccionada",
    "settings.title": "Configuraci\xF3n de visualizaci\xF3n",
    "settings.showAuthor": "Mostrar columna de autor",
    "settings.showDate": "Mostrar columna de fecha",
    "settings.showHash": "Mostrar columna de hash",
    "goto.title": "Ir a la referencia",
    "goto.placeholder": "Introducir hash o nombre de la rama",
    "goto.notFound": "No se encontraron coincidencias",
    "goto.ok": "Ir",
    "sort.dateAsc": "Ordenar: fecha ascendente",
    "sort.authorAsc": "Ordenar: autor",
    "sort.messageAsc": "Ordenar: mensaje",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Rama",
    "filter.user": "Usuario",
    "filter.date": "Fecha",
    "filter.path": "Ruta",
    "filter.selectAll": "Seleccionar todo",
    "filter.regex": "Expresi\xF3n regular",
    "filter.case": "Distinguir may\xFAsculas",
    "filter.all": "Todos",
    "filter.localBranches": "Ramas locales",
    "filter.remoteBranches": "Ramas remotas",
    "filter.favorites": "Favoritos",
    "filter.today": "Hoy",
    "filter.thisWeek": "Esta semana",
    "filter.thisMonth": "Este mes",
    "filter.thisYear": "Este a\xF1o",
    "filter.custom": "Personalizado\u2026",
    "filter.dateFrom": "Fecha de inicio",
    "filter.dateTo": "Fecha de fin",
    "filter.chooseFolder": "Elegir carpeta\u2026",
    "filter.ok": "Aceptar",
    "filter.cancel": "Cancelar",
    "filter.clear": "Borrar",
    // 路径过滤（多选）
    "filter.selectPaths": "Seleccionar rutas para filtrar",
    "filter.editPaths": "Editar rutas\u2026",
    "filter.maxPaths": "M\xE1ximo 100 rutas permitidas",
    "filter.noPaths": "No hay rutas seleccionables",
    "filter.loadPathsFailed": "Error al cargar las rutas"
  };
  var ptBR = {
    "branch.checkout": "Fazer checkout do branch",
    "branch.rename": "Renomear branch",
    "branch.merge": "Merge no branch atual",
    "branch.rebase": "Rebase aqui",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "Adicionar aos favoritos",
    "branch.unfavorite": "Remover dos favoritos",
    "branch.delete": "Excluir branch",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "O branch {name} n\xE3o foi mesclado no branch atual. A exclus\xE3o for\xE7ada far\xE1 com que seus commits sejam perdidos.",
    "branch.forceDeleteButton": "Exclus\xE3o for\xE7ada",
    "branch.notFound": "O branch {name} n\xE3o existe",
    "branch.deleteFailed": "Falha ao excluir o branch",
    "branch.notifyDeleted": "Branch exclu\xEDdo: {name}",
    "branch.restore": "Restaurar",
    "branch.deleteTracking": "Excluir branch de rastreamento",
    "branch.restoreSuccess": "O branch {name} foi restaurado",
    "branch.restoreFailed": "Falha ao restaurar o branch",
    "branch.deleteTrackingFailed": "Falha ao excluir o branch de rastreamento",
    "commit.copyRevision": "Copiar hash do commit",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Comparar com local",
    "commit.reset": "Redefinir o branch atual para aqui",
    "commit.revert": "Reverter commit",
    "commit.newBranch": "Novo branch",
    "commit.newTag": "Nova tag",
    "batch.selected": "{n} commits selecionados",
    "batch.copyHashes": "Copiar lista de hashes",
    "batch.cherryPickAll": "Cherry-pick de todos ({n})",
    "batch.revertAll": "Reverter todos ({n})",
    "batch.confirmCherryPick": "Fazer cherry-pick dos {n} commits selecionados?",
    "batch.confirmRevert": "Reverter os {n} commits selecionados?",
    "file.showDiff": "Mostrar diff",
    "file.showDiffNew": "Mostrar diff em nova janela",
    "file.compareLocal": "Comparar com local",
    "file.compareBeforeLocal": "Comparar antes com local",
    "file.editSource": "Editar c\xF3digo-fonte",
    "file.openRepoVersion": "Abrir vers\xE3o do reposit\xF3rio",
    "file.revertChanges": "Reverter altera\xE7\xF5es selecionadas",
    "file.cherryPickChanges": "Cherry-pick das altera\xE7\xF5es selecionadas",
    "file.createPatch": "Criar patch",
    "file.getFromRevision": "Obter da revis\xE3o",
    "file.historyUpTo": "Hist\xF3rico at\xE9 aqui",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Ocultar branches do Git",
    "sidebar.showBranches": "Mostrar branches do Git",
    "sidebar.newBranch": "Novo branch",
    "sidebar.refresh": "Atualizar",
    "sidebar.update": "Atualizar",
    "sidebar.checkout": "Checkout",
    "sidebar.merge": "Merge",
    "sidebar.search": "Buscar",
    "sidebar.favorite": "Favorito",
    "sidebar.settings": "Configura\xE7\xF5es",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "Expandir tudo",
    "sidebar.sort": "Ordenar",
    "sidebar.close": "Fechar",
    "sidebar.noSelectedBranch": "Nenhum branch selecionado",
    "settings.title": "Configura\xE7\xF5es de exibi\xE7\xE3o",
    "settings.showAuthor": "Mostrar coluna de autor",
    "settings.showDate": "Mostrar coluna de data",
    "settings.showHash": "Mostrar coluna de hash",
    "goto.title": "Ir para a refer\xEAncia",
    "goto.placeholder": "Digite o hash ou o nome do branch",
    "goto.notFound": "Nenhuma correspond\xEAncia encontrada",
    "goto.ok": "Ir",
    "sort.dateAsc": "Ordenar: data crescente",
    "sort.authorAsc": "Ordenar: autor",
    "sort.messageAsc": "Ordenar: mensagem",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Branch",
    "filter.user": "Usu\xE1rio",
    "filter.date": "Data",
    "filter.path": "Caminho",
    "filter.selectAll": "Selecionar tudo",
    "filter.regex": "Express\xE3o regular",
    "filter.case": "Diferenciar mai\xFAsculas",
    "filter.all": "Todos",
    "filter.localBranches": "Branches locais",
    "filter.remoteBranches": "Branches remotos",
    "filter.favorites": "Favoritos",
    "filter.today": "Hoje",
    "filter.thisWeek": "Esta semana",
    "filter.thisMonth": "Este m\xEAs",
    "filter.thisYear": "Este ano",
    "filter.custom": "Personalizado\u2026",
    "filter.dateFrom": "Data de in\xEDcio",
    "filter.dateTo": "Data de t\xE9rmino",
    "filter.chooseFolder": "Escolher pasta\u2026",
    "filter.ok": "OK",
    "filter.cancel": "Cancelar",
    "filter.clear": "Limpar",
    // 路径过滤（多选）
    "filter.selectPaths": "Selecionar caminhos para filtrar",
    "filter.editPaths": "Editar caminhos\u2026",
    "filter.maxPaths": "No m\xE1ximo 100 caminhos permitidos",
    "filter.noPaths": "Nenhum caminho selecion\xE1vel",
    "filter.loadPathsFailed": "Falha ao carregar os caminhos"
  };
  var ko = {
    "branch.checkout": "\uBE0C\uB79C\uCE58 \uCCB4\uD06C\uC544\uC6C3",
    "branch.rename": "\uBE0C\uB79C\uCE58 \uC774\uB984 \uBCC0\uACBD",
    "branch.merge": "\uD604\uC7AC \uBE0C\uB79C\uCE58\uB85C \uBCD1\uD569",
    "branch.rebase": "\uC5EC\uAE30\uB85C \uB9AC\uBCA0\uC774\uC2A4",
    "branch.pull": "\uD480",
    "branch.push": "\uD478\uC2DC",
    "branch.favorite": "\uC990\uACA8\uCC3E\uAE30\uC5D0 \uCD94\uAC00",
    "branch.unfavorite": "\uC990\uACA8\uCC3E\uAE30\uC5D0\uC11C \uC81C\uAC70",
    "branch.delete": "\uBE0C\uB79C\uCE58 \uC0AD\uC81C",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "{name} \uBE0C\uB79C\uCE58\uAC00 \uD604\uC7AC \uBE0C\uB79C\uCE58\uC5D0 \uBCD1\uD569\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uAC15\uC81C \uC0AD\uC81C\uD558\uBA74 \uD574\uB2F9 \uBE0C\uB79C\uCE58\uC758 \uCEE4\uBC0B\uC774 \uC720\uC2E4\uB429\uB2C8\uB2E4.",
    "branch.forceDeleteButton": "\uAC15\uC81C \uC0AD\uC81C",
    "branch.notFound": "{name} \uBE0C\uB79C\uCE58\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    "branch.deleteFailed": "\uBE0C\uB79C\uCE58 \uC0AD\uC81C \uC2E4\uD328",
    "branch.notifyDeleted": "\uC0AD\uC81C\uB41C \uBE0C\uB79C\uCE58: {name}",
    "branch.restore": "\uBCF5\uC6D0",
    "branch.deleteTracking": "\uCD94\uC801 \uBE0C\uB79C\uCE58 \uC0AD\uC81C",
    "branch.restoreSuccess": "\uBE0C\uB79C\uCE58 {name}\uC774(\uAC00) \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    "branch.restoreFailed": "\uBE0C\uB79C\uCE58 \uBCF5\uC6D0 \uC2E4\uD328",
    "branch.deleteTrackingFailed": "\uCD94\uC801 \uBE0C\uB79C\uCE58 \uC0AD\uC81C \uC2E4\uD328",
    "commit.copyRevision": "\uCEE4\uBC0B \uD574\uC2DC \uBCF5\uC0AC",
    "commit.cherryPick": "\uCCB4\uB9AC\uD53D",
    "commit.compareLocal": "\uB85C\uCEEC\uACFC \uBE44\uAD50",
    "commit.reset": "\uD604\uC7AC \uBE0C\uB79C\uCE58\uB97C \uC5EC\uAE30\uB85C \uC7AC\uC124\uC815",
    "commit.revert": "\uCEE4\uBC0B \uB418\uB3CC\uB9AC\uAE30",
    "commit.newBranch": "\uC0C8 \uBE0C\uB79C\uCE58",
    "commit.newTag": "\uC0C8 \uD0DC\uADF8",
    "batch.selected": "{n}\uAC1C \uCEE4\uBC0B \uC120\uD0DD\uB428",
    "batch.copyHashes": "\uD574\uC2DC \uBAA9\uB85D \uBCF5\uC0AC",
    "batch.cherryPickAll": "\uBAA8\uB450 \uCCB4\uB9AC\uD53D ({n})",
    "batch.revertAll": "\uBAA8\uB450 \uB418\uB3CC\uB9AC\uAE30 ({n})",
    "batch.confirmCherryPick": "\uC120\uD0DD\uD55C {n}\uAC1C \uCEE4\uBC0B\uC744 \uCCB4\uB9AC\uD53D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    "batch.confirmRevert": "\uC120\uD0DD\uD55C {n}\uAC1C \uCEE4\uBC0B\uC744 \uB418\uB3CC\uB9AC\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    "file.showDiff": "\uCC28\uC774 \uD45C\uC2DC",
    "file.showDiffNew": "\uC0C8 \uCC3D\uC5D0\uC11C \uCC28\uC774 \uD45C\uC2DC",
    "file.compareLocal": "\uB85C\uCEEC\uACFC \uBE44\uAD50",
    "file.compareBeforeLocal": "\uBCC0\uACBD \uC804\uACFC \uB85C\uCEEC \uBE44\uAD50",
    "file.editSource": "\uC18C\uC2A4 \uD3B8\uC9D1",
    "file.openRepoVersion": "\uC800\uC7A5\uC18C \uBC84\uC804 \uC5F4\uAE30",
    "file.revertChanges": "\uC120\uD0DD\uD55C \uBCC0\uACBD \uB418\uB3CC\uB9AC\uAE30",
    "file.cherryPickChanges": "\uC120\uD0DD\uD55C \uBCC0\uACBD \uCCB4\uB9AC\uD53D",
    "file.createPatch": "\uD328\uCE58 \uB9CC\uB4E4\uAE30",
    "file.getFromRevision": "\uB9AC\uBE44\uC804\uC5D0\uC11C \uAC00\uC838\uC624\uAE30",
    "file.historyUpTo": "\uC5EC\uAE30\uAE4C\uC9C0\uC758 \uAE30\uB85D",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Git \uBE0C\uB79C\uCE58 \uC228\uAE30\uAE30",
    "sidebar.showBranches": "Git \uBE0C\uB79C\uCE58 \uD45C\uC2DC",
    "sidebar.newBranch": "\uC0C8 \uBE0C\uB79C\uCE58",
    "sidebar.refresh": "\uC0C8\uB85C\uACE0\uCE68",
    "sidebar.update": "\uC5C5\uB370\uC774\uD2B8",
    "sidebar.checkout": "\uCCB4\uD06C\uC544\uC6C3",
    "sidebar.merge": "\uBCD1\uD569",
    "sidebar.search": "\uAC80\uC0C9",
    "sidebar.favorite": "\uC990\uACA8\uCC3E\uAE30",
    "sidebar.settings": "\uC124\uC815",
    "sidebar.pull": "\uD480",
    "sidebar.expandAll": "\uBAA8\uB450 \uD3BC\uCE58\uAE30",
    "sidebar.sort": "\uC815\uB82C",
    "sidebar.close": "\uB2EB\uAE30",
    "sidebar.noSelectedBranch": "\uC120\uD0DD\uB41C \uBE0C\uB79C\uCE58 \uC5C6\uC74C",
    "settings.title": "\uD45C\uC2DC \uC124\uC815",
    "settings.showAuthor": "\uC791\uC131\uC790 \uC5F4 \uD45C\uC2DC",
    "settings.showDate": "\uB0A0\uC9DC \uC5F4 \uD45C\uC2DC",
    "settings.showHash": "\uD574\uC2DC \uC5F4 \uD45C\uC2DC",
    "goto.title": "\uCC38\uC870\uB85C \uC774\uB3D9",
    "goto.placeholder": "\uD574\uC2DC \uB610\uB294 \uBE0C\uB79C\uCE58 \uC774\uB984 \uC785\uB825",
    "goto.notFound": "\uC77C\uCE58\uD558\uB294 \uD56D\uBAA9 \uC5C6\uC74C",
    "goto.ok": "\uC774\uB3D9",
    "sort.dateAsc": "\uC815\uB82C: \uB0A0\uC9DC \uC624\uB984\uCC28\uC21C",
    "sort.authorAsc": "\uC815\uB82C: \uC791\uC131\uC790",
    "sort.messageAsc": "\uC815\uB82C: \uBA54\uC2DC\uC9C0",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "\uBE0C\uB79C\uCE58",
    "filter.user": "\uC0AC\uC6A9\uC790",
    "filter.date": "\uB0A0\uC9DC",
    "filter.path": "\uACBD\uB85C",
    "filter.selectAll": "\uBAA8\uB450 \uC120\uD0DD",
    "filter.regex": "\uC815\uADDC\uC2DD",
    "filter.case": "\uB300\uC18C\uBB38\uC790 \uAD6C\uBD84",
    "filter.all": "\uC804\uCCB4",
    "filter.localBranches": "\uB85C\uCEEC \uBE0C\uB79C\uCE58",
    "filter.remoteBranches": "\uC6D0\uACA9 \uBE0C\uB79C\uCE58",
    "filter.favorites": "\uC990\uACA8\uCC3E\uAE30",
    "filter.today": "\uC624\uB298",
    "filter.thisWeek": "\uC774\uBC88 \uC8FC",
    "filter.thisMonth": "\uC774\uBC88 \uB2EC",
    "filter.thisYear": "\uC62C\uD574",
    "filter.custom": "\uC0AC\uC6A9\uC790 \uC9C0\uC815\u2026",
    "filter.dateFrom": "\uC2DC\uC791 \uB0A0\uC9DC",
    "filter.dateTo": "\uC885\uB8CC \uB0A0\uC9DC",
    "filter.chooseFolder": "\uD3F4\uB354 \uC120\uD0DD\u2026",
    "filter.ok": "\uD655\uC778",
    "filter.cancel": "\uCDE8\uC18C",
    "filter.clear": "\uC9C0\uC6B0\uAE30",
    // 路径过滤（多选）
    "filter.selectPaths": "\uD544\uD130\uB9C1\uD560 \uACBD\uB85C \uC120\uD0DD",
    "filter.editPaths": "\uACBD\uB85C \uD3B8\uC9D1\u2026",
    "filter.maxPaths": "\uCD5C\uB300 100\uAC1C\uAE4C\uC9C0 \uC120\uD0DD \uAC00\uB2A5",
    "filter.noPaths": "\uC120\uD0DD \uAC00\uB2A5\uD55C \uACBD\uB85C \uC5C6\uC74C",
    "filter.loadPathsFailed": "\uACBD\uB85C \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328"
  };
  var pl = {
    "branch.checkout": "Przejd\u017A na ga\u0142\u0105\u017A",
    "branch.rename": "Zmie\u0144 nazw\u0119 ga\u0142\u0119zi",
    "branch.merge": "Scal z bie\u017C\u0105c\u0105 ga\u0142\u0119zi\u0105",
    "branch.rebase": "Rebase tutaj",
    "branch.pull": "Pobierz",
    "branch.push": "Wy\u015Blij",
    "branch.favorite": "Dodaj do ulubionych",
    "branch.unfavorite": "Usu\u0144 z ulubionych",
    "branch.delete": "Usu\u0144 ga\u0142\u0105\u017A",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "Ga\u0142\u0105\u017A {name} nie zosta\u0142a scalona z bie\u017C\u0105c\u0105 ga\u0142\u0119zi\u0105. Wymuszone usuni\u0119cie spowoduje utrat\u0119 jej commit\xF3w.",
    "branch.forceDeleteButton": "Usu\u0144 wymuszenie",
    "branch.notFound": "Ga\u0142\u0105\u017A {name} nie istnieje",
    "branch.deleteFailed": "Nie uda\u0142o si\u0119 usun\u0105\u0107 ga\u0142\u0119zi",
    "branch.notifyDeleted": "Usuni\u0119ta ga\u0142\u0105\u017A: {name}",
    "branch.restore": "Przywr\xF3\u0107",
    "branch.deleteTracking": "Usu\u0144 ga\u0142\u0105\u017A \u015Bledzenia",
    "branch.restoreSuccess": "Ga\u0142\u0105\u017A {name} zosta\u0142a przywr\xF3cona",
    "branch.restoreFailed": "Nie uda\u0142o si\u0119 przywr\xF3ci\u0107 ga\u0142\u0119zi",
    "branch.deleteTrackingFailed": "Nie uda\u0142o si\u0119 usun\u0105\u0107 ga\u0142\u0119zi \u015Bledzenia",
    "commit.copyRevision": "Kopiuj hash commita",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Por\xF3wnaj z lokalnym",
    "commit.reset": "Zresetuj bie\u017C\u0105c\u0105 ga\u0142\u0105\u017A tutaj",
    "commit.revert": "Cofnij commit",
    "commit.newBranch": "Nowa ga\u0142\u0105\u017A",
    "commit.newTag": "Nowy tag",
    "batch.selected": "Wybrano {n} commit\xF3w",
    "batch.copyHashes": "Kopiuj list\u0119 hashy",
    "batch.cherryPickAll": "Cherry-pick wszystkich ({n})",
    "batch.revertAll": "Cofnij wszystkie ({n})",
    "batch.confirmCherryPick": "Wykona\u0107 cherry-pick {n} wybranych commit\xF3w?",
    "batch.confirmRevert": "Cofn\u0105\u0107 {n} wybranych commit\xF3w?",
    "file.showDiff": "Poka\u017C diff",
    "file.showDiffNew": "Poka\u017C diff w nowym oknie",
    "file.compareLocal": "Por\xF3wnaj z lokalnym",
    "file.compareBeforeLocal": "Por\xF3wnaj przed zmian\u0105 z lokalnym",
    "file.editSource": "Edytuj kod \u017Ar\xF3d\u0142owy",
    "file.openRepoVersion": "Otw\xF3rz wersj\u0119 repozytorium",
    "file.revertChanges": "Cofnij zaznaczone zmiany",
    "file.cherryPickChanges": "Cherry-pick zaznaczonych zmian",
    "file.createPatch": "Utw\xF3rz poprawk\u0119",
    "file.getFromRevision": "Pobierz z rewizji",
    "file.historyUpTo": "Historia do tego miejsca",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Ukryj ga\u0142\u0119zie Git",
    "sidebar.showBranches": "Poka\u017C ga\u0142\u0119zie Git",
    "sidebar.newBranch": "Nowa ga\u0142\u0105\u017A",
    "sidebar.refresh": "Od\u015Bwie\u017C",
    "sidebar.update": "Aktualizuj",
    "sidebar.checkout": "Przejd\u017A",
    "sidebar.merge": "Scal",
    "sidebar.search": "Szukaj",
    "sidebar.favorite": "Ulubione",
    "sidebar.settings": "Ustawienia",
    "sidebar.pull": "Pobierz",
    "sidebar.expandAll": "Rozwi\u0144 wszystkie",
    "sidebar.sort": "Sortuj",
    "sidebar.close": "Zamknij",
    "sidebar.noSelectedBranch": "Nie wybrano ga\u0142\u0119zi",
    "settings.title": "Ustawienia widoku",
    "settings.showAuthor": "Poka\u017C kolumn\u0119 autora",
    "settings.showDate": "Poka\u017C kolumn\u0119 daty",
    "settings.showHash": "Poka\u017C kolumn\u0119 hashu",
    "goto.title": "Przejd\u017A do referencji",
    "goto.placeholder": "Wprowad\u017A hash lub nazw\u0119 ga\u0142\u0119zi",
    "goto.notFound": "Nie znaleziono dopasowa\u0144",
    "goto.ok": "Przejd\u017A",
    "sort.dateAsc": "Sortuj: rosn\u0105co wed\u0142ug daty",
    "sort.authorAsc": "Sortuj: autor",
    "sort.messageAsc": "Sortuj: wiadomo\u015B\u0107",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Ga\u0142\u0105\u017A",
    "filter.user": "U\u017Cytkownik",
    "filter.date": "Data",
    "filter.path": "\u015Acie\u017Cka",
    "filter.selectAll": "Zaznacz wszystko",
    "filter.regex": "Wyra\u017Cenie regularne",
    "filter.case": "Uwzgl\u0119dnij wielko\u015B\u0107 liter",
    "filter.all": "Wszystkie",
    "filter.localBranches": "Ga\u0142\u0119zie lokalne",
    "filter.remoteBranches": "Ga\u0142\u0119zie zdalne",
    "filter.favorites": "Ulubione",
    "filter.today": "Dzisiaj",
    "filter.thisWeek": "Ten tydzie\u0144",
    "filter.thisMonth": "Ten miesi\u0105c",
    "filter.thisYear": "Ten rok",
    "filter.custom": "Niestandardowe\u2026",
    "filter.dateFrom": "Data od",
    "filter.dateTo": "Data do",
    "filter.chooseFolder": "Wybierz folder\u2026",
    "filter.ok": "OK",
    "filter.cancel": "Anuluj",
    "filter.clear": "Wyczy\u015B\u0107",
    // 路径过滤（多选）
    "filter.selectPaths": "Wybierz \u015Bcie\u017Cki do filtrowania",
    "filter.editPaths": "Edytuj \u015Bcie\u017Cki\u2026",
    "filter.maxPaths": "Maksymalnie 100 \u015Bcie\u017Cek",
    "filter.noPaths": "Brak \u015Bcie\u017Cek do wyboru",
    "filter.loadPathsFailed": "Nie uda\u0142o si\u0119 wczyta\u0107 \u015Bcie\u017Cek"
  };
  var ja = {
    "branch.checkout": "\u30D6\u30E9\u30F3\u30C1\u3092\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8",
    "branch.rename": "\u30D6\u30E9\u30F3\u30C1\u306E\u540D\u524D\u3092\u5909\u66F4",
    "branch.merge": "\u73FE\u5728\u306E\u30D6\u30E9\u30F3\u30C1\u306B\u30DE\u30FC\u30B8",
    "branch.rebase": "\u3053\u3053\u306B\u30EA\u30D9\u30FC\u30B9",
    "branch.pull": "\u30D7\u30EB",
    "branch.push": "\u30D7\u30C3\u30B7\u30E5",
    "branch.favorite": "\u304A\u6C17\u306B\u5165\u308A\u306B\u8FFD\u52A0",
    "branch.unfavorite": "\u304A\u6C17\u306B\u5165\u308A\u304B\u3089\u524A\u9664",
    "branch.delete": "\u30D6\u30E9\u30F3\u30C1\u3092\u524A\u9664",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "\u30D6\u30E9\u30F3\u30C1 {name} \u306F\u73FE\u5728\u306E\u30D6\u30E9\u30F3\u30C1\u306B\u30DE\u30FC\u30B8\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u5F37\u5236\u524A\u9664\u3059\u308B\u3068\u305D\u306E\u4E0A\u306E\u30B3\u30DF\u30C3\u30C8\u306F\u5931\u308F\u308C\u307E\u3059\u3002",
    "branch.forceDeleteButton": "\u5F37\u5236\u524A\u9664",
    "branch.notFound": "\u30D6\u30E9\u30F3\u30C1 {name} \u306F\u5B58\u5728\u3057\u307E\u305B\u3093",
    "branch.deleteFailed": "\u30D6\u30E9\u30F3\u30C1\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    "branch.notifyDeleted": "\u524A\u9664\u3057\u305F\u30D6\u30E9\u30F3\u30C1: {name}",
    "branch.restore": "\u5143\u306B\u623B\u3059",
    "branch.deleteTracking": "\u8FFD\u8DE1\u30D6\u30E9\u30F3\u30C1\u3092\u524A\u9664",
    "branch.restoreSuccess": "\u30D6\u30E9\u30F3\u30C1 {name} \u3092\u5FA9\u5143\u3057\u307E\u3057\u305F",
    "branch.restoreFailed": "\u30D6\u30E9\u30F3\u30C1\u306E\u5FA9\u5143\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    "branch.deleteTrackingFailed": "\u8FFD\u8DE1\u30D6\u30E9\u30F3\u30C1\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    "commit.copyRevision": "\u30B3\u30DF\u30C3\u30C8\u30CF\u30C3\u30B7\u30E5\u3092\u30B3\u30D4\u30FC",
    "commit.cherryPick": "\u30C1\u30A7\u30EA\u30FC\u30D4\u30C3\u30AF",
    "commit.compareLocal": "\u30ED\u30FC\u30AB\u30EB\u3068\u6BD4\u8F03",
    "commit.reset": "\u73FE\u5728\u306E\u30D6\u30E9\u30F3\u30C1\u3092\u3053\u3053\u306B\u30EA\u30BB\u30C3\u30C8",
    "commit.revert": "\u30B3\u30DF\u30C3\u30C8\u3092 revert",
    "commit.newBranch": "\u65B0\u3057\u3044\u30D6\u30E9\u30F3\u30C1",
    "commit.newTag": "\u65B0\u3057\u3044\u30BF\u30B0",
    "batch.selected": "{n} \u4EF6\u306E\u30B3\u30DF\u30C3\u30C8\u3092\u9078\u629E\u4E2D",
    "batch.copyHashes": "\u30CF\u30C3\u30B7\u30E5\u4E00\u89A7\u3092\u30B3\u30D4\u30FC",
    "batch.cherryPickAll": "\u3059\u3079\u3066\u30C1\u30A7\u30EA\u30FC\u30D4\u30C3\u30AF ({n})",
    "batch.revertAll": "\u3059\u3079\u3066 revert ({n})",
    "batch.confirmCherryPick": "\u9078\u629E\u3057\u305F {n} \u4EF6\u306E\u30B3\u30DF\u30C3\u30C8\u3092\u30C1\u30A7\u30EA\u30FC\u30D4\u30C3\u30AF\u3057\u307E\u3059\u304B\uFF1F",
    "batch.confirmRevert": "\u9078\u629E\u3057\u305F {n} \u4EF6\u306E\u30B3\u30DF\u30C3\u30C8\u3092 revert \u3057\u307E\u3059\u304B\uFF1F",
    "file.showDiff": "\u5DEE\u5206\u3092\u8868\u793A",
    "file.showDiffNew": "\u65B0\u3057\u3044\u30A6\u30A3\u30F3\u30C9\u30A6\u3067\u5DEE\u5206\u3092\u8868\u793A",
    "file.compareLocal": "\u30ED\u30FC\u30AB\u30EB\u3068\u6BD4\u8F03",
    "file.compareBeforeLocal": "\u5909\u66F4\u524D\u3068\u30ED\u30FC\u30AB\u30EB\u3092\u6BD4\u8F03",
    "file.editSource": "\u30BD\u30FC\u30B9\u3092\u7DE8\u96C6",
    "file.openRepoVersion": "\u30EA\u30DD\u30B8\u30C8\u30EA\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3092\u958B\u304F",
    "file.revertChanges": "\u9078\u629E\u3057\u305F\u5909\u66F4\u3092 revert",
    "file.cherryPickChanges": "\u9078\u629E\u3057\u305F\u5909\u66F4\u3092\u30C1\u30A7\u30EA\u30FC\u30D4\u30C3\u30AF",
    "file.createPatch": "\u30D1\u30C3\u30C1\u3092\u4F5C\u6210",
    "file.getFromRevision": "\u30EA\u30D3\u30B8\u30E7\u30F3\u304B\u3089\u53D6\u5F97",
    "file.historyUpTo": "\u3053\u3053\u307E\u3067\u306E\u5C65\u6B74",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Git \u30D6\u30E9\u30F3\u30C1\u3092\u96A0\u3059",
    "sidebar.showBranches": "Git \u30D6\u30E9\u30F3\u30C1\u3092\u8868\u793A",
    "sidebar.newBranch": "\u65B0\u3057\u3044\u30D6\u30E9\u30F3\u30C1",
    "sidebar.refresh": "\u66F4\u65B0",
    "sidebar.update": "\u66F4\u65B0",
    "sidebar.checkout": "\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8",
    "sidebar.merge": "\u30DE\u30FC\u30B8",
    "sidebar.search": "\u691C\u7D22",
    "sidebar.favorite": "\u304A\u6C17\u306B\u5165\u308A",
    "sidebar.settings": "\u8A2D\u5B9A",
    "sidebar.pull": "\u30D7\u30EB",
    "sidebar.expandAll": "\u3059\u3079\u3066\u5C55\u958B",
    "sidebar.sort": "\u4E26\u3079\u66FF\u3048",
    "sidebar.close": "\u9589\u3058\u308B",
    "sidebar.noSelectedBranch": "\u30D6\u30E9\u30F3\u30C1\u304C\u672A\u9078\u629E",
    "settings.title": "\u8868\u793A\u8A2D\u5B9A",
    "settings.showAuthor": "\u4F5C\u8005\u5217\u3092\u8868\u793A",
    "settings.showDate": "\u65E5\u4ED8\u5217\u3092\u8868\u793A",
    "settings.showHash": "\u30CF\u30C3\u30B7\u30E5\u5217\u3092\u8868\u793A",
    "goto.title": "\u53C2\u7167\u3078\u79FB\u52D5",
    "goto.placeholder": "\u30CF\u30C3\u30B7\u30E5\u307E\u305F\u306F\u30D6\u30E9\u30F3\u30C1\u540D\u3092\u5165\u529B",
    "goto.notFound": "\u4E00\u81F4\u3059\u308B\u9805\u76EE\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    "goto.ok": "\u79FB\u52D5",
    "sort.dateAsc": "\u4E26\u3079\u66FF\u3048: \u65E5\u4ED8\u306E\u6607\u9806",
    "sort.authorAsc": "\u4E26\u3079\u66FF\u3048: \u4F5C\u8005",
    "sort.messageAsc": "\u4E26\u3079\u66FF\u3048: \u30E1\u30C3\u30BB\u30FC\u30B8",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "\u30D6\u30E9\u30F3\u30C1",
    "filter.user": "\u30E6\u30FC\u30B6\u30FC",
    "filter.date": "\u65E5\u4ED8",
    "filter.path": "\u30D1\u30B9",
    "filter.selectAll": "\u3059\u3079\u3066\u9078\u629E",
    "filter.regex": "\u6B63\u898F\u8868\u73FE",
    "filter.case": "\u5927\u6587\u5B57\u3068\u5C0F\u6587\u5B57\u3092\u533A\u5225",
    "filter.all": "\u3059\u3079\u3066",
    "filter.localBranches": "\u30ED\u30FC\u30AB\u30EB\u30D6\u30E9\u30F3\u30C1",
    "filter.remoteBranches": "\u30EA\u30E2\u30FC\u30C8\u30D6\u30E9\u30F3\u30C1",
    "filter.favorites": "\u304A\u6C17\u306B\u5165\u308A",
    "filter.today": "\u4ECA\u65E5",
    "filter.thisWeek": "\u4ECA\u9031",
    "filter.thisMonth": "\u4ECA\u6708",
    "filter.thisYear": "\u4ECA\u5E74",
    "filter.custom": "\u30AB\u30B9\u30BF\u30E0\u2026",
    "filter.dateFrom": "\u958B\u59CB\u65E5",
    "filter.dateTo": "\u7D42\u4E86\u65E5",
    "filter.chooseFolder": "\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u9078\u629E\u2026",
    "filter.ok": "OK",
    "filter.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
    "filter.clear": "\u30AF\u30EA\u30A2",
    // 路径过滤（多选）
    "filter.selectPaths": "\u30D5\u30A3\u30EB\u30BF\u30FC\u3059\u308B\u30D1\u30B9\u306E\u9078\u629E\u2026",
    "filter.editPaths": "\u30D1\u30B9\u3092\u7DE8\u96C6\u2026",
    "filter.maxPaths": "\u6700\u5927 100 \u4EF6\u307E\u3067\u9078\u629E\u53EF\u80FD",
    "filter.noPaths": "\u9078\u629E\u53EF\u80FD\u306A\u30D1\u30B9\u304C\u3042\u308A\u307E\u305B\u3093",
    "filter.loadPathsFailed": "\u30D1\u30B9\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F"
  };
  var tr = {
    "branch.checkout": "Dal\u0131 checkout et",
    "branch.rename": "Dal\u0131 yeniden adland\u0131r",
    "branch.merge": "Ge\xE7erli dala birle\u015Ftir",
    "branch.rebase": "Buraya rebase et",
    "branch.pull": "Pull",
    "branch.push": "Push",
    "branch.favorite": "Favorilere ekle",
    "branch.unfavorite": "Favorilerden kald\u0131r",
    "branch.delete": "Dal\u0131 sil",
    // 未合并强制删除对话框 + 删除通知（对齐 IDEA GitDeleteBranchOperation）
    "branch.forceDelete": "{name} dal\u0131 ge\xE7erli dala birle\u015Ftirilmemi\u015F. Zorla silmek \xFCzerindeki commitlerin kaybolmas\u0131na neden olur.",
    "branch.forceDeleteButton": "Zorla sil",
    "branch.notFound": "{name} dal\u0131 mevcut de\u011Fil",
    "branch.deleteFailed": "Dal silinemedi",
    "branch.notifyDeleted": "Silinen dal: {name}",
    "branch.restore": "Geri y\xFCkle",
    "branch.deleteTracking": "\u0130zleme dal\u0131n\u0131 sil",
    "branch.restoreSuccess": "Dal {name} geri y\xFCklendi",
    "branch.restoreFailed": "Dal geri y\xFCklenemedi",
    "branch.deleteTrackingFailed": "\u0130zleme dal\u0131 silinemedi",
    "commit.copyRevision": "Commit hash'ini kopyala",
    "commit.cherryPick": "Cherry-pick",
    "commit.compareLocal": "Yerel ile kar\u015F\u0131la\u015Ft\u0131r",
    "commit.reset": "Ge\xE7erli dal\u0131 buraya s\u0131f\u0131rla",
    "commit.revert": "Commit'i geri al",
    "commit.newBranch": "Yeni dal",
    "commit.newTag": "Yeni etiket",
    "batch.selected": "{n} commit se\xE7ildi",
    "batch.copyHashes": "Hash listesini kopyala",
    "batch.cherryPickAll": "T\xFCm\xFCn\xFC cherry-pick et ({n})",
    "batch.revertAll": "T\xFCm\xFCn\xFC geri al ({n})",
    "batch.confirmCherryPick": "Se\xE7ili {n} commit cherry-pick edilsin mi?",
    "batch.confirmRevert": "Se\xE7ili {n} commit geri al\u0131ns\u0131n m\u0131?",
    "file.showDiff": "Fark\u0131 g\xF6ster",
    "file.showDiffNew": "Fark\u0131 yeni pencerede g\xF6ster",
    "file.compareLocal": "Yerel ile kar\u015F\u0131la\u015Ft\u0131r",
    "file.compareBeforeLocal": "De\u011Fi\u015Fiklik \xF6ncesi ile yereli kar\u015F\u0131la\u015Ft\u0131r",
    "file.editSource": "Kayna\u011F\u0131 d\xFCzenle",
    "file.openRepoVersion": "Depo s\xFCr\xFCm\xFCn\xFC a\xE7",
    "file.revertChanges": "Se\xE7ili de\u011Fi\u015Fiklikleri geri al",
    "file.cherryPickChanges": "Se\xE7ili de\u011Fi\u015Fiklikleri cherry-pick et",
    "file.createPatch": "Yama olu\u015Ftur",
    "file.getFromRevision": "Revizyondan al",
    "file.historyUpTo": "Buraya kadar ge\xE7mi\u015F",
    // 侧边栏图标 / 显示设置 / 跳转 / 排序
    "sidebar.hideBranches": "Git dallar\u0131n\u0131 gizle",
    "sidebar.showBranches": "Git dallar\u0131n\u0131 g\xF6ster",
    "sidebar.newBranch": "Yeni dal",
    "sidebar.refresh": "Yenile",
    "sidebar.update": "G\xFCncelle",
    "sidebar.checkout": "Checkout",
    "sidebar.merge": "Birle\u015Ftir",
    "sidebar.search": "Ara",
    "sidebar.favorite": "Favori",
    "sidebar.settings": "Ayarlar",
    "sidebar.pull": "Pull",
    "sidebar.expandAll": "T\xFCm\xFCn\xFC geni\u015Flet",
    "sidebar.sort": "S\u0131rala",
    "sidebar.close": "Kapat",
    "sidebar.noSelectedBranch": "Dal se\xE7ilmedi",
    "settings.title": "G\xF6r\xFCn\xFCm ayarlar\u0131",
    "settings.showAuthor": "Yazar s\xFCtununu g\xF6ster",
    "settings.showDate": "Tarih s\xFCtununu g\xF6ster",
    "settings.showHash": "Hash s\xFCtununu g\xF6ster",
    "goto.title": "Referansa git",
    "goto.placeholder": "Hash veya dal ad\u0131 girin",
    "goto.notFound": "E\u015Fle\u015Fme bulunamad\u0131",
    "goto.ok": "Git",
    "sort.dateAsc": "S\u0131rala: tarihe g\xF6re artan",
    "sort.authorAsc": "S\u0131rala: yazar",
    "sort.messageAsc": "S\u0131rala: mesaj",
    // 工具栏过滤（分支 / 用户 / 日期 / 路径）
    "filter.branch": "Dal",
    "filter.user": "Kullan\u0131c\u0131",
    "filter.date": "Tarih",
    "filter.path": "Yol",
    "filter.selectAll": "T\xFCm\xFCn\xFC se\xE7",
    "filter.regex": "D\xFCzenli ifade",
    "filter.case": "B\xFCy\xFCk/k\xFC\xE7\xFCk harf duyarl\u0131",
    "filter.all": "T\xFCm\xFC",
    "filter.localBranches": "Yerel dallar",
    "filter.remoteBranches": "Uzak dallar",
    "filter.favorites": "Favoriler",
    "filter.today": "Bug\xFCn",
    "filter.thisWeek": "Bu hafta",
    "filter.thisMonth": "Bu ay",
    "filter.thisYear": "Bu y\u0131l",
    "filter.custom": "\xD6zel\u2026",
    "filter.dateFrom": "Ba\u015Flang\u0131\xE7 tarihi",
    "filter.dateTo": "Biti\u015F tarihi",
    "filter.chooseFolder": "Klas\xF6r se\xE7\u2026",
    "filter.ok": "Tamam",
    "filter.cancel": "\u0130ptal",
    "filter.clear": "Temizle",
    // 路径过滤（多选）
    "filter.selectPaths": "Filtrelenecek yollar\u0131 se\xE7",
    "filter.editPaths": "Yollar\u0131 d\xFCzenle\u2026",
    "filter.maxPaths": "En fazla 100 yol se\xE7ilebilir",
    "filter.noPaths": "Se\xE7ilebilir yol yok",
    "filter.loadPathsFailed": "Yollar y\xFCklenemedi"
  };
  var dicts = {
    en,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    de,
    fr,
    uk,
    es,
    "pt-BR": ptBR,
    ko,
    pl,
    ja,
    tr
  };
  var SUPPORTED = new Set(Object.keys(dicts).map((k) => k.toLowerCase()));
  var current = "zh-CN";
  function resolveLocale(raw) {
    const lower = raw.toLowerCase();
    if (SUPPORTED.has(lower)) {
      return Object.keys(dicts).find((k) => k.toLowerCase() === lower);
    }
    const base = lower.split(/[-_]/)[0];
    if (base === "zh") {
      if (lower.includes("tw") || lower.includes("hk") || lower.includes("hant")) return "zh-TW";
      return "zh-CN";
    }
    if (SUPPORTED.has(base)) {
      return Object.keys(dicts).find((k) => k.toLowerCase() === base);
    }
    const prefixed = Object.keys(dicts).find((k) => k.toLowerCase().startsWith(`${base}-`));
    return prefixed ?? "en";
  }
  function setLocale(locale) {
    current = resolveLocale(locale);
  }
  function t(key, params) {
    let text = dicts[current][key] ?? zhCN[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  }

  // panel/service.ts
  function createServiceClient(host2) {
    async function serviceCall(path, body) {
      const result = await host2.serviceRequest({
        method: "POST",
        path: `/${path}`,
        body: JSON.stringify(body)
      });
      if (result.status !== 200) {
        throw new Error(result.body);
      }
      try {
        return JSON.parse(result.body);
      } catch {
        throw new Error(`\u89E3\u6790\u54CD\u5E94\u5931\u8D25: ${result.body}`);
      }
    }
    async function safeServiceCall(path, body) {
      try {
        const data = await serviceCall(path, body);
        return { success: true, data };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error(`[git-manager] ${path} \u8C03\u7528\u5931\u8D25:`, error);
        return { success: false, error };
      }
    }
    async function getBranches(directory2) {
      return serviceCall(
        "git-branches",
        { directory: directory2 }
      );
    }
    async function checkoutBranch(directory2, branch) {
      await serviceCall("git-stash", { directory: directory2 });
      await serviceCall("git-checkout", { directory: directory2, branch });
    }
    async function mergeBranch(directory2, branch) {
      return serviceCall("git-merge", { directory: directory2, branch });
    }
    async function deleteBranch(directory2, branch, force) {
      return serviceCall("git-delete-branch", { directory: directory2, branch, force });
    }
    async function restoreBranch(directory2, branch, tip, upstream) {
      return serviceCall("git-restore-branch", {
        directory: directory2,
        branch,
        tip,
        // undefined/null 不携带该键，与"省略 upstream"语义一致
        ...upstream ? { upstream } : {}
      });
    }
    async function deleteRemoteBranch(directory2, remote, branch) {
      return serviceCall("git-delete-remote-branch", { directory: directory2, remote, branch });
    }
    async function checkoutNewBranch(directory2, name, startPoint) {
      return serviceCall("git-checkout-new", { directory: directory2, name, startPoint });
    }
    async function createNewBranch(directory2, name, startPoint) {
      return serviceCall("git-create-branch", { directory: directory2, name, startPoint });
    }
    async function debugLog(event, data = {}) {
      try {
        await serviceCall("git-debug-log", { event, data });
      } catch {
      }
    }
    async function renameBranch(directory2, oldName, newName) {
      return serviceCall("git-rename-branch", { directory: directory2, oldName, newName });
    }
    async function rebaseBranch(directory2, branch) {
      return serviceCall("git-rebase", { directory: directory2, branch });
    }
    async function rebaseAbort(directory2) {
      return serviceCall("git-rebase-abort", { directory: directory2 });
    }
    async function rebaseContinue(directory2) {
      return serviceCall("git-rebase-continue", { directory: directory2 });
    }
    async function cherryPick(directory2, hash) {
      return serviceCall("git-cherry-pick", { directory: directory2, hash });
    }
    async function stash(directory2) {
      return serviceCall("git-stash-now", { directory: directory2 });
    }
    async function fetch(directory2) {
      return serviceCall("git-fetch", { directory: directory2 });
    }
    async function pull(directory2) {
      return serviceCall("git-pull", { directory: directory2 });
    }
    async function push(directory2) {
      return serviceCall("git-push", { directory: directory2 });
    }
    async function forcePush(directory2) {
      return serviceCall("git-force-push", { directory: directory2 });
    }
    async function getLog(directory2, branch, paths) {
      return serviceCall(
        "git-log",
        { directory: directory2, branch, path: paths }
      );
    }
    async function listFiles(directory2) {
      return serviceCall(
        "git-files",
        { directory: directory2 }
      );
    }
    async function getCommitDetail(directory2, hash) {
      return serviceCall("git-commit-detail", { directory: directory2, hash });
    }
    async function getCommitDiffs(directory2, hash) {
      return serviceCall("git-commit-diffs", { directory: directory2, hash });
    }
    async function diffVsLocal(directory2, hash) {
      return serviceCall("git-diff-vs-local", { directory: directory2, hash });
    }
    async function getBranchDiff(directory2, from, to) {
      return serviceCall("git-branch-diff", { directory: directory2, from, to });
    }
    async function reset(directory2, hash, mode) {
      return serviceCall("git-reset", { directory: directory2, hash, mode });
    }
    async function revert(directory2, hash) {
      return serviceCall("git-revert", { directory: directory2, hash });
    }
    async function undoCommit(directory2, hash) {
      return serviceCall("git-undo-commit", { directory: directory2, hash });
    }
    async function getStatus(directory2) {
      return serviceCall("git-status", { directory: directory2 });
    }
    async function getFavorites(directory2) {
      return serviceCall("git-favorites-get", { directory: directory2 });
    }
    async function saveFavorites(directory2, favorites) {
      return serviceCall("git-favorites-set", { directory: directory2, favorites });
    }
    async function isGitRepository(directory2) {
      return serviceCall("git-is-repo", { directory: directory2 });
    }
    return {
      serviceCall,
      safeServiceCall,
      getBranches,
      checkoutBranch,
      mergeBranch,
      deleteBranch,
      restoreBranch,
      deleteRemoteBranch,
      checkoutNewBranch,
      createNewBranch,
      debugLog,
      renameBranch,
      rebaseBranch,
      rebaseAbort,
      rebaseContinue,
      cherryPick,
      stash,
      fetch,
      pull,
      push,
      forcePush,
      getLog,
      listFiles,
      getCommitDetail,
      getCommitDiffs,
      diffVsLocal,
      getBranchDiff,
      reset,
      revert,
      undoCommit,
      getStatus,
      getFavorites,
      saveFavorites,
      isGitRepository
    };
  }

  // panel/icons.ts
  var ICONS = {
    // 隐藏分支面板 (←)：分支面板展开时显示，点击可收起
    hideBranches: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 13L5 8L10 3" stroke="#6E6E6E" stroke-width="2"/></svg>`
    },
    // 显示分支面板 (>)：分支面板隐藏时显示，点击可展开
    showBranches: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 13L11 8L6 3" stroke="#6E6E6E" stroke-width="2"/></svg>`
    },
    // 新建分支 (+)
    newBranch: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V14M2 8H14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // 签出分支 (checkout)
    checkout: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect width="2" height="12.332" x="7.927" y=".901" fill="#389FD6" transform="rotate(45 8.927 7.067)"/><polygon fill="#389FD6" points="3 6 10 13 3 13"/></g></svg>`
    },
    // 删除分支 (trash)
    delete: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4H13M5 4V3C5 2.45 5.45 2 6 2H10C10.55 2 11 2.45 11 3V4M4 4L5 14H11L12 4M6.5 7V11M9.5 7V11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 刷新 (refresh)
    refresh: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.5747152,11.8852806 C11.4741474,13.1817355 9.83247882,14.0044386 7.99865879,14.0044386 C5.03907292,14.0044386 2.57997332,11.8615894 2.08820756,9.0427473 L3.94774327,9.10768372 C4.43372186,10.8898575 6.06393114,12.2000519 8.00015362,12.2000519 C9.30149237,12.2000519 10.4645985,11.6082097 11.2349873,10.6790094 L9.05000019,8.71167959 L14.0431479,8.44999981 L14.3048222,13.4430431 L12.5747152,11.8852806 Z M3.42785637,4.11741586 C4.52839138,2.82452748 6.16775464,2.00443857 7.99865879,2.00443857 C10.918604,2.00443857 13.3513802,4.09026967 13.8882946,6.8532307 L12.0226389,6.78808057 C11.5024872,5.05935553 9.89838095,3.8000774 8.00015362,3.8000774 C6.69867367,3.8000774 5.53545628,4.39204806 4.76506921,5.32142241 L6.95482203,7.29304326 L1.96167436,7.55472304 L1.70000005,2.56167973 L3.42785637,4.11741586 Z" fill="#6E6E6E"/></svg>`
    },
    // 收藏 (star)
    favorite: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon fill="#F4AF3D" fill-rule="evenodd" points="7.998 11.522 3.673 14.311 4.989 9.336 1 6.084 6.138 5.798 7.998 1 9.858 5.798 14.996 6.084 11.007 9.336 12.323 14.311"/></svg>`
    },
    // 未收藏 (star outline)
    favoriteOutline: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1L10.2 5.4L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.4L8 1Z" stroke="#F4AF3D" stroke-width="1.5" stroke-linejoin="round"/></svg>`
    },
    // 设置 (gear)
    settings: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="3" stroke="#6E6E6E" stroke-width="1.5"/></svg>`
    },
    // 全部展开 (expand)
    expandAll: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect width="12" height="2" x="2" y="1" fill="#6E6E6E"/><rect width="12" height="2" x="2" y="13" fill="#6E6E6E"/><polygon fill="#6E6E6E" points="8 9 11.5 12 4.5 12" transform="matrix(1 0 0 -1 0 21)"/><polygon fill="#6E6E6E" points="8 4 11.5 7 4.5 7"/></g></svg>`
    },
    // 排序 (sort)
    sort: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3V13M4 13L2 11M4 13L6 11M12 13V3M12 3L10 5M12 3L14 5" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 远程 (globe)
    remote: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="#6E6E6E" stroke-width="1.5"/><path d="M2 8H14M8 2C10 4 10 12 8 14M6 2C4 4 4 12 6 14M10 2C12 4 12 12 10 14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // Pull (下载)
    pull: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // Push (上传)
    push: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10V2M8 2L5 5M8 2L11 5M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 关闭 (x)
    close: {
      svg: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L8 8M8 2L2 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // 更多选项 (more)
    more: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="3" r="1.5" fill="#6E6E6E"/><circle cx="8" cy="8" r="1.5" fill="#6E6E6E"/><circle cx="8" cy="13" r="1.5" fill="#6E6E6E"/></svg>`
    },
    // 正则 (regex)
    regex: {
      svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7C3 5 5 3 7 3C9 3 11 5 11 7C11 9 9 11 7 11" stroke="#6E6E6E" stroke-width="1.2" stroke-linecap="round"/><path d="M4 4L2 2M10 4L12 2" stroke="#6E6E6E" stroke-width="1.2" stroke-linecap="round"/></svg>`
    },
    // 搜索 (magnifier)
    search: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="4.5" stroke="#6E6E6E" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // 当前分支 (checkmark)
    currentBranch: {
      svg: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8L7 11L12 5" stroke="#589df6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 未推送 (上传箭头)
    unpushed: {
      svg: `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10V2M8 2L5 5M8 2L11 5" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 未拉取 (下载箭头)
    unpulled: {
      svg: `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="#589df6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 本地分支 (分支图标)
    localBranch: {
      svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 2V14M12 2V14M4 8H12M4 5H12M4 11H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // 远程分支 (分支图标)
    remoteBranch: {
      svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 2V14M12 2V14M4 8H12M4 5H12M4 11H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="5" r="1.5" fill="#6E6E6E"/><circle cx="12" cy="5" r="1.5" fill="#6E6E6E"/></svg>`
    },
    // 标签 (tag)
    tag: {
      svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2H7L14 9L9 14L2 7V2Z" stroke="#6E6E6E" stroke-width="1.5" stroke-linejoin="round"/></svg>`
    },
    // 加载中 (spinner)
    loading: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/></path></svg>`
    },
    // 下载 (download)
    download: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M8 10L5 7M8 10L11 7M2 12V14H14V12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 对比 (compare)
    compare: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3V13M12 3V13M4 8H12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><path d="M6 5L3 8L6 11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 5L13 8L10 11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    // 分支图标 (branch)
    branchIcon: {
      svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2V14M11 2V14M5 8H11" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="5" cy="5" r="2" fill="#6E6E6E"/><circle cx="11" cy="11" r="2" fill="#6E6E6E"/></svg>`
    },
    // 图形 (graph)
    graph: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="2" stroke="#6E6E6E" stroke-width="1.5"/><circle cx="4" cy="12" r="2" stroke="#6E6E6E" stroke-width="1.5"/><circle cx="12" cy="8" r="2" stroke="#6E6E6E" stroke-width="1.5"/><path d="M4 6V10M6 4H8L10 8M6 12H8L10 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    // 设置齿轮 (gearSettings)
    gearSettings: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.9 2.9L4.3 4.3M11.7 11.7L13.1 13.1M13.1 2.9L11.7 4.3M4.3 11.7L2.9 13.1" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="3" stroke="#6E6E6E" stroke-width="1.5"/></svg>`
    },
    // 跳转到引用 (goToRef)
    goToRef: {
      svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    }
  };
  function getIcon(name) {
    return ICONS[name]?.svg ?? "";
  }

  // panel/components/dialogs.ts
  function showRenameDialog(branch, service2, directory2) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">重命名分支: ${branch.name}</div>
        <input id="rename-input" type="text" value="${branch.name}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="rename-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="rename-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">确定</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#rename-input");
    input.focus();
    input.select();
    const close = () => overlay.remove();
    overlay.querySelector("#rename-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector("#rename-ok")?.addEventListener("click", async () => {
      const newName = input.value.trim();
      if (!newName || newName === branch.name) {
        close();
        return;
      }
      try {
        await service2.renameBranch(directory2, branch.name, newName);
        const branches = await service2.getBranches(directory2);
        setState((s) => {
          s.branches = branches;
        });
      } catch (e) {
        console.error("[git-manager] \u91CD\u547D\u540D\u5206\u652F\u5931\u8D25:", e);
      }
      close();
    });
  }
  function showCreateBranchDialog(service2, directory2, startPoint) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">新建分支</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px;">起点：${startPoint ? startPoint.slice(0, 8) : "\u5F53\u524D HEAD"}</div>
        <input id="new-branch-input" type="text" placeholder="输入分支名称..." style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="create-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="create-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">创建</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#new-branch-input");
    input.focus();
    const close = () => overlay.remove();
    overlay.querySelector("#create-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    const doCreate = async () => {
      const name = input.value.trim();
      if (!name) return;
      void service2.debugLog?.("create-branch-submit", { name, startPoint: startPoint ?? null });
      try {
        await service2.createNewBranch(directory2, name, startPoint);
        const branches = await service2.getBranches(directory2);
        setState((s) => {
          s.branches = branches;
        });
      } catch (e) {
        console.error("[git-manager] \u521B\u5EFA\u5206\u652F\u5931\u8D25:", e);
      }
      close();
    };
    overlay.querySelector("#create-ok")?.addEventListener("click", doCreate);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doCreate();
    });
  }
  function showGotoDialog(onSubmit) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t("goto.title")}</div>
        <input id="goto-input" type="text" placeholder="${t("goto.placeholder")}" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 8px;" />
        <div id="goto-error" style="display: none; font-size: 11px; color: #f44336; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="goto-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="goto-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t("goto.ok")}</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#goto-input");
    const errorEl = overlay.querySelector("#goto-error");
    input.focus();
    const close = () => overlay.remove();
    const clearError = () => {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    };
    const submit = () => {
      const query = input.value.trim();
      if (!query) return;
      if (onSubmit(query)) {
        close();
        return;
      }
      errorEl.textContent = t("goto.notFound");
      errorEl.style.display = "block";
    };
    overlay.querySelector("#goto-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    input.addEventListener("input", clearError);
    overlay.querySelector("#goto-ok")?.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }
  function showDateRangeDialog(onApply) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t("filter.date")}</div>
        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t("filter.dateFrom")}</div>
          <input id="daterange-from" type="date" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t("filter.dateTo")}</div>
          <input id="daterange-to" type="date" style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box;" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="daterange-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t("filter.ok")}</button>
          <button id="daterange-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.clear")}</button>
          <button id="daterange-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.cancel")}</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeydown);
    overlay.querySelector("#daterange-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector("#daterange-ok")?.addEventListener("click", () => {
      const fromInput = overlay.querySelector("#daterange-from");
      const toInput = overlay.querySelector("#daterange-to");
      let from = fromInput.value;
      let to = toInput.value;
      if (from && to && from > to) {
        console.debug(JSON.stringify({ prefix: "[dialog]", event: "date_range_swap", from, to }));
        [from, to] = [to, from];
      }
      onApply({ from, to });
      close();
    });
    overlay.querySelector("#daterange-clear")?.addEventListener("click", () => {
      onApply({ from: "", to: "" });
      close();
    });
    return close;
  }
  var MAX_SELECTABLE_PATHS = 100;
  function parsePathLines(raw) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const line of raw.split("\n")) {
      const path = line.trim();
      if (!path || seen.has(path)) continue;
      seen.add(path);
      result.push(path);
    }
    return result;
  }
  function showPathFilterDialog(selected, onApply) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t("filter.path")}</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${t("filter.editPaths")}</div>
        <textarea id="pathfilter-input" placeholder="src/ 或 packages/core" style="width: 100%; height: 120px; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 8px; resize: vertical; font-family: inherit;">${selected.join("\n")}</textarea>
        <div id="pathfilter-hint" style="display: none; font-size: 11px; color: #ffb300; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="pathfilter-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t("filter.ok")}</button>
          <button id="pathfilter-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.clear")}</button>
          <button id="pathfilter-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.cancel")}</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeydown);
    const input = overlay.querySelector("#pathfilter-input");
    const hintEl = overlay.querySelector("#pathfilter-hint");
    const showHint = (message) => {
      hintEl.textContent = message;
      hintEl.style.display = "block";
    };
    const hideHint = () => {
      hintEl.textContent = "";
      hintEl.style.display = "none";
    };
    input.addEventListener("input", hideHint);
    overlay.querySelector("#pathfilter-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector("#pathfilter-ok")?.addEventListener("click", () => {
      const paths = parsePathLines(input.value);
      if (paths.length > MAX_SELECTABLE_PATHS) {
        showHint(t("filter.maxPaths"));
        console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_filter_overflow", count: paths.length }));
        return;
      }
      console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_filter_apply", paths }));
      onApply(paths);
      close();
    });
    overlay.querySelector("#pathfilter-clear")?.addEventListener("click", () => {
      console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_filter_clear" }));
      onApply([]);
      close();
    });
  }
  function buildPathTree(files) {
    const roots = [];
    const byPath = /* @__PURE__ */ new Map();
    for (const file of files) {
      if (!file) continue;
      const segments = file.split("/");
      let parentNode = null;
      let currentPath = "";
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment) continue;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const isLast = i === segments.length - 1;
        let node = byPath.get(currentPath);
        if (!node) {
          node = { path: currentPath, name: segment, isDir: !isLast, children: [] };
          byPath.set(currentPath, node);
          if (parentNode) parentNode.children.push(node);
          else roots.push(node);
        } else if (!isLast) {
          node.isDir = true;
        }
        parentNode = node;
      }
    }
    sortPathNodes(roots);
    return { roots, byPath };
  }
  function sortPathNodes(nodes) {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortPathNodes(node.children);
    }
  }
  function ancestorPathsOf(path) {
    const segments = path.split("/");
    const result = [];
    let acc = "";
    for (let i = 0; i < segments.length - 1; i++) {
      if (!segments[i]) continue;
      acc = acc ? `${acc}/${segments[i]}` : segments[i];
      result.push(acc);
    }
    return result;
  }
  function computeCheckStates(roots, selected) {
    const states = /* @__PURE__ */ new Map();
    const walk = (node) => {
      const covered = selected.has(node.path) || ancestorPathsOf(node.path).some((p) => selected.has(p));
      let state;
      if (covered) {
        state = "on";
      } else if (node.children.length === 0) {
        state = "off";
      } else {
        const childStates = node.children.map(walk);
        const checkedCount = childStates.filter((s) => s !== "off").length;
        if (checkedCount === 0) state = "off";
        else if (checkedCount === childStates.length && childStates.every((s) => s === "on")) state = "on";
        else state = "half";
      }
      states.set(node.path, state);
      if (covered) {
        node.children.forEach(walk);
      }
      return state;
    };
    roots.forEach(walk);
    return states;
  }
  function fillSiblingsAlongPath(selected, byPath, ancestor, target) {
    const segments = target.slice(ancestor.length + 1).split("/").filter(Boolean);
    let parentPath = ancestor;
    for (const segment of segments) {
      const parentNode = byPath.get(parentPath);
      if (!parentNode) break;
      const nextHop = `${parentPath}/${segment}`;
      for (const child of parentNode.children) {
        if (child.path !== nextHop) selected.add(child.path);
      }
      parentPath = nextHop;
    }
  }
  function showPathTreeDialog(service2, directory2, selected, onApply) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 360px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t("filter.selectPaths")}</div>
        <div id="pathtree-list" style="height: 240px; overflow: auto; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; padding: 4px 0; box-sizing: border-box;"></div>
        <div id="pathtree-hint" style="display: none; font-size: 11px; color: #ffb300; margin-top: 6px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
          <button id="pathtree-ok" disabled style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">${t("filter.ok")}</button>
          <button id="pathtree-clear" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.clear")}</button>
          <button id="pathtree-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.cancel")}</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const selectedSet = new Set(selected);
    const expanded = /* @__PURE__ */ new Set();
    let roots = [];
    let byPath = /* @__PURE__ */ new Map();
    let orphanPaths = [];
    let loaded = false;
    let failed = false;
    let closed = false;
    const listEl = overlay.querySelector("#pathtree-list");
    const hintEl = overlay.querySelector("#pathtree-hint");
    const okBtn = overlay.querySelector("#pathtree-ok");
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeydown);
    const showHint = (message) => {
      hintEl.textContent = message;
      hintEl.style.display = "block";
    };
    const hideHint = () => {
      hintEl.textContent = "";
      hintEl.style.display = "none";
    };
    const handleCheckClick = (path) => {
      const snapshot = new Set(selectedSet);
      if (selectedSet.has(path)) {
        selectedSet.delete(path);
      } else {
        const coveredAncestor = ancestorPathsOf(path).reverse().find((p) => selectedSet.has(p));
        if (coveredAncestor) {
          selectedSet.delete(coveredAncestor);
          fillSiblingsAlongPath(selectedSet, byPath, coveredAncestor, path);
        } else {
          selectedSet.add(path);
        }
      }
      if (selectedSet.size > MAX_SELECTABLE_PATHS) {
        selectedSet.clear();
        for (const value of snapshot) selectedSet.add(value);
        showHint(t("filter.maxPaths"));
        console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_tree_overflow", size: snapshot.size }));
      } else {
        hideHint();
      }
      render2();
    };
    const renderNode = (node, depth, states, container) => {
      const state = states.get(node.path) ?? "off";
      const expandable = node.isDir && node.children.length > 0;
      const isExpanded = expanded.has(node.path);
      const row = document.createElement("div");
      row.className = "pathtree-row";
      row.dataset.path = node.path;
      row.dataset.depth = String(depth);
      row.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 2px 6px 2px ${6 + depth * 14}px; cursor: pointer; font-size: 12px; color: #ccc;`;
      const toggle = document.createElement("span");
      toggle.className = "pathtree-toggle";
      toggle.style.cssText = "width: 12px; flex: none; display: inline-block; text-align: center; user-select: none;";
      toggle.textContent = expandable ? isExpanded ? "\u25BE" : "\u25B8" : "";
      row.appendChild(toggle);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state === "on";
      checkbox.indeterminate = state === "half";
      row.appendChild(checkbox);
      const label = document.createElement("span");
      label.textContent = node.name;
      row.appendChild(label);
      row.addEventListener("click", (e) => {
        const target = e.target;
        if (target.classList.contains("pathtree-toggle")) {
          if (!expandable) return;
          if (expanded.has(node.path)) expanded.delete(node.path);
          else expanded.add(node.path);
          render2();
          return;
        }
        handleCheckClick(node.path);
      });
      container.appendChild(row);
      if (expandable && isExpanded) {
        for (const child of node.children) renderNode(child, depth + 1, states, container);
      }
    };
    const render2 = () => {
      if (closed) return;
      listEl.innerHTML = "";
      if (failed) {
        const error = document.createElement("div");
        error.id = "pathtree-error";
        error.style.cssText = "padding: 8px; font-size: 12px; color: #f44336;";
        error.textContent = t("filter.loadPathsFailed");
        listEl.appendChild(error);
        return;
      }
      if (!loaded) return;
      const nodes = [...roots];
      for (const path of orphanPaths) {
        nodes.push({ path, name: path, isDir: false, children: [] });
      }
      sortPathNodes(nodes);
      if (nodes.length === 0) {
        const empty = document.createElement("div");
        empty.id = "pathtree-empty";
        empty.style.cssText = "padding: 8px; font-size: 12px; color: #888;";
        empty.textContent = t("filter.noPaths");
        listEl.appendChild(empty);
        okBtn.disabled = true;
        return;
      }
      okBtn.disabled = false;
      const states = computeCheckStates(nodes, selectedSet);
      for (const node of nodes) renderNode(node, 0, states, listEl);
    };
    overlay.querySelector("#pathtree-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    okBtn.addEventListener("click", () => {
      const paths = [...selectedSet];
      console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_tree_apply", count: paths.length }));
      onApply(paths);
      close();
    });
    overlay.querySelector("#pathtree-clear")?.addEventListener("click", () => {
      selectedSet.clear();
      console.debug(JSON.stringify({ prefix: "[dialog]", event: "path_tree_clear" }));
      onApply([]);
      close();
    });
    render2();
    service2.listFiles(directory2).then((files) => {
      if (closed) return;
      const tree = buildPathTree(files ?? []);
      roots = tree.roots;
      byPath = tree.byPath;
      orphanPaths = [...selected].filter((p) => !byPath.has(p));
      for (const node of roots) {
        if (node.isDir && node.children.length > 0) expanded.add(node.path);
      }
      loaded = true;
      render2();
    }).catch((e) => {
      if (closed) return;
      failed = true;
      console.error(JSON.stringify({ prefix: "[dialog]", event: "list_files_error", directory: directory2, error: String(e) }));
      render2();
    });
  }
  function parseDeleteBranchError(e) {
    const raw = e instanceof Error ? e.message : String(e);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          code: typeof parsed.code === "string" ? parsed.code : void 0,
          message: typeof parsed.message === "string" ? parsed.message : raw
        };
      }
    } catch {
    }
    return { message: raw };
  }
  function showDeleteBranchDialog(branchName, onConfirm) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div id="delete-branch-message" style="font-size: 14px; color: #ccc; margin-bottom: 12px;">${t("branch.forceDelete", { name: branchName })}</div>
        <div id="delete-branch-error" style="display: none; font-size: 11px; color: #f44336; margin-bottom: 8px;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="delete-branch-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">${t("filter.cancel")}</button>
          <button id="delete-branch-ok" style="padding: 4px 12px; background: #b71c1c; border: 1px solid #c62828; border-radius: 3px; color: #fff; cursor: pointer;">${t("branch.forceDeleteButton")}</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    let pending = false;
    let closed = false;
    const errorEl = overlay.querySelector("#delete-branch-error");
    const okBtn = overlay.querySelector("#delete-branch-ok");
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeydown);
    const showError = (message) => {
      errorEl.textContent = message;
      errorEl.style.display = "block";
    };
    const hideError = () => {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    };
    const submit = async () => {
      if (pending) return;
      pending = true;
      okBtn.disabled = true;
      hideError();
      console.debug(JSON.stringify({ prefix: "[dialog]", event: "branch_delete_confirm", branch: branchName, force: true }));
      try {
        await onConfirm(true);
        close();
      } catch (e) {
        const { code, message } = parseDeleteBranchError(e);
        if (code === "NOT_FOUND") {
          showError(t("branch.notFound", { name: branchName }));
        } else if (code === "GIT_ERROR") {
          showError(`${t("branch.deleteFailed")}: ${message}`);
        } else {
          showError(message);
        }
        console.debug(JSON.stringify({
          prefix: "[dialog]",
          event: "branch_delete_failed",
          branch: branchName,
          code: code ?? null,
          message
        }));
      } finally {
        pending = false;
        if (!closed) okBtn.disabled = false;
      }
    };
    overlay.querySelector("#delete-branch-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    okBtn.addEventListener("click", () => {
      void submit();
    });
  }

  // panel/components/notify.ts
  var NOTIFY_TTL_MS = 1e4;
  var currentClose = null;
  function showBranchDeletedNotify(options) {
    currentClose?.();
    const card = document.createElement("div");
    card.id = "git-branch-deleted-notify";
    card.style.cssText = [
      "position: fixed",
      "right: 12px",
      "bottom: 12px",
      "z-index: 1100",
      "background: #2a2a2a",
      "border: 1px solid #444",
      "border-radius: 6px",
      "padding: 10px 12px",
      "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5)",
      "font-size: 12px",
      "color: #ccc",
      "max-width: 320px"
    ].join("; ");
    const message = document.createElement("div");
    message.textContent = t("branch.notifyDeleted", { name: options.branchName });
    card.appendChild(message);
    let remaining = NOTIFY_TTL_MS;
    let startedAt = 0;
    let timer = null;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (currentClose === close) currentClose = null;
      card.remove();
      console.debug(JSON.stringify({ prefix: "[notify]", event: "branch_notify_close", branch: options.branchName }));
    };
    currentClose = close;
    const startTimer = () => {
      if (closed || timer !== null) return;
      startedAt = Date.now();
      timer = setTimeout(() => {
        timer = null;
        console.debug(JSON.stringify({ prefix: "[notify]", event: "branch_notify_expire", branch: options.branchName }));
        close();
      }, remaining);
    };
    const pauseTimer = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    const actions = [];
    if (options.onRestore) {
      actions.push({ label: t("branch.restore"), kind: "restore", run: options.onRestore });
    }
    if (options.onDeleteTracking) {
      actions.push({ label: t("branch.deleteTracking"), kind: "deleteTracking", run: options.onDeleteTracking });
    }
    if (actions.length > 0) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; gap: 12px; margin-top: 6px;";
      for (const action of actions) {
        const link = document.createElement("a");
        link.textContent = action.label;
        link.style.cssText = "color: #4a9eff; cursor: pointer; text-decoration: none; font-size: 12px;";
        let busy = false;
        link.addEventListener("mouseenter", () => {
          link.style.textDecoration = "underline";
        });
        link.addEventListener("mouseleave", () => {
          link.style.textDecoration = "none";
        });
        link.addEventListener("click", () => {
          if (busy || closed) return;
          busy = true;
          link.style.opacity = "0.6";
          link.style.pointerEvents = "none";
          void (async () => {
            try {
              await action.run();
              console.debug(JSON.stringify({
                prefix: "[notify]",
                event: "branch_notify_action_success",
                action: action.kind,
                branch: options.branchName
              }));
              close();
            } catch (err) {
              busy = false;
              link.style.opacity = "";
              link.style.pointerEvents = "";
              const raw = err instanceof Error ? err.message : String(err);
              const prefixText = action.kind === "restore" ? t("branch.restoreFailed") : t("branch.deleteTrackingFailed");
              console.error(JSON.stringify({
                prefix: "[notify]",
                event: "branch_notify_action_error",
                action: action.kind,
                branch: options.branchName,
                error: raw
              }));
              void host.toast({ kind: "error", message: `${prefixText}: ${raw}` }).catch((toastErr) => {
                console.error(JSON.stringify({ prefix: "[notify]", event: "branch_notify_toast_error", error: String(toastErr) }));
              });
            }
          })();
        });
        row.appendChild(link);
      }
      card.appendChild(row);
    }
    card.addEventListener("mouseenter", pauseTimer);
    card.addEventListener("mouseleave", startTimer);
    document.body.appendChild(card);
    startTimer();
    console.debug(JSON.stringify({
      prefix: "[notify]",
      event: "branch_notify_show",
      branch: options.branchName,
      actions: actions.map((a) => a.kind)
    }));
  }

  // panel/components/context-menu.ts
  function hideContextMenu() {
    const existing = document.getElementById("git-context-menu");
    if (existing) existing.remove();
  }
  async function onBranchDeleted(res, branch, service2, directory2) {
    const wasSelected = getState().selectedBranch?.name === branch.name;
    showBranchDeletedNotify({
      branchName: branch.name,
      // 仅本地分支提供"还原"：按删除前捕获的 tip（与 upstream）重建分支
      onRestore: res.kind === "local" ? async () => {
        await service2.restoreBranch(directory2, branch.name, res.tip, res.upstream);
        try {
          const branches = await service2.getBranches(directory2);
          setState((s) => {
            s.branches = branches;
            if (wasSelected) s.selectedBranch = branches.find((b) => b.name === branch.name) ?? null;
          });
        } catch (refreshErr) {
          console.error(JSON.stringify({
            prefix: "[context-menu]",
            event: "branch_restore_refresh_error",
            branch: branch.name,
            error: String(refreshErr)
          }));
        }
        void host.toast({ kind: "success", message: t("branch.restoreSuccess", { name: branch.name }) }).catch((toastErr) => {
          console.error(JSON.stringify({ prefix: "[context-menu]", event: "branch_restore_toast_error", error: String(toastErr) }));
        });
      } : void 0,
      // 本地分支且服务端允许删跟踪分支、有 upstream 时提供"删除跟踪的分支"
      onDeleteTracking: res.kind === "local" && res.canDeleteTracking && res.upstream ? async () => {
        await service2.deleteRemoteBranch(directory2, res.upstream.remote, res.upstream.branch);
        try {
          const branches = await service2.getBranches(directory2);
          setState((s) => {
            s.branches = branches;
          });
        } catch (refreshErr) {
          console.error(JSON.stringify({
            prefix: "[context-menu]",
            event: "branch_delete_tracking_refresh_error",
            branch: branch.name,
            error: String(refreshErr)
          }));
        }
      } : void 0
    });
    try {
      const branches = await service2.getBranches(directory2);
      setState((s) => {
        s.branches = branches;
        if (s.selectedBranch?.name === branch.name) s.selectedBranch = null;
      });
    } catch (refreshErr) {
      console.error(JSON.stringify({
        prefix: "[context-menu]",
        event: "branch_delete_refresh_error",
        branch: branch.name,
        error: String(refreshErr)
      }));
    }
    console.debug(JSON.stringify({ prefix: "[context-menu]", event: "branch_delete_success", branch: branch.name, kind: res.kind }));
  }
  function showContextMenu(e, branch, service2, directory2) {
    hideContextMenu();
    const state = getState();
    const menu = document.createElement("div");
    menu.id = "git-context-menu";
    menu.style.position = "fixed";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = "#2d2d2d";
    menu.style.border = "1px solid #444";
    menu.style.borderRadius = "4px";
    menu.style.padding = "4px 0";
    menu.style.zIndex = "1000";
    menu.style.minWidth = "160px";
    menu.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.5)";
    const items = [
      {
        label: t("branch.checkout"),
        action: async () => {
          try {
            await service2.checkoutBranch(directory2, branch.name);
            const branches = await service2.getBranches(directory2);
            setState((s) => {
              s.branches = branches;
            });
          } catch (e2) {
            console.error("[git-manager] \u7B7E\u51FA\u5206\u652F\u5931\u8D25:", e2);
          }
        }
      },
      {
        label: t("branch.rename"),
        action: () => showRenameDialog(branch, service2, directory2)
      },
      {
        label: t("branch.merge"),
        action: async () => {
          try {
            await service2.mergeBranch(directory2, branch.name);
          } catch (e2) {
            console.error("[git-manager] \u5408\u5E76\u5206\u652F\u5931\u8D25:", e2);
          }
        }
      },
      {
        label: t("branch.rebase"),
        action: async () => {
          try {
            await service2.rebaseBranch(directory2, branch.name);
          } catch (e2) {
            console.error("[git-manager] \u53D8\u57FA\u5931\u8D25:", e2);
          }
        }
      },
      { type: "separator" },
      {
        label: t("branch.pull"),
        action: async () => {
          try {
            await service2.pull(directory2);
          } catch (e2) {
            console.error("[git-manager] \u62C9\u53D6\u5931\u8D25:", e2);
          }
        }
      },
      {
        label: t("branch.push"),
        action: async () => {
          try {
            await service2.push(directory2);
          } catch (e2) {
            console.error("[git-manager] \u63A8\u9001\u5931\u8D25:", e2);
          }
        }
      },
      { type: "separator" },
      {
        label: state.favorites.has(branch.name) ? t("branch.unfavorite") : t("branch.favorite"),
        action: async () => {
          const next = new Set(getState().favorites);
          if (next.has(branch.name)) {
            next.delete(branch.name);
          } else {
            next.add(branch.name);
          }
          setState((s) => {
            s.favorites = next;
          });
          try {
            await service2.saveFavorites(directory2, [...next]);
          } catch (e2) {
            console.error("[git-manager] \u4FDD\u5B58\u6536\u85CF\u5931\u8D25:", e2);
          }
        }
      },
      { type: "separator" },
      {
        label: t("branch.delete"),
        danger: true,
        // IDEA DeleteBranchAction：当前分支禁用删除
        disabled: branch.isCurrent,
        action: async () => {
          console.debug(JSON.stringify({ prefix: "[context-menu]", event: "branch_delete_start", branch: branch.name }));
          try {
            const res = await service2.deleteBranch(directory2, branch.name);
            await onBranchDeleted(res, branch, service2, directory2);
          } catch (e2) {
            const { code, message } = parseDeleteBranchError(e2);
            console.debug(JSON.stringify({
              prefix: "[context-menu]",
              event: "branch_delete_failed",
              branch: branch.name,
              code: code ?? null
            }));
            if (code === "NOT_MERGED") {
              showDeleteBranchDialog(branch.name, async (force) => {
                const forceRes = await service2.deleteBranch(directory2, branch.name, force);
                await onBranchDeleted(forceRes, branch, service2, directory2);
              });
            } else if (code === "NOT_FOUND") {
              void host.toast({ kind: "error", message: t("branch.notFound", { name: branch.name }) }).catch((toastErr) => {
                console.error(JSON.stringify({ prefix: "[context-menu]", event: "branch_delete_toast_error", error: String(toastErr) }));
              });
            } else {
              void host.toast({ kind: "error", message: `${t("branch.deleteFailed")}: ${message}` }).catch((toastErr) => {
                console.error(JSON.stringify({ prefix: "[context-menu]", event: "branch_delete_toast_error", error: String(toastErr) }));
              });
            }
          }
        }
      }
    ];
    const findItemByLabel = (label) => items.find((i) => !("type" in i) && i.label === label);
    for (const item of items) {
      if ("type" in item && item.type === "separator") {
        const sep = document.createElement("div");
        sep.style.height = "1px";
        sep.style.background = "#444";
        sep.style.margin = "4px 0";
        menu.appendChild(sep);
        continue;
      }
      const menuItem = item;
      const el2 = document.createElement("div");
      el2.textContent = menuItem.label;
      el2.style.padding = "6px 12px";
      el2.style.cursor = menuItem.disabled ? "default" : "pointer";
      el2.style.fontSize = "12px";
      el2.style.color = menuItem.disabled ? "#666" : menuItem.danger ? "#f44336" : "#ccc";
      menu.appendChild(el2);
    }
    menu.addEventListener("mouseenter", (e2) => {
      const target = e2.target.closest("div");
      if (target && target.parentElement === menu && !findItemByLabel(target.textContent)?.disabled) {
        target.style.background = "#3a3a3a";
      }
    }, true);
    menu.addEventListener("mouseleave", (e2) => {
      const target = e2.target.closest("div");
      if (target && target.parentElement === menu) {
        target.style.background = "transparent";
      }
    }, true);
    menu.addEventListener("click", async (e2) => {
      const target = e2.target.closest("div");
      if (!target || target.parentElement !== menu) return;
      const item = findItemByLabel(target.textContent);
      if (!item || item.disabled) return;
      hideContextMenu();
      await item.action();
    });
    document.body.appendChild(menu);
    const closeHandler2 = (ev) => {
      if (!menu.contains(ev.target)) {
        hideContextMenu();
        document.removeEventListener("click", closeHandler2);
      }
    };
    setTimeout(() => document.addEventListener("click", closeHandler2), 0);
  }
  function showCommitContextMenu(e, commit, service2, directory2, batchHashes) {
    hideContextMenu();
    const isBatch = !!batchHashes && batchHashes.length > 1;
    const items = isBatch ? buildBatchCommitItems(batchHashes, service2, directory2) : buildSingleCommitItems(commit, service2, directory2);
    const findItemByLabel = (label) => items.find((i) => !("type" in i) && i.label === label);
    const menu = html`
    <div id="git-context-menu" style="
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: #2d2d2d;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 200px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    "></div>
  `;
    for (const item of items) {
      if ("type" in item && item.type === "separator") {
        const sep = document.createElement("div");
        sep.style.height = "1px";
        sep.style.background = "#444";
        sep.style.margin = "4px 0";
        menu.appendChild(sep);
        continue;
      }
      const menuItem = item;
      const el2 = document.createElement("div");
      el2.textContent = menuItem.label;
      el2.style.padding = "6px 12px";
      el2.style.cursor = menuItem.disabled ? "default" : "pointer";
      el2.style.fontSize = "12px";
      el2.style.color = menuItem.disabled ? "#666" : menuItem.danger ? "#f44336" : "#ccc";
      menu.appendChild(el2);
    }
    menu.addEventListener("mouseenter", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu && !findItemByLabel(target.textContent)?.disabled) {
        target.style.background = "#3a3a3a";
      }
    }, true);
    menu.addEventListener("mouseleave", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu) {
        target.style.background = "transparent";
      }
    }, true);
    menu.addEventListener("click", async (ev) => {
      const target = ev.target.closest("div");
      if (!target || target.parentElement !== menu) return;
      const item = findItemByLabel(target.textContent);
      if (!item || item.disabled) return;
      hideContextMenu();
      await item.action();
    });
    document.body.appendChild(menu);
    const closeHandler2 = (ev) => {
      if (!menu.contains(ev.target)) {
        hideContextMenu();
        document.removeEventListener("click", closeHandler2);
      }
    };
    setTimeout(() => document.addEventListener("click", closeHandler2), 0);
  }
  function buildSingleCommitItems(commit, service2, directory2) {
    return [
      {
        label: t("commit.copyRevision"),
        action: () => navigator.clipboard.writeText(commit.hash)
      },
      { type: "separator" },
      {
        label: t("commit.cherryPick"),
        action: async () => {
          try {
            await service2.cherryPick(directory2, commit.hash);
          } catch (err) {
            console.error("[git-manager] Cherry-pick \u5931\u8D25:", err);
          }
        }
      },
      {
        label: t("commit.compareLocal"),
        action: async () => {
          try {
            const diffs = await service2.diffVsLocal(directory2, commit.hash);
            setState((s) => {
              s.diffs = diffs;
            });
            hideContextMenu();
          } catch (err) {
            console.error(JSON.stringify({
              prefix: "[context-menu]",
              event: "compare_local_error",
              hash: commit.hash,
              error: String(err)
            }));
          }
        }
      },
      { type: "separator" },
      {
        label: t("commit.reset"),
        action: () => {
          showResetDialog(commit, service2, directory2);
        }
      },
      {
        label: t("commit.revert"),
        action: async () => {
          try {
            await service2.revert(directory2, commit.hash);
          } catch (err) {
            console.error("[git-manager] Revert \u5931\u8D25:", err);
          }
        }
      },
      { type: "separator" },
      {
        label: t("commit.newBranch"),
        action: () => {
          showCreateBranchFromCommitDialog(commit, service2, directory2);
        }
      },
      {
        label: t("commit.newTag"),
        action: () => {
          console.log("[git-manager] New Tag from commit:", commit.hash);
        }
      }
    ];
  }
  function buildBatchCommitItems(hashes, service2, directory2) {
    return [
      {
        label: t("batch.selected", { n: hashes.length }),
        disabled: true,
        action: () => {
        }
      },
      { type: "separator" },
      {
        label: t("batch.copyHashes"),
        action: async () => {
          try {
            await navigator.clipboard.writeText(hashes.join("\n"));
          } catch (err) {
            console.error("[git-manager] \u590D\u5236\u54C8\u5E0C\u5217\u8868\u5931\u8D25:", err);
          }
        }
      },
      {
        label: t("batch.cherryPickAll", { n: hashes.length }),
        action: async () => {
          if (!confirm(t("batch.confirmCherryPick", { n: hashes.length }))) return;
          for (const hash of hashes) {
            try {
              await service2.cherryPick(directory2, hash);
            } catch (err) {
              console.error(`[git-manager] \u6279\u91CF Cherry-pick \u4E2D\u65AD\u4E8E ${hash}:`, err);
              return;
            }
          }
        }
      },
      {
        label: t("batch.revertAll", { n: hashes.length }),
        action: async () => {
          if (!confirm(t("batch.confirmRevert", { n: hashes.length }))) return;
          for (const hash of hashes) {
            try {
              await service2.revert(directory2, hash);
            } catch (err) {
              console.error(`[git-manager] \u6279\u91CF Revert \u4E2D\u65AD\u4E8E ${hash}:`, err);
              return;
            }
          }
        }
      }
    ];
  }
  function showResetDialog(commit, service2, directory2) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 360px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">Reset Current Branch to Here</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 12px; word-break: break-all;">
          ${commit.shortHash} - ${commit.message}
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="soft" checked />
            <span><b>--soft</b> 保留工作区和暂存区</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="mixed" />
            <span><b>--mixed</b> 保留工作区，重置暂存区</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer;">
            <input type="radio" name="reset-mode" value="hard" />
            <span><b>--hard</b> 丢弃所有更改</span>
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="reset-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="reset-ok" style="padding: 4px 12px; background: #d32f2f; border: 1px solid #f44336; border-radius: 3px; color: #fff; cursor: pointer;">Reset</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector("#reset-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) close();
    });
    overlay.querySelector("#reset-ok")?.addEventListener("click", async () => {
      const modeInput = overlay.querySelector('input[name="reset-mode"]:checked');
      const mode = modeInput?.value || "mixed";
      try {
        await service2.reset(directory2, commit.hash, mode);
      } catch (err) {
        console.error("[git-manager] Reset \u5931\u8D25:", err);
      }
      close();
    });
  }
  function showCreateBranchFromCommitDialog(commit, service2, directory2) {
    const overlay = html`
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <div style="background: #2d2d2d; border: 1px solid #444; border-radius: 6px; padding: 16px; width: 320px;">
        <div style="font-size: 14px; color: #ccc; margin-bottom: 12px;">从提交创建分支</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px; word-break: break-all;">
          基于: ${commit.shortHash} - ${commit.message}
        </div>
        <input id="new-branch-from-commit" type="text" placeholder="输入分支名称..." style="width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 12px; box-sizing: border-box; margin-bottom: 12px;" />
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="branch-cancel" style="padding: 4px 12px; background: #333; border: 1px solid #444; border-radius: 3px; color: #ccc; cursor: pointer;">取消</button>
          <button id="branch-ok" style="padding: 4px 12px; background: #0d47a1; border: 1px solid #1565c0; border-radius: 3px; color: #fff; cursor: pointer;">创建</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#new-branch-from-commit");
    input.focus();
    const close = () => overlay.remove();
    overlay.querySelector("#branch-cancel")?.addEventListener("click", close);
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) close();
    });
    const doCreate = async () => {
      const name = input.value.trim();
      if (!name) return;
      void service2.debugLog?.("create-branch-submit", { name, startPoint: commit.hash, entry: "context-menu" });
      try {
        await service2.checkoutNewBranch(directory2, name, commit.hash);
        const branches = await service2.getBranches(directory2);
        setState((s) => {
          s.branches = branches;
        });
      } catch (err) {
        console.error("[git-manager] \u521B\u5EFA\u5206\u652F\u5931\u8D25:", err);
      }
      close();
    };
    overlay.querySelector("#branch-ok")?.addEventListener("click", doCreate);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") doCreate();
    });
  }

  // panel/components/branch-panel.ts
  function createBranchPanel(container, service2, directory2, onBranchSelect, onSelectionCleared) {
    let disposed = false;
    let listContainer = null;
    const expandedGroups = /* @__PURE__ */ new Set(["HEAD(\u5F53\u524D\u5206\u652F)", "\u672C\u5730"]);
    let unsubscribe = null;
    const findBranchFromEvent = (e) => {
      const target = e.target;
      const item = target.closest("[data-branch]");
      if (!item) return null;
      const branchName = item.getAttribute("data-branch");
      if (!branchName) return null;
      const state = getState();
      const branch = state.branches.find((b) => b.name === branchName) || null;
      if (!branch) {
        console.error(JSON.stringify({
          prefix: "[branch-panel]",
          event: "branch_not_found",
          branchName,
          availableCount: state.branches.length,
          targetTag: target.tagName
        }));
      }
      return branch;
    };
    const findGroupFromEvent = (e) => {
      const target = e.target;
      const item = target.closest("[data-group]");
      if (!item) return null;
      return item.getAttribute("data-group");
    };
    const render2 = () => {
      if (disposed) return;
      container.innerHTML = "";
      const searchContainer = html`
      <div style="padding: 4px 6px; border-bottom: 1px solid #333; flex-shrink: 0;">
        <div style="display: flex; align-items: center; background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 0 6px;">
          <span style="color: #888; font-size: 12px; margin-right: 4px;">${getIcon("search")}</span>
          <input 
            type="text" 
            placeholder="Branch or tag" 
            style="flex: 1; padding: 4px 0; background: transparent; border: none; color: #ccc; font-size: 12px; outline: none;"
          />
        </div>
      </div>
    `;
      const searchInput = searchContainer.querySelector("input");
      searchInput.value = getState().branchFilter;
      searchInput.addEventListener("input", (e) => {
        const target = e.target;
        setState((s) => {
          s.branchFilter = target.value;
        });
      });
      container.appendChild(searchContainer);
      listContainer = html`
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden;"></div>
    `;
      listContainer.addEventListener("click", (e) => {
        const branch = findBranchFromEvent(e);
        if (branch) {
          console.debug(JSON.stringify({
            prefix: "[branch-panel]",
            event: "branch_click",
            branchName: branch.name
          }));
          try {
            console.debug(JSON.stringify({ prefix: "[branch-panel]", event: "before_on_branch_select", branchName: branch.name }));
            onBranchSelect(branch);
            console.debug(JSON.stringify({ prefix: "[branch-panel]", event: "after_on_branch_select", branchName: branch.name }));
          } catch (err) {
            console.error(JSON.stringify({ prefix: "[branch-panel]", event: "on_branch_select_error", error: String(err) }));
          }
          setState((s) => {
            s.selectedBranch = branch;
          });
          return;
        }
        const groupEl = findGroupFromEvent(e);
        if (groupEl) {
          console.debug(JSON.stringify({
            prefix: "[branch-panel]",
            event: "group_click",
            groupName: groupEl
          }));
          if (expandedGroups.has(groupEl)) {
            expandedGroups.delete(groupEl);
          } else {
            expandedGroups.add(groupEl);
          }
          renderList();
          return;
        }
        const state = getState();
        if (state.selectedBranch || state.logBranch) {
          console.debug(JSON.stringify({ prefix: "[branch-panel]", event: "blank_clear" }));
          onSelectionCleared();
        } else {
          console.debug(JSON.stringify({ prefix: "[branch-panel]", event: "blank_clear_noop" }));
        }
      });
      listContainer.addEventListener("contextmenu", (e) => {
        const branch = findBranchFromEvent(e);
        if (branch) {
          e.preventDefault();
          showContextMenu(e, branch, service2, directory2);
        }
      });
      container.appendChild(listContainer);
      renderList();
      if (unsubscribe) unsubscribe();
      unsubscribe = subscribeFields(
        ["branches", "branchFilter", "favorites", "selectedBranch"],
        () => {
          if (!disposed) renderList();
        }
      );
    };
    const renderList = () => {
      if (disposed || !listContainer) return;
      const state = getState();
      listContainer.innerHTML = "";
      const filteredBranches = state.branches.filter((branch) => {
        if (!state.branchFilter) return true;
        return branch.name.toLowerCase().includes(state.branchFilter.toLowerCase());
      });
      const current3 = filteredBranches.filter((b) => b.isCurrent);
      const local = filteredBranches.filter((b) => !b.isCurrent && !b.isRemote);
      const remote = filteredBranches.filter((b) => b.isRemote);
      if (current3.length > 0) {
        listContainer.appendChild(
          createGroup("HEAD(\u5F53\u524D\u5206\u652F)", current3, expandedGroups.has("HEAD(\u5F53\u524D\u5206\u652F)"))
        );
      }
      if (local.length > 0) {
        const groups = groupBranches(local);
        const localGroup = createCollapsibleGroup("\u672C\u5730", groups);
        listContainer.appendChild(localGroup);
      }
      if (remote.length > 0) {
        listContainer.appendChild(
          createGroup("\u8FDC\u7A0B", remote, expandedGroups.has("\u8FDC\u7A0B"))
        );
      }
    };
    const expandAll = () => {
      if (disposed) return;
      expandedGroups.add("HEAD(\u5F53\u524D\u5206\u652F)");
      expandedGroups.add("\u672C\u5730");
      expandedGroups.add("\u8FDC\u7A0B");
      for (const branch of getState().branches) {
        const parts = branch.name.split("/");
        if (parts.length > 1) {
          expandedGroups.add(parts[0]);
        }
      }
      console.debug(JSON.stringify({
        prefix: "[branch-panel]",
        event: "expand_all",
        groupCount: expandedGroups.size
      }));
      renderList();
    };
    const dispose = () => {
      disposed = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
    render2();
    return { dispose, expandAll };
    function groupBranches(branches) {
      const groups = /* @__PURE__ */ new Map();
      const rootBranches = [];
      for (const branch of branches) {
        const parts = branch.name.split("/");
        if (parts.length > 1) {
          const folderName = parts[0];
          if (!groups.has(folderName)) {
            groups.set(folderName, []);
          }
          groups.get(folderName).push(branch);
        } else {
          rootBranches.push(branch);
        }
      }
      const result = /* @__PURE__ */ new Map();
      for (const branch of rootBranches) {
        const key = branch.name;
        result.set(key, [branch]);
      }
      for (const [folder, branchList] of groups) {
        result.set(folder, branchList);
      }
      return result;
    }
    function createCollapsibleGroup(title, groups) {
      const isExpanded = expandedGroups.has(title);
      const groupEl = html`
      <div style="margin-bottom: 2px;">
        <div data-group="${title}" style="display: flex; align-items: center; padding: 4px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
          <span style="margin-right: 4px; font-size: 8px;">${isExpanded ? "\u25BC" : "\u25B6"}</span>
          ${title}
        </div>
      </div>
    `;
      if (isExpanded) {
        for (const [key, branches] of groups) {
          if (branches.length === 1 && key === branches[0].name) {
            groupEl.appendChild(createBranchItem(branches[0]));
          } else {
            const folderExpanded = expandedGroups.has(key);
            const folderEl = html`
            <div style="margin-left: 12px;">
              <div data-group="${key}" style="display: flex; align-items: center; padding: 3px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
                <span style="margin-right: 4px; font-size: 8px;">${folderExpanded ? "\u25BC" : "\u25B6"}</span>
                ${key}
              </div>
            </div>
          `;
            if (folderExpanded) {
              for (const branch of branches) {
                const branchItem = createBranchItem(branch);
                branchItem.style.paddingLeft = "32px";
                folderEl.appendChild(branchItem);
              }
            }
            groupEl.appendChild(folderEl);
          }
        }
      }
      return groupEl;
    }
    function createGroup(title, branches, expanded) {
      const group = html`
      <div style="margin-bottom: 2px;">
        <div data-group="${title}" style="display: flex; align-items: center; padding: 4px 8px; font-size: 11px; color: #888; cursor: pointer; user-select: none;">
          <span style="margin-right: 4px; font-size: 8px;">${expanded ? "\u25BC" : "\u25B6"}</span>
          ${title}
        </div>
      </div>
    `;
      if (expanded) {
        for (const branch of branches) {
          group.appendChild(createBranchItem(branch));
        }
      }
      return group;
    }
    function createBranchItem(branch) {
      const state = getState();
      const isFavorite = state.favorites.has(branch.name);
      const isSelected = state.selectedBranch?.name === branch.name;
      const bgStyle = isSelected ? "background: #2e4a6e;" : branch.isCurrent ? "background: #2a3a4a;" : "";
      return html`
      <div 
        style="display: flex; align-items: center; padding: 3px 8px 3px 20px; cursor: pointer; font-size: 12px; ${bgStyle}"
        data-branch="${branch.name}"
      >
        <span style="margin-right: 6px; flex-shrink: 0;">${getIcon("branchIcon")}</span>
        ${isFavorite ? `<span style="margin-right: 4px; color: #f4af3d; font-size: 10px;">\u2605</span>` : ""}
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${branch.isCurrent ? "font-weight: bold; color: #fff;" : "color: #ccc;"}">${branch.name}</span>
        ${branch.hasUnpushed && branch.unpushedCount ? `<span style="font-size: 10px; color: #4caf50; margin-left: 4px;">\u2191${branch.unpushedCount}</span>` : ""}
        ${branch.hasUnpulled && branch.unpulledCount ? `<span style="font-size: 10px; color: #589df6; margin-left: 4px;">\u2193${branch.unpulledCount}</span>` : ""}
      </div>
    `;
    }
  }

  // panel/components/settings-menu.ts
  var SETTINGS_ITEMS = [
    { key: "showAuthor", labelKey: "settings.showAuthor" },
    { key: "showDate", labelKey: "settings.showDate" },
    { key: "showHash", labelKey: "settings.showHash" }
  ];
  var closeHandler = null;
  function removeCloseHandler() {
    if (!closeHandler) return;
    document.removeEventListener("click", closeHandler);
    closeHandler = null;
  }
  function hideSettingsMenu() {
    removeCloseHandler();
    const existing = document.getElementById("git-settings-menu");
    if (existing) existing.remove();
  }
  function syncChecks(menu) {
    const settings = getState().displaySettings;
    for (const item of SETTINGS_ITEMS) {
      const check = menu.querySelector(`[data-key="${item.key}"]`)?.querySelector(".git-settings-check");
      if (check) {
        check.textContent = settings[item.key] ? "\u2713" : "";
      }
    }
  }
  function showSettingsMenu(e) {
    hideSettingsMenu();
    const menu = document.createElement("div");
    menu.id = "git-settings-menu";
    menu.style.position = "fixed";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = "#2d2d2d";
    menu.style.border = "1px solid #444";
    menu.style.borderRadius = "4px";
    menu.style.padding = "4px 0";
    menu.style.zIndex = "1000";
    menu.style.minWidth = "160px";
    menu.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.5)";
    const title = document.createElement("div");
    title.textContent = t("settings.title");
    title.style.padding = "6px 12px";
    title.style.fontSize = "11px";
    title.style.color = "#888";
    menu.appendChild(title);
    const separator = document.createElement("div");
    separator.style.height = "1px";
    separator.style.background = "#444";
    separator.style.margin = "4px 0";
    menu.appendChild(separator);
    for (const item of SETTINGS_ITEMS) {
      const el2 = document.createElement("div");
      el2.dataset.key = item.key;
      el2.style.padding = "6px 12px";
      el2.style.cursor = "pointer";
      el2.style.fontSize = "12px";
      el2.style.color = "#ccc";
      el2.style.display = "flex";
      el2.style.alignItems = "center";
      el2.style.gap = "6px";
      const check = document.createElement("span");
      check.className = "git-settings-check";
      check.style.width = "12px";
      check.style.flex = "0 0 12px";
      check.style.color = "#4caf50";
      const label = document.createElement("span");
      label.textContent = t(item.labelKey);
      el2.appendChild(check);
      el2.appendChild(label);
      menu.appendChild(el2);
    }
    syncChecks(menu);
    document.body.appendChild(menu);
    menu.addEventListener("mouseenter", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu && target.dataset.key) {
        target.style.background = "#3a3a3a";
      }
    }, true);
    menu.addEventListener("mouseleave", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu && target.dataset.key) {
        target.style.background = "transparent";
      }
    }, true);
    menu.addEventListener("click", (ev) => {
      const target = ev.target.closest("div");
      if (!target || target.parentElement !== menu) return;
      const key = target.dataset.key;
      if (!key) return;
      setState((s) => {
        s.displaySettings[key] = !s.displaySettings[key];
      });
      syncChecks(menu);
    });
    const handler = (ev) => {
      if (!menu.isConnected) {
        document.removeEventListener("click", handler);
        return;
      }
      if (!menu.contains(ev.target)) {
        hideSettingsMenu();
      }
    };
    closeHandler = handler;
    setTimeout(() => document.addEventListener("click", handler), 0);
  }

  // panel/components/dropdown-menu.ts
  var ANCHOR_GAP = 2;
  var VIEWPORT_MARGIN = 4;
  var current2 = null;
  function logDropdown(event, detail = {}) {
    console.debug("[dropdown]", JSON.stringify({ event, ...detail }));
  }
  function closeMenu(instance, reason) {
    if (instance.closed) return;
    instance.closed = true;
    if (instance.outsideTimer !== null) {
      clearTimeout(instance.outsideTimer);
      instance.outsideTimer = null;
    }
    document.removeEventListener("click", instance.onOutsideClick);
    document.removeEventListener("keydown", instance.onKeydown);
    instance.menu.remove();
    if (current2 === instance) current2 = null;
    logDropdown("close", { reason });
  }
  function createRow(item) {
    const kind = item.kind ?? "item";
    const row = document.createElement("div");
    row.dataset.kind = kind;
    row.dataset.id = item.id;
    if (kind === "separator") {
      row.style.height = "1px";
      row.style.background = "#444";
      row.style.margin = "4px 0";
      return row;
    }
    if (kind === "group") {
      row.style.padding = "6px 12px";
      row.style.fontSize = "11px";
      row.style.color = "#888";
      row.style.cursor = "default";
      row.textContent = item.label;
      return row;
    }
    row.style.padding = "6px 12px";
    row.style.fontSize = "12px";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    if (item.disabled) {
      row.dataset.disabled = "true";
      row.style.color = "#666";
      row.style.cursor = "default";
    } else {
      row.style.color = "#ccc";
      row.style.cursor = "pointer";
    }
    const check = document.createElement("span");
    check.className = "git-dropdown-check";
    check.style.width = "12px";
    check.style.flex = "0 0 12px";
    check.style.color = "#4caf50";
    check.textContent = item.checked ? "\u2713" : "";
    const label = document.createElement("span");
    label.textContent = item.label;
    row.appendChild(check);
    row.appendChild(label);
    return row;
  }
  function computePosition(anchor, menu) {
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(0, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN));
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipped = spaceBelow < height + ANCHOR_GAP && rect.top >= height + ANCHOR_GAP;
    const top = flipped ? rect.top - ANCHOR_GAP - height : rect.bottom + ANCHOR_GAP;
    return { left, top, flipped };
  }
  function isSelectableRow(row) {
    return row !== null && row.parentElement !== null && row.dataset.kind === "item" && row.dataset.disabled !== "true";
  }
  function showDropdownMenu(anchor, items, onSelect) {
    if (current2 && current2.anchor === anchor) {
      const instance2 = current2;
      closeMenu(instance2, "toggle");
      return () => closeMenu(instance2, "api");
    }
    if (current2) closeMenu(current2, "replace");
    const menu = document.createElement("div");
    menu.id = "git-dropdown-menu";
    menu.style.position = "fixed";
    menu.style.background = "#2d2d2d";
    menu.style.border = "1px solid #444";
    menu.style.borderRadius = "4px";
    menu.style.padding = "4px 0";
    menu.style.zIndex = "1000";
    menu.style.minWidth = "160px";
    menu.style.maxHeight = "60vh";
    menu.style.overflowY = "auto";
    menu.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.5)";
    for (const item of items) {
      menu.appendChild(createRow(item));
    }
    document.body.appendChild(menu);
    const pos = computePosition(anchor, menu);
    menu.style.left = `${pos.left}px`;
    menu.style.top = `${pos.top}px`;
    const instance = {
      menu,
      anchor,
      closed: false,
      outsideTimer: null,
      onOutsideClick: () => {
      },
      onKeydown: () => {
      }
    };
    instance.onOutsideClick = (ev) => {
      if (!menu.isConnected) {
        document.removeEventListener("click", instance.onOutsideClick);
        return;
      }
      if (!menu.contains(ev.target)) {
        closeMenu(instance, "outside");
      }
    };
    instance.onKeydown = (ev) => {
      if (ev.key === "Escape") closeMenu(instance, "escape");
    };
    menu.addEventListener("click", (ev) => {
      const target = ev.target.closest("div");
      if (!target || target.parentElement !== menu) return;
      if (target.dataset.kind !== "item") return;
      if (target.dataset.disabled === "true") return;
      const id = target.dataset.id ?? "";
      logDropdown("select", { id });
      onSelect(id);
      closeMenu(instance, "select");
    });
    menu.addEventListener("mouseenter", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu && isSelectableRow(target)) {
        target.style.background = "#3a3a3a";
      }
    }, true);
    menu.addEventListener("mouseleave", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu && isSelectableRow(target)) {
        target.style.background = "transparent";
      }
    }, true);
    instance.outsideTimer = setTimeout(() => {
      instance.outsideTimer = null;
      document.addEventListener("click", instance.onOutsideClick);
    }, 0);
    document.addEventListener("keydown", instance.onKeydown);
    current2 = instance;
    logDropdown("open", { anchor: anchor.id || anchor.tagName, count: items.length });
    return () => closeMenu(instance, "api");
  }

  // panel/components/commit-list.ts
  function createCommitListPanel(container, service2, directory2, onCommitSelect) {
    let disposed = false;
    let listContainer = null;
    let toolbar = null;
    let filterTag = null;
    let unsubscribe = null;
    let unsubscribeDisplay = null;
    let lastClickIndex = null;
    let filterBtnRefs = { regex: null, caseSensitive: null, branch: null, user: null, date: null, path: null };
    const findCommitFromEvent = (e) => {
      const target = e.target;
      const item = target.closest("[data-hash]");
      if (!item) return null;
      const hash = item.getAttribute("data-hash");
      if (!hash) return null;
      const state = getState();
      return state.filteredCommits.find((c) => c.hash === hash) || null;
    };
    const handlePull = async () => {
      try {
        await service2.pull(directory2);
        console.debug(JSON.stringify({ prefix: "[commit-list]", event: "pull_success", directory: directory2 }));
        await refreshCommits(service2, directory2);
      } catch (e) {
        console.error(JSON.stringify({ prefix: "[commit-list]", event: "pull_error", error: String(e) }));
      }
    };
    const handleCompare = async () => {
      const selected = getState().selectedCommit;
      if (!selected) {
        console.error(JSON.stringify({ prefix: "[commit-list]", event: "compare_no_selection" }));
        return;
      }
      try {
        const diffs = await service2.diffVsLocal(directory2, selected.hash);
        setState((s) => {
          s.diffs = diffs;
        });
      } catch (e) {
        console.error(JSON.stringify({
          prefix: "[commit-list]",
          event: "compare_error",
          hash: selected.hash,
          error: String(e)
        }));
      }
    };
    const focusSearchInput = () => {
      const input = toolbar?.querySelector("[data-search-input]");
      if (!input) {
        console.error(JSON.stringify({ prefix: "[commit-list]", event: "search_input_missing" }));
        return;
      }
      input.focus();
    };
    const scrollToRow = (hash) => {
      if (!hash) return;
      const target = container.querySelector(`[data-hash="${hash}"]`);
      if (!target) return;
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "nearest" });
      } else {
        container.scrollTop = target.offsetTop;
      }
    };
    const gotoReference = (query) => {
      const state = getState();
      const keyword = query.toLowerCase();
      const hitCommit = state.allCommits.find((c) => c.hash.toLowerCase().startsWith(keyword));
      if (hitCommit) {
        setState((s) => {
          s.selectedCommit = hitCommit;
          s.selectedCommits = /* @__PURE__ */ new Set([hitCommit.hash]);
        });
        onCommitSelect(hitCommit);
        scrollToRow(hitCommit.hash);
        console.debug(JSON.stringify({ prefix: "[commit-list]", event: "goto_commit", hash: hitCommit.hash }));
        return true;
      }
      const hitBranch = state.branches.find((b) => b.name === query);
      if (hitBranch) {
        const branchCommit = (hitBranch.commit ? state.allCommits.find((c) => c.hash === hitBranch.commit) : void 0) ?? state.filteredCommits[0] ?? state.allCommits[0] ?? null;
        setState((s) => {
          s.logBranch = hitBranch.name;
          if (branchCommit) {
            s.selectedCommit = branchCommit;
            s.selectedCommits = /* @__PURE__ */ new Set([branchCommit.hash]);
          }
        });
        if (branchCommit) onCommitSelect(branchCommit);
        scrollToRow(branchCommit?.hash);
        console.debug(JSON.stringify({ prefix: "[commit-list]", event: "goto_branch", branchName: hitBranch.name }));
        return true;
      }
      console.debug(JSON.stringify({ prefix: "[commit-list]", event: "goto_not_found", query }));
      return false;
    };
    const updateFilterButtons = () => {
      const state = getState();
      const activeFlags = [
        [filterBtnRefs.regex, state.searchRegex],
        [filterBtnRefs.caseSensitive, state.searchCaseSensitive],
        [filterBtnRefs.branch, !!state.logBranch],
        [filterBtnRefs.user, !!state.filterAuthor],
        [filterBtnRefs.date, !!(state.filterDateFrom || state.filterDateTo)],
        [filterBtnRefs.path, state.filterPaths.length > 0]
      ];
      for (const [btn, active2] of activeFlags) {
        if (!btn) continue;
        btn.style.background = active2 ? "#1a3a5a" : "#333";
        btn.style.border = active2 ? "1px solid #2a5a8a" : "1px solid #444";
        btn.style.color = active2 ? "#cfe8ff" : "#888";
      }
    };
    const render2 = () => {
      if (disposed) return;
      container.innerHTML = "";
      toolbar = html`
      <div style="display: flex; align-items: center; gap: 2px; padding: 4px 6px; border-bottom: 1px solid #333; flex-shrink: 0; background: #1e1e1e; flex-wrap: wrap;">
        <!-- 搜索输入框 -->
        <div style="display: flex; align-items: center; background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 0 6px; flex: 1; min-width: 120px;">
          <span style="color: #888; font-size: 12px; margin-right: 4px;">${getIcon("search")}</span>
          <input 
            type="text" 
            placeholder="文本或哈希" 
            data-search-input
            style="flex: 1; padding: 3px 0; background: transparent; border: none; color: #ccc; font-size: 12px; outline: none; min-width: 80px;"
          />
        </div>
        <!-- 正则/大小写按钮 -->
        <button data-action="btn-regex" style="padding: 2px 5px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; font-family: monospace;" title="${t("filter.regex")}">.*</button>
        <button data-action="btn-case" style="padding: 2px 5px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; font-weight: bold;" title="${t("filter.case")}">Cc</button>
        <!-- 分隔线 -->
        <div style="width: 1px; height: 16px; background: #444; margin: 0 3px;"></div>
        <!-- 过滤下拉按钮 -->
        <button data-action="btn-filter-branch" style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; white-space: nowrap;">${t("filter.branch")} ▾</button>
        <button data-action="btn-filter-user" style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; white-space: nowrap;">${t("filter.user")} ▾</button>
        <button data-action="btn-filter-date" style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; white-space: nowrap;">${t("filter.date")} ▾</button>
        <button data-action="btn-filter-path" style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; white-space: nowrap;">${t("filter.path")} ▾</button>
        <button data-action="btn-select-all" style="padding: 2px 6px; background: #333; border: 1px solid #444; border-radius: 3px; color: #888; cursor: pointer; font-size: 11px; white-space: nowrap;" title="全选/取消全选当前列表">${t("filter.selectAll")}</button>
        <!-- 分隔线 -->
        <div style="width: 1px; height: 16px; background: #444; margin: 0 3px;"></div>
        <!-- 操作按钮 -->
        <button data-action="btn-download" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("sidebar.pull")}">${getIcon("download")}</button>
        <button data-action="btn-refresh" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("sidebar.refresh")}">${getIcon("refresh")}</button>
        <button data-action="btn-compare" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("commit.compareLocal")}">${getIcon("compare")}</button>
        <button data-action="btn-search" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("sidebar.search")}">${getIcon("search")}</button>
        <button data-action="btn-settings" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("sidebar.settings")}">${getIcon("gearSettings")}</button>
        <button data-action="btn-goto" style="padding: 2px 5px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer;" title="${t("goto.title")}">${getIcon("goToRef")}</button>
      </div>
    `;
      const searchInput = toolbar.querySelector("input");
      searchInput.value = getState().commitSearch;
      searchInput.addEventListener("input", (e) => {
        const target = e.target;
        setState((s) => {
          s.commitSearch = target.value;
        });
      });
      toolbar.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.getAttribute("data-action");
        if (action === "btn-refresh") refreshCommits(service2, directory2);
        else if (action === "btn-regex") toggleRegex();
        else if (action === "btn-case") toggleCase();
        else if (action === "btn-select-all") toggleSelectAll();
        else if (action === "btn-filter-branch") openBranchDropdown(target);
        else if (action === "btn-filter-user") openUserDropdown(target);
        else if (action === "btn-filter-date") openDateDropdown(target);
        else if (action === "btn-filter-path") openPathDropdown(target);
        else if (action === "btn-download") void handlePull();
        else if (action === "btn-compare") void handleCompare();
        else if (action === "btn-search") focusSearchInput();
        else if (action === "btn-settings") showSettingsMenu(e);
        else if (action === "btn-goto") showGotoDialog(gotoReference);
      });
      container.appendChild(toolbar);
      filterBtnRefs = {
        regex: toolbar.querySelector('[data-action="btn-regex"]'),
        caseSensitive: toolbar.querySelector('[data-action="btn-case"]'),
        branch: toolbar.querySelector('[data-action="btn-filter-branch"]'),
        user: toolbar.querySelector('[data-action="btn-filter-user"]'),
        date: toolbar.querySelector('[data-action="btn-filter-date"]'),
        path: toolbar.querySelector('[data-action="btn-filter-path"]')
      };
      updateFilterButtons();
      renderFilterTag();
      listContainer = html`
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden;"></div>
    `;
      listContainer.addEventListener("mouseenter", (e) => {
        const target = e.target.closest("[data-hash]");
        if (target) target.style.background = "#2a2d2e";
      }, true);
      listContainer.addEventListener("mouseleave", (e) => {
        const target = e.target.closest("[data-hash]");
        if (target) {
          const state = getState();
          const hash = target.getAttribute("data-hash");
          const isSelected = hash !== null && (state.selectedCommits.has(hash) || state.selectedCommit?.hash === hash);
          target.style.background = isSelected ? "#2a3a4a" : "transparent";
        }
      }, true);
      listContainer.addEventListener("click", (e) => {
        const commit = findCommitFromEvent(e);
        if (!commit) return;
        const state = getState();
        const idx = state.filteredCommits.findIndex((c) => c.hash === commit.hash);
        if (e.shiftKey && lastClickIndex !== null && idx >= 0) {
          const start = Math.min(lastClickIndex, idx);
          const end = Math.max(lastClickIndex, idx);
          const range = state.filteredCommits.slice(start, end + 1).map((c) => c.hash);
          setState((s) => {
            s.selectedCommits = new Set(range);
            s.selectedCommit = commit;
          });
        } else if (e.ctrlKey || e.metaKey) {
          const next = new Set(state.selectedCommits);
          if (next.has(commit.hash)) {
            next.delete(commit.hash);
          } else {
            next.add(commit.hash);
          }
          setState((s) => {
            s.selectedCommits = next;
            s.selectedCommit = commit;
          });
          lastClickIndex = idx >= 0 ? idx : null;
        } else {
          setState((s) => {
            s.selectedCommits = /* @__PURE__ */ new Set([commit.hash]);
            s.selectedCommit = commit;
          });
          lastClickIndex = idx >= 0 ? idx : null;
        }
        onCommitSelect(commit);
      });
      listContainer.addEventListener("contextmenu", (e) => {
        const commit = findCommitFromEvent(e);
        if (!commit) return;
        e.preventDefault();
        const state = getState();
        let batch;
        if (state.selectedCommits.size > 1 && state.selectedCommits.has(commit.hash)) {
          batch = state.filteredCommits.filter((c) => state.selectedCommits.has(c.hash)).map((c) => c.hash).reverse();
        }
        showCommitContextMenu(e, commit, service2, directory2, batch);
      });
      container.appendChild(listContainer);
      renderList();
      if (unsubscribe) unsubscribe();
      unsubscribe = subscribeFields(
        [
          "filteredCommits",
          "branches",
          "logBranch",
          "selectedCommit",
          "selectedCommits",
          "commitSearch",
          "sortMode",
          "filterAuthor",
          "filterDateFrom",
          "filterDateTo",
          // filterPaths 按引用比较即内容变化：所有写入方均为整体替换新数组（从不原地变异），
          // 对话框应用另有深比较守卫阻止"同内容新引用"写入，故引用不同 = 内容确实变化
          "filterPaths",
          "searchRegex",
          "searchCaseSensitive"
        ],
        (changed) => {
          if (disposed) return;
          console.debug(JSON.stringify({ prefix: "[commit-list]", event: "sub_changed", changed }));
          updateFilterButtons();
          if (changed.includes("searchRegex") || changed.includes("searchCaseSensitive")) {
            filterCommits();
          }
          if (changed.includes("logBranch")) {
            lastClickIndex = null;
          }
          if (changed.includes("logBranch") || changed.includes("sortMode")) {
            renderFilterTag();
          }
          if (changed.includes("commitSearch")) {
            filterCommits();
            return;
          }
          if (changed.includes("sortMode")) {
            console.debug(JSON.stringify({ prefix: "[commit-list]", event: "sort_changed", sortMode: getState().sortMode }));
            filterCommits();
            return;
          }
          if (changed.includes("filteredCommits") || changed.includes("branches") || changed.includes("selectedCommit") || changed.includes("selectedCommits")) {
            const current3 = getState();
            if (changed.includes("filteredCommits") && current3.sortMode !== "default" && !isSortedCommits(current3.filteredCommits, current3.sortMode)) {
              console.debug(JSON.stringify({ prefix: "[commit-list]", event: "sort_realign", sortMode: current3.sortMode }));
              setState((s) => {
                s.filteredCommits = sortCommits(s.filteredCommits, s.sortMode);
              });
              return;
            }
            console.debug(JSON.stringify({ prefix: "[commit-list]", event: "render_list", count: getState().filteredCommits.length }));
            renderList();
          }
        }
      );
      if (unsubscribeDisplay) unsubscribeDisplay();
      let prevDisplay = { ...getState().displaySettings };
      unsubscribeDisplay = subscribeState(() => {
        const settings = getState().displaySettings;
        if (settings.showAuthor === prevDisplay.showAuthor && settings.showDate === prevDisplay.showDate && settings.showHash === prevDisplay.showHash) {
          return;
        }
        prevDisplay = { ...settings };
        if (disposed) return;
        console.debug(JSON.stringify({ prefix: "[commit-list]", event: "display_changed", settings: prevDisplay }));
        renderList();
      });
    };
    const renderFilterTag = () => {
      if (!toolbar) return;
      if (filterTag) {
        filterTag.remove();
        filterTag = null;
      }
      const state = getState();
      const hasSort = state.sortMode !== "default";
      if (!hasSort) return;
      const sortLabelKey = {
        "date-asc": "sort.dateAsc",
        "author-asc": "sort.authorAsc",
        "message-asc": "sort.messageAsc"
      };
      const sortTag = html`
      <span style="display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; background: #3a2e1a; border-radius: 3px; font-size: 11px;">
        <span style="color: #e8a838;">${t(sortLabelKey[state.sortMode])}</span>
        <span data-action="btn-clear-sort" style="color: #888; cursor: pointer; font-size: 10px;">×</span>
      </span>
    `;
      filterTag = html`
      <span style="display: inline-flex; align-items: center; gap: 4px; margin-left: 4px;">
        ${sortTag}
      </span>
    `;
      filterTag.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.getAttribute("data-action");
        if (action === "btn-clear-sort") setState((s) => {
          s.sortMode = "default";
        });
      });
      toolbar.appendChild(filterTag);
    };
    const openBranchDropdown = (anchor) => {
      const state = getState();
      const isFav = (b) => !b.isCurrent && state.favorites.has(b.name);
      const localBranches = state.branches.filter((b) => !b.isRemote && !isFav(b));
      const remoteBranches = state.branches.filter((b) => b.isRemote && !isFav(b));
      const favoriteBranches = state.branches.filter((b) => isFav(b));
      const items = [
        { id: "all", label: t("filter.all"), checked: state.logBranch === null },
        { id: "sep-branch", label: "", kind: "separator" }
      ];
      const pushGroup = (labelKey, groupId, branches) => {
        if (branches.length === 0) return;
        items.push({ id: groupId, label: t(labelKey), kind: "group" });
        for (const b of branches) {
          items.push({ id: b.name, label: b.name, checked: state.logBranch === b.name });
        }
      };
      pushGroup("filter.localBranches", "group-local", localBranches);
      pushGroup("filter.remoteBranches", "group-remote", remoteBranches);
      pushGroup("filter.favorites", "group-favorites", favoriteBranches);
      showDropdownMenu(anchor, items, (id) => {
        console.debug(JSON.stringify({
          prefix: "[commit-list]",
          event: "branch_dropdown_select",
          branch: id === "all" ? null : id
        }));
        if (id === "all") {
          setState((s) => {
            s.logBranch = null;
            s.selectedBranch = null;
            s.selectedCommits = /* @__PURE__ */ new Set();
          });
        } else {
          const branch = getState().branches.find((b) => b.name === id) ?? null;
          setState((s) => {
            s.logBranch = id;
            s.selectedBranch = branch;
            s.selectedCommits = /* @__PURE__ */ new Set();
          });
        }
        void refreshCommits(service2, directory2);
      });
    };
    const openUserDropdown = (anchor) => {
      const state = getState();
      const authors = [...new Set(state.allCommits.map((c) => c.authorName))].sort();
      const items = [
        { id: "all", label: t("filter.all"), checked: state.filterAuthor === "" }
      ];
      for (const name of authors) {
        items.push({ id: name, label: name, checked: state.filterAuthor === name });
      }
      showDropdownMenu(anchor, items, (id) => {
        const author = id === "all" ? "" : id;
        console.debug(JSON.stringify({
          prefix: "[commit-list]",
          event: "user_dropdown_select",
          author
        }));
        setState((s) => {
          s.filterAuthor = author;
        });
        filterCommits();
      });
    };
    const openDateDropdown = (anchor) => {
      const state = getState();
      const now = /* @__PURE__ */ new Date();
      const presets = ["today", "thisWeek", "thisMonth", "thisYear"];
      const presetLabelKey = {
        today: "filter.today",
        thisWeek: "filter.thisWeek",
        thisMonth: "filter.thisMonth",
        thisYear: "filter.thisYear"
      };
      const items = [
        {
          id: "all",
          label: t("filter.all"),
          checked: state.filterDateFrom === "" && state.filterDateTo === ""
        }
      ];
      for (const preset of presets) {
        const range = computeDateRange(preset, now);
        items.push({
          id: preset,
          label: t(presetLabelKey[preset]),
          checked: state.filterDateFrom === range.from && state.filterDateTo === range.to
        });
      }
      items.push({ id: "sep-date", label: "", kind: "separator" });
      items.push({ id: "custom", label: t("filter.custom") });
      showDropdownMenu(anchor, items, (id) => {
        console.debug(JSON.stringify({
          prefix: "[commit-list]",
          event: "date_dropdown_select",
          preset: id
        }));
        if (id === "custom") {
          showDateRangeDialog((range) => {
            setState((s) => {
              s.filterDateFrom = range.from;
              s.filterDateTo = range.to;
            });
            filterCommits();
          });
          return;
        }
        if (id === "all") {
          setState((s) => {
            s.filterDateFrom = "";
            s.filterDateTo = "";
          });
        } else {
          const range = computeDateRange(
            id,
            /* @__PURE__ */ new Date()
          );
          setState((s) => {
            s.filterDateFrom = range.from;
            s.filterDateTo = range.to;
          });
        }
        filterCommits();
      });
    };
    const openPathDropdown = (anchor) => {
      const current3 = getState().filterPaths;
      const items = [
        { id: "all", label: t("filter.all"), checked: !current3.length }
      ];
      for (const path of current3) {
        items.push({ id: `p:${path}`, label: path, checked: true });
      }
      items.push({ id: "sep-path", label: "", kind: "separator" });
      items.push({ id: "pick", label: t("filter.chooseFolder") });
      items.push({ id: "edit", label: t("filter.editPaths") });
      showDropdownMenu(anchor, items, (id) => {
        if (id === "all") {
          console.debug(JSON.stringify({
            prefix: "[commit-list]",
            event: "path_dropdown_select",
            path: []
          }));
          setState((s) => {
            s.filterPaths = [];
          });
          void refreshCommits(service2, directory2);
          return;
        }
        if (id.startsWith("p:")) {
          const path = id.slice(2);
          const next = getState().filterPaths.filter((p) => p !== path);
          console.debug(JSON.stringify({
            prefix: "[commit-list]",
            event: "path_dropdown_select",
            path: next
          }));
          setState((s) => {
            s.filterPaths = next;
          });
          void refreshCommits(service2, directory2);
          return;
        }
        if (id === "pick" || id === "edit") {
          const snapshot = [...getState().filterPaths];
          const onApply = (paths) => {
            if (samePaths(paths, snapshot)) return;
            console.debug(JSON.stringify({
              prefix: "[commit-list]",
              event: "path_dropdown_select",
              path: paths
            }));
            setState((s) => {
              s.filterPaths = [...paths];
            });
            void refreshCommits(service2, directory2);
          };
          if (id === "pick") {
            showPathTreeDialog(service2, directory2, snapshot, onApply);
          } else {
            showPathFilterDialog(snapshot, onApply);
          }
        }
      });
    };
    const renderList = () => {
      if (disposed || !listContainer) return;
      const state = getState();
      listContainer.innerHTML = "";
      const commits = state.filteredCommits;
      if (commits.length === 0) {
        listContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;">\u6682\u65E0\u63D0\u4EA4\u8BB0\u5F55</div>';
        return;
      }
      const branchMap = /* @__PURE__ */ new Map();
      for (const branch of state.branches) {
        if (branch.commit) {
          const existing = branchMap.get(branch.commit) || [];
          existing.push(branch.name);
          branchMap.set(branch.commit, existing);
        }
      }
      for (const commit of commits) {
        const branches = branchMap.get(commit.hash) || [];
        const item = createCommitItem(commit, branches);
        listContainer.appendChild(item);
      }
    };
    const dispose = () => {
      disposed = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (unsubscribeDisplay) {
        unsubscribeDisplay();
        unsubscribeDisplay = null;
      }
    };
    render2();
    return { dispose };
  }
  function createCommitItem(commit, branches = []) {
    const state = getState();
    const settings = state.displaySettings;
    const isSelected = state.selectedCommits.has(commit.hash) || state.selectedCommit?.hash === commit.hash;
    const bgColor = isSelected ? "#2a3a4a" : "transparent";
    const branchTags = branches.length > 0 ? branches.map((b) => {
      const isLocal = !b.includes("/") && b !== "HEAD";
      const bgColor2 = isLocal ? "#4a3a1a" : "#1a3a4a";
      const fgColor = isLocal ? "#e8a838" : "#589df6";
      return `<span style="margin-left: 6px; padding: 0 5px; background: ${bgColor2}; border-radius: 2px; font-size: 10px; color: ${fgColor}; flex-shrink: 0; white-space: nowrap;">${b}</span>`;
    }).join("") : "";
    const hashCol = settings.showHash ? `<span data-col="hash" style="font-family: monospace; color: #888; font-size: 11px; flex-shrink: 0; margin-right: 6px; white-space: nowrap;">${escapeText(commit.shortHash)}</span>` : "";
    const dateCol = settings.showDate ? `<span data-col="date" style="margin-left: auto; color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap;">${formatDate(commit.date)}</span>` : "";
    const authorCol = settings.showAuthor ? `<span data-col="author" style="margin-left: ${settings.showDate ? "12px" : "auto"}; color: #888; font-size: 11px; flex-shrink: 0; white-space: nowrap;">${escapeText(commit.authorName)}</span>` : "";
    const item = html`
    <div 
      style="display: flex; align-items: center; padding: 2px 8px; cursor: pointer; border-bottom: 1px solid #2a2a2a; font-size: 12px; background: ${bgColor}; height: 28px;"
      data-hash="${commit.hash}"
    >
      <!-- 圆点指示器 -->
      <span style="width: 16px; text-align: center; flex-shrink: 0;">
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#e8a838"/></svg>
      </span>
      <!-- 哈希列 -->
      ${hashCol}
      <!-- 提交消息 -->
      <span style="flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 4px;">${commit.message}</span>
      <!-- 分支标签 -->
      ${branchTags}
      <!-- 时间 -->
      ${dateCol}
      <!-- 作者 -->
      ${authorCol}
    </div>
  `;
    return item;
  }
  function escapeText(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function compareCommits(a, b, mode) {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (mode === "date-asc") {
      return dateA - dateB;
    }
    if (mode === "author-asc") {
      return a.authorName.localeCompare(b.authorName) || dateB - dateA;
    }
    if (mode === "message-asc") {
      return a.message.localeCompare(b.message) || dateB - dateA;
    }
    return 0;
  }
  function sortCommits(commits, mode) {
    if (mode === "default") return [...commits];
    return [...commits].sort((a, b) => compareCommits(a, b, mode));
  }
  function isSortedCommits(commits, mode) {
    if (mode === "default") return true;
    for (let i = 1; i < commits.length; i++) {
      if (compareCommits(commits[i - 1], commits[i], mode) > 0) return false;
    }
    return true;
  }
  function matchesSearch(text, pattern, caseSensitive, regex) {
    if (regex) {
      try {
        const re = new RegExp(pattern, caseSensitive ? "" : "i");
        return re.test(text);
      } catch (e) {
        console.error(JSON.stringify({
          prefix: "[commit-list]",
          event: "regex_invalid",
          error: String(e)
        }));
        return caseSensitive ? text.includes(pattern) : text.toLowerCase().includes(pattern.toLowerCase());
      }
    }
    return caseSensitive ? text.includes(pattern) : text.toLowerCase().includes(pattern.toLowerCase());
  }
  function samePaths(a, b) {
    if (a.length !== b.length) return false;
    return a.every((path, index) => path === b[index]);
  }
  function computeDateRange(preset, now) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    let start;
    let end;
    if (preset === "today") {
      start = new Date(y, m, d, 0, 0, 0, 0);
      end = new Date(y, m, d, 23, 59, 59, 999);
    } else if (preset === "thisWeek") {
      const offset = (now.getDay() + 6) % 7;
      start = new Date(y, m, d - offset, 0, 0, 0, 0);
      end = new Date(y, m, d - offset + 6, 23, 59, 59, 999);
    } else if (preset === "thisMonth") {
      start = new Date(y, m, 1, 0, 0, 0, 0);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else {
      start = new Date(y, 0, 1, 0, 0, 0, 0);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  }
  function filterCommits() {
    const state = getState();
    let commits = [...state.allCommits];
    if (state.commitSearch) {
      commits = commits.filter(
        (c) => matchesSearch(c.message, state.commitSearch, state.searchCaseSensitive, state.searchRegex) || matchesSearch(c.shortHash, state.commitSearch, state.searchCaseSensitive, state.searchRegex) || matchesSearch(c.authorName, state.commitSearch, state.searchCaseSensitive, state.searchRegex)
      );
    }
    if (state.filterAuthor) {
      commits = commits.filter((c) => c.authorName === state.filterAuthor);
    }
    if (state.filterDateFrom) {
      commits = commits.filter((c) => new Date(c.date) >= new Date(state.filterDateFrom));
    }
    if (state.filterDateTo) {
      commits = commits.filter((c) => new Date(c.date) <= new Date(state.filterDateTo));
    }
    setState((s) => {
      s.filteredCommits = sortCommits(commits, state.sortMode);
    });
  }
  async function refreshCommits(service2, directory2) {
    const state = getState();
    const branch = state.logBranch || void 0;
    const paths = state.filterPaths.length ? [...state.filterPaths] : void 0;
    try {
      const commits = await service2.getLog(directory2, branch, paths);
      setState((s) => {
        s.allCommits = commits;
        s.filteredCommits = commits;
      });
      filterCommits();
    } catch (e) {
      console.error("[git-manager] \u5237\u65B0\u63D0\u4EA4\u5217\u8868\u5931\u8D25:", e);
    }
  }
  function toggleSelectAll() {
    const state = getState();
    if (state.filteredCommits.length === 0) return;
    const allSelected = state.filteredCommits.every((c) => state.selectedCommits.has(c.hash));
    if (allSelected) {
      setState((s) => {
        s.selectedCommits = /* @__PURE__ */ new Set();
      });
    } else {
      setState((s) => {
        s.selectedCommits = new Set(state.filteredCommits.map((c) => c.hash));
      });
    }
  }
  function toggleRegex() {
    setState((s) => {
      s.searchRegex = !s.searchRegex;
    });
    filterCommits();
    console.debug(JSON.stringify({
      prefix: "[commit-list]",
      event: "search_regex_toggled",
      value: getState().searchRegex
    }));
  }
  function toggleCase() {
    setState((s) => {
      s.searchCaseSensitive = !s.searchCaseSensitive;
    });
    filterCommits();
    console.debug(JSON.stringify({
      prefix: "[commit-list]",
      event: "search_case_toggled",
      value: getState().searchCaseSensitive
    }));
  }
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 6e4);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return "\u521A\u521A";
    if (diffMin < 60) return `${diffMin}\u5206\u949F\u524D`;
    if (diffHour < 24) return `${diffHour}\u5C0F\u65F6\u524D`;
    if (diffDay < 7) return `${diffDay}\u5929\u524D`;
    return date.toLocaleDateString("zh-CN");
  }

  // panel/components/file-context-menu.ts
  function hideFileContextMenu() {
    const existing = document.getElementById("git-file-context-menu");
    if (existing) existing.remove();
  }
  function showFileContextMenu(e, fileDiff, _service, _directory) {
    hideFileContextMenu();
    const items = [
      {
        label: t("file.showDiff"),
        action: () => {
          console.log("[git-manager] Show Diff:", fileDiff.path);
        }
      },
      {
        label: t("file.showDiffNew"),
        action: () => {
          console.log("[git-manager] Show Diff in New Window:", fileDiff.path);
        }
      },
      { type: "separator" },
      {
        label: t("file.compareLocal"),
        action: () => {
          console.log("[git-manager] Compare with Local:", fileDiff.path);
        }
      },
      {
        label: t("file.compareBeforeLocal"),
        action: () => {
          console.log("[git-manager] Compare Before with Local:", fileDiff.path);
        }
      },
      { type: "separator" },
      {
        label: t("file.editSource"),
        action: () => {
          console.log("[git-manager] Edit Source:", fileDiff.path);
        }
      },
      {
        label: t("file.openRepoVersion"),
        action: () => {
          console.log("[git-manager] Open Repository Version:", fileDiff.path);
        }
      },
      { type: "separator" },
      {
        label: t("file.revertChanges"),
        danger: true,
        action: async () => {
          console.log("[git-manager] Revert Selected Changes:", fileDiff.path);
        }
      },
      {
        label: t("file.cherryPickChanges"),
        action: async () => {
          console.log("[git-manager] Cherry-Pick Selected Changes:", fileDiff.path);
        }
      },
      { type: "separator" },
      {
        label: t("file.createPatch"),
        action: () => {
          console.log("[git-manager] Create Patch:", fileDiff.path);
        }
      },
      {
        label: t("file.getFromRevision"),
        action: () => {
          console.log("[git-manager] Get from Revision:", fileDiff.path);
        }
      },
      {
        label: t("file.historyUpTo"),
        action: () => {
          console.log("[git-manager] History Up to Here:", fileDiff.path);
        }
      }
    ];
    const menu = html`
    <div id="git-file-context-menu" style="
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: #2d2d2d;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 200px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    "></div>
  `;
    for (const item of items) {
      if ("type" in item && item.type === "separator") {
        const sep = document.createElement("div");
        sep.style.height = "1px";
        sep.style.background = "#444";
        sep.style.margin = "4px 0";
        menu.appendChild(sep);
        continue;
      }
      const menuItem = item;
      const el2 = document.createElement("div");
      el2.textContent = menuItem.label;
      el2.style.padding = "6px 12px";
      el2.style.cursor = "pointer";
      el2.style.fontSize = "12px";
      el2.style.color = menuItem.danger ? "#f44336" : "#ccc";
      menu.appendChild(el2);
    }
    menu.addEventListener("mouseenter", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu) {
        target.style.background = "#3a3a3a";
      }
    }, true);
    menu.addEventListener("mouseleave", (ev) => {
      const target = ev.target.closest("div");
      if (target && target.parentElement === menu) {
        target.style.background = "transparent";
      }
    }, true);
    menu.addEventListener("click", async (ev) => {
      const target = ev.target.closest("div");
      if (!target || target.parentElement !== menu) return;
      const label = target.textContent;
      const item = items.find((i) => !("type" in i) && i.label === label);
      if (item) {
        hideFileContextMenu();
        await item.action();
      }
    });
    document.body.appendChild(menu);
    const closeHandler2 = (ev) => {
      if (!menu.contains(ev.target)) {
        hideFileContextMenu();
        document.removeEventListener("click", closeHandler2);
      }
    };
    setTimeout(() => document.addEventListener("click", closeHandler2), 0);
  }

  // panel/components/file-diff.ts
  function createFileDiffPanel(container, service2, directory2) {
    let disposed = false;
    let listContainer = null;
    let previewContainer = null;
    let selectedPath = null;
    let unsubscribe = null;
    let titleEl = null;
    const findPathFromEvent = (e) => {
      const target = e.target;
      const item = target.closest("[data-path]");
      if (!item) return null;
      return item.getAttribute("data-path");
    };
    const renderPreview = (diff) => {
      if (!previewContainer) return;
      previewContainer.innerHTML = "";
      if (!diff) {
        previewContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;">\u9009\u62E9\u6587\u4EF6\u67E5\u770B\u5DEE\u5F02</div>';
        return;
      }
      const title = html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 11px; color: #ccc;">
        ${diff.path}
      </div>
    `;
      previewContainer.appendChild(title);
      const diffContent = html`
      <div style="flex: 1; overflow-y: auto; font-family: monospace; font-size: 12px;"></div>
    `;
      if (diff.lines && diff.lines.length > 0) {
        for (const line of diff.lines) {
          diffContent.appendChild(createDiffLine(line));
        }
      } else {
        diffContent.innerHTML = '<div style="padding: 8px; color: #888;">\u65E0\u5DEE\u5F02\u5185\u5BB9</div>';
      }
      previewContainer.appendChild(diffContent);
    };
    const render2 = () => {
      if (disposed) return;
      container.innerHTML = "";
      const state = getState();
      titleEl = html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 12px; color: #ccc; flex-shrink: 0;">
        变更文件 <span style="color: #888;">${state.diffs.length}</span>
      </div>
    `;
      container.appendChild(titleEl);
      const splitArea = html`
      <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;"></div>
    `;
      listContainer = html`
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden; border-bottom: 1px solid #333;"></div>
    `;
      listContainer.addEventListener("mouseenter", (e) => {
        const target = e.target.closest("[data-path]");
        if (target) target.style.background = "#2a2a2a";
      }, true);
      listContainer.addEventListener("mouseleave", (e) => {
        const target = e.target.closest("[data-path]");
        if (target) {
          target.style.background = target.getAttribute("data-path") === selectedPath ? "#2a3a4a" : "transparent";
        }
      }, true);
      listContainer.addEventListener("click", (e) => {
        const path = findPathFromEvent(e);
        if (path) {
          selectedPath = path;
          const diff = getState().diffs.find((d) => d.path === path) || null;
          renderPreview(diff);
          listContainer?.querySelectorAll("[data-path]").forEach((el2) => {
            el2.style.background = el2.getAttribute("data-path") === path ? "#2a3a4a" : "transparent";
          });
        }
      });
      listContainer.addEventListener("contextmenu", (e) => {
        const path = findPathFromEvent(e);
        if (path) {
          e.preventDefault();
          const diff = getState().diffs.find((d) => d.path === path);
          if (diff) showFileContextMenu(e, diff, service2, directory2);
        }
      });
      splitArea.appendChild(listContainer);
      previewContainer = html`
      <div style="height: 120px; min-height: 60px; display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e;"></div>
    `;
      splitArea.appendChild(previewContainer);
      container.appendChild(splitArea);
      renderFileList();
      renderPreview(null);
      if (unsubscribe) unsubscribe();
      unsubscribe = subscribeFields(["diffs"], () => {
        if (disposed) return;
        updateTitleCount();
        selectedPath = null;
        renderFileList();
        renderPreview(null);
      });
    };
    const updateTitleCount = () => {
      if (!titleEl) return;
      const count = getState().diffs.length;
      const span = titleEl.querySelector("span");
      if (span) span.textContent = String(count);
    };
    const renderFileList = () => {
      if (!listContainer) return;
      const state = getState();
      listContainer.innerHTML = "";
      if (state.diffs.length === 0) {
        listContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;">\u6682\u65E0\u53D8\u66F4\u6587\u4EF6</div>';
        return;
      }
      for (const diff of state.diffs) {
        listContainer.appendChild(createFileDiffItem(diff));
      }
    };
    const dispose = () => {
      disposed = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
    render2();
    return { dispose };
  }
  function createDiffLine(line) {
    let bgColor = "transparent";
    let color = "#ccc";
    let prefix = " ";
    if (line.type === "add") {
      bgColor = "#1a3a1a";
      color = "#4caf50";
      prefix = "+";
    } else if (line.type === "delete") {
      bgColor = "#3a1a1a";
      color = "#f44336";
      prefix = "-";
    }
    const lineNum = line.newLine !== void 0 ? String(line.newLine) : " ";
    const oldNum = line.oldLine !== void 0 ? String(line.oldLine) : " ";
    return html`
    <div style="display: flex; background: ${bgColor}; color: ${color}; font-size: 12px; line-height: 1.4;">
      <span style="width: 36px; text-align: right; padding: 0 4px; color: #666; user-select: none; flex-shrink: 0;">${oldNum}</span>
      <span style="width: 36px; text-align: right; padding: 0 4px; color: #666; user-select: none; flex-shrink: 0;">${lineNum}</span>
      <span style="width: 14px; text-align: center; user-select: none; flex-shrink: 0;">${prefix}</span>
      <span style="flex: 1; padding: 0 4px; white-space: pre; overflow-x: auto;">${line.content}</span>
    </div>
  `;
  }
  function createFileDiffItem(diff) {
    const statusLabel = getStatusLabel(diff.path);
    const statusColor = getStatusColor(statusLabel);
    return html`
    <div 
      style="display: flex; align-items: center; padding: 3px 8px; cursor: pointer; border-bottom: 1px solid #2a2a2a; font-size: 12px;"
      data-path="${diff.path}"
    >
      <span style="width: 14px; text-align: center; color: ${statusColor}; margin-right: 6px; font-size: 10px; font-weight: bold;">${statusLabel}</span>
      <span style="flex: 1; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${diff.path}</span>
      <span style="margin-left: 8px; font-size: 10px; color: #4caf50;">+${diff.additions}</span>
      <span style="margin-left: 4px; font-size: 10px; color: #f44336;">-${diff.deletions}</span>
    </div>
  `;
  }
  function getStatusLabel(path) {
    if (path.includes(".new.") || path.includes(".added.")) return "A";
    if (path.includes(".deleted.") || path.includes(".removed.")) return "D";
    if (path.includes(".modified.") || path.includes(".changed.")) return "M";
    if (path.includes(".renamed.")) return "R";
    return "M";
  }
  function getStatusColor(label) {
    switch (label) {
      case "A":
        return "#4caf50";
      case "D":
        return "#f44336";
      case "M":
        return "#ff9800";
      case "R":
        return "#589df6";
      default:
        return "#ccc";
    }
  }

  // panel/components/commit-detail.ts
  function createCommitDetailPanel(container, _service, _directory) {
    let disposed = false;
    let unsubscribe = null;
    const render2 = () => {
      if (disposed) return;
      container.innerHTML = "";
      const state = getState();
      container.appendChild(html`
      <div style="padding: 4px 8px; background: #252526; border-bottom: 1px solid #333; font-size: 12px; color: #ccc; flex-shrink: 0;">
        提交详情
      </div>
    `);
      const content = html`
      <div style="flex: 1; overflow-y: auto; padding: 8px; font-size: 12px;"></div>
    `;
      if (!state.commitDetail) {
        content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">\u9009\u62E9\u8981\u67E5\u770B\u66F4\u6539\u7684\u63D0\u4EA4</div>';
      } else {
        renderCommitDetail(content, state.commitDetail);
      }
      container.appendChild(content);
      if (unsubscribe) unsubscribe();
      unsubscribe = subscribeFields(["commitDetail"], () => {
        if (disposed) return;
        render2();
      });
    };
    const renderCommitDetail = (container2, commit) => {
      container2.innerHTML = "";
      const fields = [
        { label: "\u63D0\u4EA4", value: commit.hash, mono: true },
        { label: "\u4F5C\u8005", value: `${commit.authorName} <${commit.authorEmail}>` },
        { label: "\u65E5\u671F", value: new Date(commit.date).toLocaleString("zh-CN") }
      ];
      for (const field of fields) {
        container2.appendChild(html`
        <div style="margin-bottom: 8px;">
          <div style="color: #888; font-size: 11px; margin-bottom: 2px;">${field.label}</div>
          <div style="color: #ccc; word-break: break-all; ${field.mono ? "font-family: monospace;" : ""}">${field.value}</div>
        </div>
      `);
      }
      container2.appendChild(html`
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #333;">
        <div style="color: #ccc; white-space: pre-wrap;">${commit.message}</div>
      </div>
    `);
    };
    const dispose = () => {
      disposed = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
    render2();
    return { dispose };
  }

  // panel/components/sidebar.ts
  var SIDEBAR_STYLE = "width: 40px; min-width: 40px; background: #2b2b2b; border-right: 1px solid #333; display: flex; flex-direction: column; align-items: center; padding: 4px 0; gap: 2px;";
  var BUTTON_STYLE = "width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; color: #6E6E6E;";
  var ITEMS = [
    { key: "hideBranches", icon: "hideBranches", titleKey: "sidebar.hideBranches", handler: "onToggleBranchPanel" },
    { key: "newBranch", icon: "newBranch", titleKey: "sidebar.newBranch", handler: "onNewBranch" },
    { key: "refresh", icon: "refresh", titleKey: "sidebar.update", handler: "onRefresh" },
    { key: "checkout", icon: "checkout", titleKey: "sidebar.checkout", handler: "onCheckout" },
    {
      key: "merge",
      icon: "merge",
      titleKey: "sidebar.merge",
      handler: "onMerge",
      customSvg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2V14M12 2V14M4 8C4 8 8 8 12 8" stroke="#6E6E6E" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    { key: "search", icon: "search", titleKey: "sidebar.search", handler: "onSearch" },
    { key: "favorite", icon: "favorite", titleKey: "sidebar.favorite", handler: "onFavorite" },
    { key: "settings", icon: "settings", titleKey: "sidebar.settings", handler: "onSettings" },
    { key: "pull", icon: "pull", titleKey: "sidebar.pull", handler: "onPull" },
    { key: "expandAll", icon: "expandAll", titleKey: "sidebar.expandAll", handler: "onExpandAll" },
    { key: "sort", icon: "sort", titleKey: "sidebar.sort", handler: "onSort" },
    { key: "close", icon: "close", titleKey: "sidebar.close", handler: "onClose" }
  ];
  function buildToggleTitle() {
    return getState().branchPanelHidden ? t("sidebar.showBranches") : t("sidebar.hideBranches");
  }
  function buildToggleIcon() {
    return getState().branchPanelHidden ? getIcon("showBranches") : getIcon("hideBranches");
  }
  function createSidebar(container, handlers) {
    let disposed = false;
    let toggleBtn = null;
    container.style.cssText = SIDEBAR_STYLE;
    container.innerHTML = "";
    for (const item of ITEMS) {
      const isToggle = item.handler === "onToggleBranchPanel";
      const title = isToggle ? buildToggleTitle() : t(item.titleKey);
      const btn = html`
      <div data-sidebar="${item.key}" style="${BUTTON_STYLE}" title="${title}">
        ${isToggle ? buildToggleIcon() : item.customSvg ?? getIcon(item.icon)}
      </div>
    `;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#3c3c3c";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "transparent";
      });
      btn.addEventListener("click", (e) => {
        if (disposed) return;
        if (item.handler === "onSettings") {
          handlers.onSettings(e);
        } else {
          handlers[item.handler]();
        }
      });
      if (isToggle) toggleBtn = btn;
      container.appendChild(btn);
    }
    const unsubscribe = subscribeFields(["branchPanelHidden"], () => {
      if (disposed || !toggleBtn) return;
      toggleBtn.title = buildToggleTitle();
      toggleBtn.innerHTML = buildToggleIcon();
    });
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      container.innerHTML = "";
      toggleBtn = null;
    };
    return { dispose };
  }

  // panel/main.ts
  var root = document.querySelector("#root");
  var service = createServiceClient(host);
  var disposables = [];
  var directory = null;
  var rendering = false;
  var loadingData = false;
  var clearingBranchFilter = false;
  function getDir() {
    if (!directory) throw new Error("\u76EE\u5F55\u672A\u521D\u59CB\u5316");
    return directory;
  }
  function clearAll() {
    for (const d of disposables) {
      d.dispose();
    }
    disposables = [];
    root.innerHTML = "";
  }
  async function render() {
    if (rendering) return;
    rendering = true;
    try {
      clearAll();
      if (!directory) {
        const empty = mountEmpty(root, {
          title: "\u7B49\u5F85\u521D\u59CB\u5316...",
          body: "\u6B63\u5728\u52A0\u8F7D\u9879\u76EE\u4FE1\u606F\u3002"
        });
        disposables.push(empty);
        return;
      }
      const isGit = await checkGitRepository();
      if (!isGit) {
        root.innerHTML = "";
        const empty = mountEmpty(root, {
          title: "\u975E Git \u4ED3\u5E93",
          body: "\u5F53\u524D\u76EE\u5F55\u4E0D\u662F Git \u4ED3\u5E93\u3002"
        });
        disposables.push(empty);
        return;
      }
      const mainLayout = html`
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden;"></div>
    `;
      const contentArea = html`
      <div style="display: flex; flex: 1; width: 100%; overflow: hidden;"></div>
    `;
      mainLayout.appendChild(contentArea);
      const sidebarHost = html`
      <div></div>
    `;
      contentArea.appendChild(sidebarHost);
      const branchPanel = html`
      <div style="width: 220px; min-width: 220px; border-right: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e;"></div>
    `;
      branchPanel.style.display = getState().branchPanelHidden ? "none" : "";
      contentArea.appendChild(branchPanel);
      const branchPanelComp = createBranchPanel(
        branchPanel,
        service,
        getDir(),
        (branch) => {
          console.debug(JSON.stringify({ prefix: "[main]", event: "on_branch_select_cb", branchName: branch.name }));
          loadCommitsForBranch(branch.name);
        },
        // 点击分支面板空白区域：取消选中并清除分支过滤，恢复全部提交
        () => {
          clearBranchFilter();
        }
      );
      disposables.push(branchPanelComp);
      const commitListPanel = html`
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #333;"></div>
    `;
      contentArea.appendChild(commitListPanel);
      const commitListComp = createCommitListPanel(commitListPanel, service, getDir(), (commit) => {
        loadCommitDetail(commit.hash);
      });
      disposables.push(commitListComp);
      const sidebarComp = createSidebar(sidebarHost, {
        onToggleBranchPanel: () => {
          setState((s) => {
            s.branchPanelHidden = !s.branchPanelHidden;
          });
          branchPanel.style.display = getState().branchPanelHidden ? "none" : "";
        },
        onNewBranch: () => {
          try {
            const selected = getState().selectedCommit?.hash ?? null;
            void service.debugLog("new-branch-dialog-open", { selectedCommit: selected });
            showCreateBranchDialog(service, getDir(), selected ?? void 0);
          } catch (e) {
            console.error(JSON.stringify({ prefix: "[sidebar]", event: "new_branch_error", error: String(e) }));
          }
        },
        onRefresh: () => {
          void runSidebarUpdate();
        },
        onCheckout: () => {
          void runSidebarCheckout();
        },
        onMerge: () => {
          void runSidebarMerge();
        },
        onSearch: () => {
          commitListPanel.querySelector("[data-search-input]")?.focus();
        },
        onFavorite: () => {
          void runSidebarFavorite();
        },
        onSettings: (e) => {
          showSettingsMenu(e);
        },
        onPull: () => {
          void runSidebarPull();
        },
        onExpandAll: () => {
          branchPanelComp.expandAll();
        },
        onSort: () => {
          setState((s) => {
            s.sortMode = s.sortMode === "default" ? "date-asc" : s.sortMode === "date-asc" ? "author-asc" : s.sortMode === "author-asc" ? "message-asc" : "default";
          });
        },
        onClose: () => {
          void runSidebarClose();
        }
      });
      disposables.push(sidebarComp);
      const detailPanel = html`
      <div style="width: 300px; min-width: 200px; display: flex; flex-direction: column; overflow: hidden;"></div>
    `;
      contentArea.appendChild(detailPanel);
      const fileDiffPanel = html`
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-bottom: 1px solid #333;"></div>
    `;
      detailPanel.appendChild(fileDiffPanel);
      const fileDiffComp = createFileDiffPanel(fileDiffPanel, service, getDir());
      disposables.push(fileDiffComp);
      const commitDetailPanel = html`
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;"></div>
    `;
      detailPanel.appendChild(commitDetailPanel);
      const commitDetailComp = createCommitDetailPanel(commitDetailPanel, service, getDir());
      disposables.push(commitDetailComp);
      root.appendChild(mainLayout);
      const tabBar = createTabBar();
      root.appendChild(tabBar);
    } finally {
      rendering = false;
    }
  }
  function createTabBar() {
    return html`
    <div style="flex-shrink: 0; border-top: 1px solid #333;">
      <div style="display: flex; background: #2d2d2d; padding: 0; align-items: center;">
        <div style="padding: 4px 12px; font-size: 11px; color: #fff; background: #1e1e1e; border-right: 1px solid #333; cursor: pointer;">Git</div>
        <div style="padding: 4px 12px; font-size: 11px; color: #888; cursor: pointer; border-right: 1px solid #333;">控制台</div>
        <div style="display: flex; align-items: center; padding: 4px 12px; font-size: 11px; color: #888; cursor: pointer; gap: 4px;">
          <span>Worktrees</span>
          <span style="color: #666; font-size: 10px; cursor: pointer;">×</span>
        </div>
      </div>
    </div>
  `;
  }
  function resolveSidebarTarget() {
    const state = getState();
    return state.selectedBranch ?? state.branches.find((b) => b.isCurrent) ?? null;
  }
  async function runSidebarCheckout() {
    const target = resolveSidebarTarget();
    if (!target) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "checkout_no_branch" }));
      return;
    }
    try {
      await service.checkoutBranch(getDir(), target.name);
      await loadData();
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "checkout_error", branchName: target.name, error: String(e) }));
    }
  }
  async function runSidebarMerge() {
    const target = resolveSidebarTarget();
    if (!target) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "merge_no_branch" }));
      return;
    }
    try {
      await service.mergeBranch(getDir(), target.name);
      await loadData();
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "merge_error", branchName: target.name, error: String(e) }));
    }
  }
  async function runSidebarFavorite() {
    const target = resolveSidebarTarget();
    if (!target) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "favorite_no_branch" }));
      return;
    }
    const next = new Set(getState().favorites);
    if (next.has(target.name)) {
      next.delete(target.name);
    } else {
      next.add(target.name);
    }
    setState((s) => {
      s.favorites = next;
    });
    try {
      await service.saveFavorites(getDir(), [...next]);
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "save_favorites_error", error: String(e) }));
    }
  }
  async function runSidebarUpdate() {
    try {
      await service.fetch(getDir());
      await loadData();
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "fetch_error", error: String(e) }));
    }
  }
  async function runSidebarPull() {
    try {
      await service.pull(getDir());
      await loadData();
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "pull_error", error: String(e) }));
    }
  }
  async function runSidebarClose() {
    try {
      await host.close();
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[sidebar]", event: "close_error", error: String(e) }));
    }
  }
  async function loadCommitsForBranch(branchName) {
    console.debug(JSON.stringify({ prefix: "[main]", event: "load_branch_start", branchName }));
    setState((s) => {
      s.logBranch = branchName;
      s.selectedCommits = /* @__PURE__ */ new Set();
    });
    console.debug(JSON.stringify({ prefix: "[main]", event: "log_branch_set", branchName }));
    try {
      const commits = await service.getLog(getDir(), branchName, getState().filterPaths.length ? getState().filterPaths : void 0);
      console.debug(JSON.stringify({ prefix: "[main]", event: "get_log_done", count: commits.length }));
      setState((s) => {
        s.allCommits = commits;
        s.filteredCommits = commits;
      });
      console.debug(JSON.stringify({ prefix: "[main]", event: "commits_set", count: commits.length }));
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[main]", event: "load_branch_error", branchName, error: String(e) }));
    }
  }
  async function clearBranchFilter() {
    if (clearingBranchFilter) {
      console.debug(JSON.stringify({ prefix: "[main]", event: "clear_branch_filter_skipped" }));
      return;
    }
    clearingBranchFilter = true;
    try {
      setState((s) => {
        s.selectedBranch = null;
        s.logBranch = null;
        s.selectedCommits = /* @__PURE__ */ new Set();
      });
      const commits = await service.getLog(getDir(), void 0, getState().filterPaths.length ? getState().filterPaths : void 0);
      setState((s) => {
        s.allCommits = commits;
        s.filteredCommits = commits;
      });
      filterCommits();
      console.debug(JSON.stringify({ prefix: "[main]", event: "branch_filter_cleared", count: commits.length }));
    } catch (e) {
      console.error(JSON.stringify({ prefix: "[main]", event: "clear_branch_filter_error", error: String(e) }));
    } finally {
      clearingBranchFilter = false;
    }
  }
  async function loadCommitDetail(hash) {
    try {
      const detail = await service.getCommitDetail(getDir(), hash);
      const diffs = await service.getCommitDiffs(getDir(), hash);
      setState((s) => {
        s.commitDetail = detail;
        s.diffs = diffs;
      });
    } catch (e) {
      console.error("[git-manager] \u52A0\u8F7D\u63D0\u4EA4\u8BE6\u60C5\u5931\u8D25:", e);
    }
  }
  async function loadBranches() {
    try {
      const branches = await service.getBranches(getDir());
      setState((s) => {
        s.branches = branches;
      });
    } catch (e) {
      console.error("[git-manager] \u52A0\u8F7D\u5206\u652F\u5931\u8D25:", e);
    }
  }
  async function loadFavorites() {
    try {
      const favorites = await service.getFavorites(getDir());
      setState((s) => {
        s.favorites = new Set(favorites);
      });
    } catch (e) {
      console.error("[git-manager] \u52A0\u8F7D\u6536\u85CF\u5931\u8D25:", e);
    }
  }
  async function checkGitRepository() {
    try {
      return await service.isGitRepository(getDir());
    } catch {
      return false;
    }
  }
  async function init() {
    host.onReady((context) => {
      setLocale(context.locale);
    });
    host.onDirectory((dir) => {
      directory = dir;
      if (dir) {
        loadData({ reset: true });
      }
    });
  }
  async function loadData(options = {}) {
    if (!directory) return;
    if (loadingData) {
      console.debug(JSON.stringify({ prefix: "[main]", event: "load_data_skipped" }));
      return;
    }
    loadingData = true;
    try {
      const reset = options.reset === true;
      const mode = reset ? "reset" : "refresh";
      console.debug(JSON.stringify({ prefix: "[main]", event: "load_data_start", directory, mode }));
      if (reset) {
        setState((s) => {
          s.branches = [];
          s.allCommits = [];
          s.filteredCommits = [];
          s.logBranch = null;
          s.selectedBranch = null;
          s.selectedCommit = null;
          s.selectedCommits = /* @__PURE__ */ new Set();
          s.commitDetail = null;
          s.diffs = [];
          s.branchFilter = "";
          s.commitSearch = "";
          s.filterAuthor = "";
          s.filterDateFrom = "";
          s.filterDateTo = "";
          s.filterPaths = [];
        });
        const isGit = await checkGitRepository();
        if (!isGit) {
          root.innerHTML = "";
          const empty = mountEmpty(root, {
            title: "\u975E Git \u4ED3\u5E93",
            body: "\u5F53\u524D\u76EE\u5F55\u4E0D\u662F Git \u4ED3\u5E93\u3002"
          });
          disposables.push(empty);
          return;
        }
      }
      await Promise.all([
        loadBranches(),
        loadFavorites()
      ]);
      try {
        const branch = getState().logBranch || void 0;
        const commits = await service.getLog(getDir(), branch, getState().filterPaths.length ? getState().filterPaths : void 0);
        console.debug(JSON.stringify({ prefix: "[main]", event: "load_data_commits", count: commits.length }));
        setState((s) => {
          s.allCommits = commits;
          s.filteredCommits = commits;
          const hashes = new Set(commits.map((c) => c.hash));
          if (s.selectedCommit && !hashes.has(s.selectedCommit.hash)) {
            s.selectedCommit = null;
            s.commitDetail = null;
            s.diffs = [];
          }
          if (s.selectedCommits.size > 0) {
            s.selectedCommits = new Set([...s.selectedCommits].filter((h) => hashes.has(h)));
          }
        });
        filterCommits();
      } catch (e) {
        console.error(JSON.stringify({ prefix: "[main]", event: "load_data_commits_error", error: String(e) }));
      }
      if (reset) {
        await render();
      }
      console.debug(JSON.stringify({ prefix: "[main]", event: "load_data_done" }));
    } finally {
      loadingData = false;
    }
  }
  document.addEventListener("click", () => {
    hideContextMenu();
  });
  init();
  void service.debugLog("panel-loaded", { ts: (/* @__PURE__ */ new Date()).toISOString() });
})();
