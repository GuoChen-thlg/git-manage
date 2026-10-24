#!/usr/bin/env node
/**
 * 扩展打包脚本
 * 把运行时必需的文件（package.json + dist/）收集成 zip，供宿主「从 ZIP 安装」使用。
 *
 * 用法：node scripts/pack.mjs [输出目录]
 * 产物：<输出目录>/git-manager-<version>.zip（默认输出目录为 packages/openchamber/release）
 *
 * 说明：
 * - 宿主安装 zip 时不会执行构建，只校验 manifest 引用的 HTML 与脚本是否存在，因此必须打包构建产物
 * - zip 仅包含运行时文件，不含源码、测试与 node_modules
 */

import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_JSON = path.join(PKG_ROOT, 'package.json');

/**
 * 计算 CRC32（zip 本地文件头与中央目录都要用）
 * @param {Buffer} buf 数据
 * @returns {number} CRC32 值
 */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/**
 * 把 Date 转成 zip 的 DOS 时间格式
 * @param {Date} date 时间
 * @returns {{ time: number, date: number }} DOS 时间与日期
 */
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: d };
}

/**
 * 递归收集目录下的文件（返回相对路径与绝对路径）
 * @param {string} dir 起始目录
 * @param {string} base 用于计算相对路径的基准目录
 * @returns {Promise<Array<{ rel: string, abs: string }>>} 文件列表
 */
async function walk(dir, base = dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(abs, base));
    } else if (entry.isFile()) {
      out.push({ rel: path.relative(base, abs).split(path.sep).join('/'), abs });
    }
  }
  return out;
}

/**
 * 生成 zip 文件
 * @param {Array<{ rel: string, abs: string }>} files 待打包文件（rel 为 zip 内路径）
 * @param {string} zipPath 输出 zip 路径
 */
async function writeZip(files, zipPath) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const data = await fs.readFile(file.abs);
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const nameBuf = Buffer.from(file.rel, 'utf8');
    const crc = crc32(data);
    const { time, date } = dosDateTime(new Date());

    // 本地文件头
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0x0800, 6);      // flags: UTF-8 文件名
    local.writeUInt16LE(8, 8);           // 压缩方式 deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, compressed);

    // 中央目录项
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);             // version made by
    cd.writeUInt16LE(20, 6);             // version needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);             // extra len
    cd.writeUInt16LE(0, 32);             // comment len
    cd.writeUInt16LE(0, 34);             // disk number
    cd.writeUInt16LE(0, 36);             // internal attrs
    cd.writeUInt32LE(0o644 << 16, 38);   // external attrs
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await new Promise((resolve, reject) => {
    const ws = createWriteStream(zipPath);
    ws.on('error', reject);
    ws.on('finish', resolve);
    for (const chunk of [...chunks, centralBuf, end]) ws.write(chunk);
    ws.end();
  });
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(PKG_JSON, 'utf8'));
  const version = pkg.version;
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(PKG_ROOT, 'release');
  const zipPath = path.join(outDir, `git-manager-${version}.zip`);

  // 发布门禁：仅允许在主分支打包。CI 用 CI=true 且已单独校验来源，这里只拦本地误操作
  const MAIN_BRANCH = 'dev';
  if (!process.env.CI) {
    let branch = '';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PKG_ROOT, encoding: 'utf8' }).trim();
    } catch {
      console.error('[pack] 无法读取当前分支，已中止');
      process.exit(1);
    }
    if (branch !== MAIN_BRANCH) {
      console.error(`[pack] 发布仅允许在 ${MAIN_BRANCH} 分支执行，当前分支：${branch}`);
      console.error('[pack] 请先合并到主分支后再打包发布');
      process.exit(1);
    }
  }

  // 打包前必须已有构建产物，否则宿主会以 missing-build 拒绝安装
  const distDir = path.join(PKG_ROOT, 'dist');
  try {
    await fs.access(distDir);
  } catch {
    console.error('[pack] 缺少 dist 目录，请先运行 npm run build');
    process.exit(1);
  }

  // 校验 manifest 引用的入口确实存在
  const panelEntry = pkg.openchamber?.contributes?.panel?.entry;
  const serviceEntry = pkg.openchamber?.contributes?.service?.entry;
  for (const entry of [panelEntry, serviceEntry].filter(Boolean)) {
    try {
      await fs.access(path.join(PKG_ROOT, entry));
    } catch {
      console.error(`[pack] manifest 引用的入口不存在: ${entry}，请先运行 npm run build`);
      process.exit(1);
    }
  }

  const distFiles = await walk(distDir).then(list =>
    list.map(f => ({ rel: `dist/${f.rel}`, abs: f.abs })));
  const files = [{ rel: 'package.json', abs: PKG_JSON }, ...distFiles];

  await writeZip(files, zipPath);

  const stat = await fs.stat(zipPath);
  console.log(`[pack] 已生成 ${path.relative(process.cwd(), zipPath)}`);
  console.log(`[pack] 文件数 ${files.length}，大小 ${(stat.size / 1024).toFixed(1)} KB`);
  console.log('[pack] 安装方式：OpenChamber 设置 → 扩展 → 从 ZIP 安装');
}

main().catch((e) => {
  console.error('[pack] 打包失败:', e);
  process.exit(1);
});
