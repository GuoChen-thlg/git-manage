/**
 * 提交图线组件
 * 可视化分支合并图
 * 车道配色走语义 token（由 __styles__/commit-graph.css 映射到 --gm-* 主题变量）：
 * - HEAD / 当前车道：primary
 * - 合并点：warning
 * - 其余车道：muted / border 中性色（不再硬编码蓝/红等色值）
 */

import { CommitInfo } from '../state';

/**
 * 车道语义色 token（非颜色字面量，映射规则见 __styles__/commit-graph.css）
 * 循环顺序保证相邻车道颜色可区分：中性两色交替，主色留首位
 */
const LANE_TOKENS = [
  'primary',
  'muted',
  'border',
  'subtle',
  'muted-surface',
  'elevated',
];

/** 图线列信息 */
export interface GraphColumn {
  hash: string;
  column: number;
  /** 语义色 token（如 'primary'），由 CSS 映射为 --gm-* 变量色 */
  color: string;
}

/** 计算图线布局，返回每行的列信息 */
export function calculateGraphRows(commits: CommitInfo[]): GraphColumn[][] {
  const rows: GraphColumn[][] = [];
  const columnMap = new Map<string, number>(); // hash -> column
  let nextColumn = 0;

  // 建立 hash 到 commit 的映射
  const commitMap = new Map<string, CommitInfo>();
  for (const commit of commits) {
    commitMap.set(commit.hash, commit);
  }

  for (const commit of commits) {
    let column: number;

    // 如果已经有列分配，使用它
    if (columnMap.has(commit.hash)) {
      column = columnMap.get(commit.hash)!;
    } else {
      column = nextColumn++;
      columnMap.set(commit.hash, column);
    }

    // 当前行的列信息
    const rowColumns: GraphColumn[] = [];

    // 为父提交分配列
    for (let i = 0; i < commit.parents.length; i++) {
      const parentHash = commit.parents[i];
      if (!columnMap.has(parentHash)) {
        if (i === 0) {
          columnMap.set(parentHash, column);
        } else {
          columnMap.set(parentHash, nextColumn++);
        }
      }
    }

    // 收集当前活跃的列
    const activeColumns = new Set<number>();
    for (const c of columnMap.values()) {
      activeColumns.add(c);
    }

    // 为每个活跃列创建信息
    for (const col of activeColumns) {
      // 找到这个列对应的 hash
      let hash = '';
      for (const [h, c] of columnMap.entries()) {
        if (c === col) {
          hash = h;
          break;
        }
      }
      const color = LANE_TOKENS[col % LANE_TOKENS.length];
      rowColumns.push({ hash, column: col, color });
    }

    rows.push(rowColumns);
  }

  return rows;
}

/** 生成单行的图线 SVG */
export function generateRowGraphSVG(
  commit: CommitInfo,
  rowColumns: GraphColumn[],
  nextRowColumns: GraphColumn[] | undefined,
  // columnIndex 属于调用契约占位参数（当前按 rowColumns 定位节点，未消费该列号）
  _columnIndex: number
): string {
  const WIDTH = 80;
  const HEIGHT = 24;
  const COL_WIDTH = 16;
  const PADDING = 8;

  // 找到当前提交的列
  const nodeCol = rowColumns.find(c => c.hash === commit.hash);
  const nodeX = PADDING + (nodeCol ? nodeCol.column : 0) * COL_WIDTH;
  // 合并提交（多父）节点用 warning 语义色，其余取所在车道 token
  const isMerge = commit.parents.length > 1;
  const nodeToken = isMerge ? 'warning' : (nodeCol ? nodeCol.color : LANE_TOKENS[0]);
  const nodeColor = `var(--gm-${nodeToken})`;

  let svg = `<svg class="gm-graph-row" width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

  // 绘制垂直线（从当前行到下一行）
  if (nextRowColumns) {
    for (const col of rowColumns) {
      const x = PADDING + col.column * COL_WIDTH;
      // 找到下一行中对应的列
      const nextCol = nextRowColumns.find(c => c.column === col.column);
      if (nextCol) {
        svg += `<line class="gm-graph-line" x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}" stroke="var(--gm-${col.color})" stroke-width="2"/>`;
      } else {
        // 列在下一行结束
        svg += `<line class="gm-graph-line" x1="${x}" y1="0" x2="${x}" y2="${HEIGHT / 2}" stroke="var(--gm-${col.color})" stroke-width="2"/>`;
      }
    }

    // 绘制新开始的列
    for (const col of nextRowColumns) {
      if (!rowColumns.find(c => c.column === col.column)) {
        const x = PADDING + col.column * COL_WIDTH;
        svg += `<line class="gm-graph-line" x1="${x}" y1="${HEIGHT / 2}" x2="${x}" y2="${HEIGHT}" stroke="var(--gm-${col.color})" stroke-width="2"/>`;
      }
    }

    // 绘制合并线（如果有多条线需要水平连接）
    const node = rowColumns.find(c => c.hash === commit.hash);
    if (node && commit.parents.length > 1) {
      const parent1Col = rowColumns.find(c => c.hash === commit.parents[0]);
      const parent2Col = rowColumns.find(c => c.hash === commit.parents[1]);
      if (parent1Col && parent2Col) {
        const x1 = PADDING + parent1Col.column * COL_WIDTH;
        const x2 = PADDING + parent2Col.column * COL_WIDTH;
        svg += `<line class="gm-graph-merge-line" x1="${x1}" y1="${HEIGHT / 2}" x2="${x2}" y2="${HEIGHT / 2}" stroke="${nodeColor}" stroke-width="2"/>`;
      }
    }
  } else {
    // 最后一行，只绘制到中间的垂直线
    for (const col of rowColumns) {
      const x = PADDING + col.column * COL_WIDTH;
      svg += `<line class="gm-graph-line" x1="${x}" y1="0" x2="${x}" y2="${HEIGHT / 2}" stroke="var(--gm-${col.color})" stroke-width="2"/>`;
    }
  }

  // 绘制节点
  svg += `<circle class="gm-graph-node" cx="${nodeX}" cy="${HEIGHT / 2}" r="4" fill="${nodeColor}"/>`;

  svg += '</svg>';
  return svg;
}