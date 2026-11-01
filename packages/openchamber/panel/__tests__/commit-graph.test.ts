/**
 * 提交图线组件单元测试
 * 覆盖 calculateGraphRows 列布局计算与 generateRowGraphSVG 单行 SVG 生成
 * 配色断言语义 token → var(--gm-*) 变量（不硬编码颜色字面量）
 */
import { describe, it, expect } from 'vitest';
import { calculateGraphRows, generateRowGraphSVG, GraphColumn } from '../components/commit-graph';
import { CommitInfo } from '../state';
import { expectNoHardcodedHex } from './theme-helpers';

/**
 * 构造测试用提交
 * @param hash 提交哈希
 * @param parents 父提交哈希列表
 * @returns 提交信息对象
 */
function createCommit(hash: string, parents: string[] = []): CommitInfo {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message: `提交 ${hash}`,
    authorName: '测试者',
    authorEmail: 'tester@example.com',
    date: '2026-09-27',
    parents,
  };
}

/**
 * 统计 SVG 字符串中 <line 元素个数
 * @param svg SVG 字符串
 * @returns 线条数量
 */
function countLines(svg: string): number {
  return (svg.match(/<line/g) ?? []).length;
}

/** 第 0 列车道 token（primary） */
const TOKEN_0 = 'var(--gm-primary)';
/** 第 1 列车道 token（muted） */
const TOKEN_1 = 'var(--gm-muted)';
/** 合并点语义色（warning） */
const TOKEN_MERGE = 'var(--gm-warning)';

/** 列信息字面量构造（断言用） */
function col(hash: string, column: number, color: string): GraphColumn {
  return { hash, column, color };
}

describe('commit-graph', () => {
  describe('calculateGraphRows', () => {
    it('空提交列表应返回空数组', () => {
      expect(calculateGraphRows([])).toEqual([]);
    });

    it('单个无父提交应独占第 0 列并使用首个车道 token', () => {
      const rows = calculateGraphRows([createCommit('A')]);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual([col('A', 0, 'primary')]);
    });

    it('列只增不减：提交按父子链展开时活跃列逐行累积', () => {
      const rows = calculateGraphRows([
        createCommit('A'),
        createCommit('C', ['A']),
        createCommit('D', ['C']),
      ]);

      expect(rows).toHaveLength(3);
      // 列分配只增不减：每行收集到的活跃列逐行增加（列一旦分配不回收）
      expect(rows[0]).toHaveLength(1);
      expect(rows[1]).toHaveLength(2);
      expect(rows[2]).toHaveLength(3);
      // 列内 hash 取 columnMap 中该列首个插入的哈希
      expect(rows[0][0].hash).toBe('A');
      expect(rows[2][0].hash).toBe('A');
    });

    it('合并提交的第二父应分配新列', () => {
      const rows = calculateGraphRows([
        createCommit('M', ['P1', 'P2']),
        createCommit('P1'),
        createCommit('P2'),
      ]);

      expect(rows).toHaveLength(3);
      // 第一父复用当前列 0，第二父拿到新列 1
      expect(rows[0]).toEqual([
        col('M', 0, 'primary'),
        col('P2', 1, 'muted'),
      ]);
    });

    it('提交行应包含全部活跃列（列一旦分配不回收）', () => {
      const rows = calculateGraphRows([
        createCommit('A'),
        createCommit('B', ['A']),
        createCommit('M', ['B', 'C']),
        createCommit('C'),
      ]);

      // 列只增不减：A 行 1 列、B 行 2 列、M 行 4 列（含已分配给 C 的列）、C 行 4 列
      expect(rows[0]).toHaveLength(1);
      expect(rows[1]).toHaveLength(2);
      expect(rows[2]).toHaveLength(4);
      expect(rows[3]).toHaveLength(4);
    });
  });

  describe('generateRowGraphSVG', () => {
    it('最后一行应绘制到中点的垂直线与节点', () => {
      const commit = createCommit('A', ['B']);
      const rowColumns = [
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ];

      const svg = generateRowGraphSVG(commit, rowColumns, undefined, 0);

      expect(svg).toContain('<svg class="gm-graph-row" width="80" height="24" xmlns="http://www.w3.org/2000/svg">');
      expect(svg.endsWith('</svg>')).toBe(true);
      // 每列一条到中点（y=12）的垂直线
      expect(countLines(svg)).toBe(2);
      expect(svg).toContain('y2="12"');
      expect(svg).not.toContain('y2="24"');
      // 节点落在第 0 列
      expect(svg).toContain(`<circle class="gm-graph-node" cx="8" cy="12" r="4" fill="${TOKEN_0}"/>`);
      // 颜色走 --gm-* 变量，不得出现硬编码色值
      expectNoHardcodedHex(document.createElement('div'));
      expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });

    it('列延续到下一行时绘制全高垂直线', () => {
      const commit = createCommit('A', ['B']);
      const rowColumns = [
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ];
      const nextRowColumns = [
        col('X', 0, 'primary'),
        col('Y', 1, 'muted'),
      ];

      const svg = generateRowGraphSVG(commit, rowColumns, nextRowColumns, 0);

      expect(countLines(svg)).toBe(2);
      expect(svg).toContain(`<line class="gm-graph-line" x1="8" y1="0" x2="8" y2="24" stroke="${TOKEN_0}" stroke-width="2"/>`);
      expect(svg).toContain(`<line class="gm-graph-line" x1="24" y1="0" x2="24" y2="24" stroke="${TOKEN_1}" stroke-width="2"/>`);
      // 没有新开始的列
      expect(svg).not.toContain('y1="12" y2="24"');
    });

    it('列在下一行结束时绘制半高垂直线', () => {
      const commit = createCommit('A', ['B']);
      const rowColumns = [
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ];
      const nextRowColumns = [col('X', 0, 'primary')];

      const svg = generateRowGraphSVG(commit, rowColumns, nextRowColumns, 0);

      expect(countLines(svg)).toBe(2);
      // 列 0 延续到下一行
      expect(svg).toContain(`<line class="gm-graph-line" x1="8" y1="0" x2="8" y2="24" stroke="${TOKEN_0}" stroke-width="2"/>`);
      // 列 1 在本行中点结束
      expect(svg).toContain(`<line class="gm-graph-line" x1="24" y1="0" x2="24" y2="12" stroke="${TOKEN_1}" stroke-width="2"/>`);
    });

    it('下一行新出现的列应绘制从中点开始的线', () => {
      const commit = createCommit('A');
      const rowColumns = [col('A', 0, 'primary')];
      const nextRowColumns = [
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ];

      const svg = generateRowGraphSVG(commit, rowColumns, nextRowColumns, 0);

      expect(countLines(svg)).toBe(2);
      expect(svg).toContain(`<line class="gm-graph-line" x1="8" y1="0" x2="8" y2="24" stroke="${TOKEN_0}" stroke-width="2"/>`);
      expect(svg).toContain(`<line class="gm-graph-line" x1="24" y1="12" x2="24" y2="24" stroke="${TOKEN_1}" stroke-width="2"/>`);
    });

    it('合并提交应在两个父列之间绘制水平合并线（合并点用 warning 语义色）', () => {
      const commit = createCommit('M', ['P1', 'P2']);
      const rowColumns = [
        col('M', 2, 'border'),
        col('P1', 0, 'primary'),
        col('P2', 1, 'muted'),
      ];

      const svg = generateRowGraphSVG(commit, rowColumns, [...rowColumns], 0);

      // 三条延续的全高垂直线 + 一条水平合并线
      expect(countLines(svg)).toBe(4);
      expect(svg).toContain(`<line class="gm-graph-merge-line" x1="8" y1="12" x2="24" y2="12" stroke="${TOKEN_MERGE}" stroke-width="2"/>`);
      // 合并节点使用 warning 语义色
      expect(svg).toContain(`<circle class="gm-graph-node" cx="40" cy="12" r="4" fill="${TOKEN_MERGE}"/>`);
    });

    it('提交不在行内时节点应回退到第 0 列与默认 token', () => {
      const rowColumns = [col('A', 1, 'muted')];

      const svg = generateRowGraphSVG(createCommit('Z'), rowColumns, [...rowColumns], 0);

      expect(svg).toContain(`<circle class="gm-graph-node" cx="8" cy="12" r="4" fill="${TOKEN_0}"/>`);
    });
  });

  describe('变异体补充用例', () => {
    it('多父提交应按列号循环取满 6 个 token（第 2/3/4 token 不得为空）', () => {
      const parents = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      const rows = calculateGraphRows([createCommit('M', parents)]);

      expect(rows[0].map(c => c.color)).toEqual([
        'primary',
        'muted',
        'border',
        'subtle',
        'muted-surface',
        'elevated',
        'primary',
      ]);
    });

    it('父提交已有列时不应被重分配到子提交的列', () => {
      const rows = calculateGraphRows([
        createCommit('A'),
        createCommit('B', ['A']),
      ]);

      // A 已占第 0 列，B 占第 1 列，父分配逻辑不得覆盖 A 的既有列
      expect(rows[1]).toEqual([
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ]);
    });

    it('节点哈希被同列其他提交遮蔽时不应绘制水平合并线', () => {
      const a = createCommit('A');
      const b = createCommit('B', ['M', 'P1']);
      const m = createCommit('M', ['P1', 'P2']);
      const rows = calculateGraphRows([a, b, m]);

      // 第 1 列首个插入的是 B，M 被遮蔽，行内看不到 M 的哈希
      expect(rows[2].map(c => c.hash)).toEqual(['A', 'B', 'P1', 'P2']);

      const svg = generateRowGraphSVG(m, rows[2], [...rows[2]], 0);

      // 仅 4 条全高延续线，没有水平合并线
      expect(countLines(svg)).toBe(4);
      expect(svg).not.toContain('y1="12" y2="12"');
      // M 为合并提交（多父）→ 节点用 warning 语义色；节点定位回退到第 0 列
      expect(svg).toContain(`<circle class="gm-graph-node" cx="8" cy="12" r="4" fill="${TOKEN_MERGE}"/>`);
    });

    it('第一父与提交同列导致父列缺失时不应抛错也不画合并线', () => {
      const m = createCommit('M', ['P1', 'P2']);
      const rows = calculateGraphRows([m, createCommit('P1'), createCommit('P2')]);

      // P1 与 M 同占第 0 列，行内只能看到 M 与 P2
      expect(rows[0].map(c => c.hash)).toEqual(['M', 'P2']);

      const svg = generateRowGraphSVG(m, rows[0], [...rows[0]], 0);

      expect(countLines(svg)).toBe(2);
      expect(svg).not.toContain('y1="12" y2="12"');
    });

    it('水平合并线起点应按第一父列坐标绘制', () => {
      const a = createCommit('A');
      const b = createCommit('B', ['A']);
      const m = createCommit('M', ['B', 'A']);
      const rows = calculateGraphRows([a, b, m]);

      expect(rows[2].map(c => c.hash)).toEqual(['A', 'B', 'M']);

      const svg = generateRowGraphSVG(m, rows[2], [...rows[2]], 0);

      // 第一父 B 在第 1 列 → x1 = 8 + 1*16 = 24；第二父 A 在第 0 列 → x2 = 8
      expect(svg).toContain(`<line class="gm-graph-merge-line" x1="24" y1="12" x2="8" y2="12" stroke="${TOKEN_MERGE}" stroke-width="2"/>`);
      // 节点在第 2 列 → cx = 8 + 2*16 = 40，合并点用 warning 语义色
      expect(svg).toContain(`<circle class="gm-graph-node" cx="40" cy="12" r="4" fill="${TOKEN_MERGE}"/>`);
    });

    it('最后一行各列垂直线应按列坐标绘制', () => {
      const commit = createCommit('A', ['B']);
      const rowColumns = [
        col('A', 0, 'primary'),
        col('B', 1, 'muted'),
      ];

      const svg = generateRowGraphSVG(commit, rowColumns, undefined, 0);

      expect(svg).toContain(`<line class="gm-graph-line" x1="8" y1="0" x2="8" y2="12" stroke="${TOKEN_0}" stroke-width="2"/>`);
      expect(svg).toContain(`<line class="gm-graph-line" x1="24" y1="0" x2="24" y2="12" stroke="${TOKEN_1}" stroke-width="2"/>`);
    });
  });
});
