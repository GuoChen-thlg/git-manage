/**
 * @git-manage/core 集成测试
 * 参照 IntelliJ GitBranchWorkerTest 结构：
 *   beforeEach 创建临时仓库 fixture → 执行 core API → 断言
 *
 * fixture 场景（对应 IntelliJ setUp 多分支结构）：
 *   main: 初始提交 + 主分支提交
 *   feature/login: 基于 main 的 1 个独有提交
 *   plainDir: 非 git 目录（负向用例）
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isRepository,
  getRepositoryRoot,
  listBranches,
  getCurrentBranch,
  createBranch,
  deleteBranch,
  renameBranch,
  checkout,
  checkoutNew,
  merge,
  rebase,
  getBranchDiff,
  localBranchExists,
  isBranchMerged,
  deleteRemoteBranch,
  getBranchTip,
  getBranchUpstream,
  hasOtherLocalBranchTracking,
  setBranchUpstream,
  getCommitLog,
  getCommitDetail,
  getCommitFileDiffs,
  getCommitDiff,
  getStatus,
  add,
  commit,
  getWorkingDiff,
  listTrackedFiles,
  GitError,
} from '../index.js';

const execFileAsync = promisify(execFile);

/**
 * 直接执行 git 命令（仅用于 fixture 搭建与辅助断言，绕过 core 参数拆分）
 * @param args - git 参数数组
 * @param cwd - 工作目录
 * @returns stdout（去除首尾空白）
 */
async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout.trim();
}

/**
 * 读取指定引用的提交哈希
 * @param ref - 引用（分支名/HEAD）
 * @param cwd - 仓库目录
 * @returns 完整提交哈希
 */
async function hashOf(ref: string, cwd: string): Promise<string> {
  return git(['rev-parse', ref], cwd);
}

/** 测试用临时仓库目录 */
let repoDir: string;
/** 测试用非 git 目录 */
let plainDir: string;
/** 测试用裸仓库目录（远程删除用例的远程仓库） */
let bareDir: string;

/**
 * 创建仓库 fixture（参照 IntelliJ createRepository）
 * main 两个提交，feature/login 一个独有提交，最后回到 main
 */
async function createRepository(): Promise<void> {
  await git(['init', '-b', 'main'], repoDir);
  await git(['config', 'user.email', 'test@example.com'], repoDir);
  await git(['config', 'user.name', '测试用户'], repoDir);
  await git(['config', 'commit.gpgsign', 'false'], repoDir);

  // main: 初始提交
  writeFileSync(join(repoDir, 'README.md'), '# 测试仓库\n');
  await git(['add', '.'], repoDir);
  await git(['commit', '-m', '初始提交'], repoDir);

  // main: 第二个提交（修改 README）
  writeFileSync(join(repoDir, 'README.md'), '# 测试仓库\n主分支改动\n');
  await git(['commit', '-am', '主分支提交'], repoDir);

  // feature/login: 分支独有提交（新增文件）
  await git(['checkout', '-b', 'feature/login'], repoDir);
  writeFileSync(join(repoDir, 'login.ts'), 'export const login = () => undefined;\n');
  await git(['add', '.'], repoDir);
  await git(['commit', '-m', '功能提交'], repoDir);

  // 回到 main，保证 fixture 收尾状态稳定
  await git(['checkout', 'main'], repoDir);
}

beforeEach(async () => {
  repoDir = mkdtempSync(join(tmpdir(), 'git-manage-repo-'));
  plainDir = mkdtempSync(join(tmpdir(), 'git-manage-plain-'));
  bareDir = mkdtempSync(join(tmpdir(), 'git-manage-bare-'));
  await createRepository();
});

afterEach(() => {
  rmSync(repoDir, { recursive: true, force: true });
  rmSync(plainDir, { recursive: true, force: true });
  rmSync(bareDir, { recursive: true, force: true });
});

/** 仓库探测 */
describe('仓库探测', () => {
  it('isRepository 应识别 git 仓库', async () => {
    expect(await isRepository(repoDir)).toBe(true);
  });

  it('isRepository 对非 git 目录应返回 false', async () => {
    expect(await isRepository(plainDir)).toBe(false);
  });

  it('getRepositoryRoot 应从子目录解析仓库根', async () => {
    const sub = join(repoDir, 'src', 'nested');
    mkdirSync(sub, { recursive: true });
    const root = await getRepositoryRoot(sub);
    // macOS 临时目录存在 /var → /private/var 符号链接，统一按真实路径比较
    expect(root).toBe(realpathSync(repoDir));
  });
});

/** 分支管理 */
describe('分支管理', () => {
  it('listBranches 应包含本地分支并标记当前分支', async () => {
    const branches = await listBranches({ cwd: repoDir });
    const names = branches.map(b => b.name);
    expect(names).toContain('main');
    expect(names).toContain('feature/login');

    const main = branches.find(b => b.name === 'main');
    expect(main?.isCurrent).toBe(true);
    expect(main?.isRemote).toBe(false);

    const feature = branches.find(b => b.name === 'feature/login');
    expect(feature?.isCurrent).toBe(false);
    // fixture 无远程，全部非远程分支
    expect(branches.every(b => !b.isRemote)).toBe(true);
  });

  it('getCurrentBranch 应返回当前分支', async () => {
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('main');
  });

  it('createBranch 应创建分支且不切换', async () => {
    await createBranch('hotfix', { cwd: repoDir });
    const branches = await listBranches({ cwd: repoDir });
    expect(branches.map(b => b.name)).toContain('hotfix');
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('main');
  });

  it('checkout 应切换分支', async () => {
    await checkout('feature/login', { cwd: repoDir });
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('feature/login');
  });

  it('checkoutNew 应创建并切换到新分支', async () => {
    await checkoutNew('experiment', { cwd: repoDir });
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('experiment');
  });

  it('checkoutNew 带起点时应从该起点创建并切换', async () => {
    await checkoutNew('from-login', { cwd: repoDir }, 'feature/login');
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('from-login');
    // 新分支应与起点分支指向同一提交
    const branches = await listBranches({ cwd: repoDir });
    expect(branches.find(b => b.name === 'from-login')?.commit)
      .toBe(branches.find(b => b.name === 'feature/login')?.commit);
  });

  it('renameBranch 应重命名分支', async () => {
    await renameBranch('main', 'main-renamed', { cwd: repoDir });
    const names = (await listBranches({ cwd: repoDir })).map(b => b.name);
    expect(names).toContain('main-renamed');
    expect(names).not.toContain('main');
  });

  it('deleteBranch 应删除非当前分支，删除当前分支应抛 GitError', async () => {
    await createBranch('temp-branch', { cwd: repoDir });
    await deleteBranch('temp-branch', { cwd: repoDir });
    const names = (await listBranches({ cwd: repoDir })).map(b => b.name);
    expect(names).not.toContain('temp-branch');

    // 当前分支不允许删除
    await expect(deleteBranch('main', { cwd: repoDir })).rejects.toThrow(GitError);
  });

  it('merge 应将 feature 快进合并到 main', async () => {
    const featureTip = await hashOf('feature/login', repoDir);
    await merge('feature/login', { cwd: repoDir });
    expect(await hashOf('HEAD', repoDir)).toBe(featureTip);
  });

  it('rebase 应把 topic 提交重放到 feature/login 之上', async () => {
    // setup：从 main 建 topic 并产生一个独有提交
    await git(['checkout', '-b', 'topic'], repoDir);
    writeFileSync(join(repoDir, 'topic.txt'), 'topic\n');
    await add(['topic.txt'], { cwd: repoDir });
    await commit('topic提交', { cwd: repoDir });

    // execute：变基到 feature/login
    const featureTip = await hashOf('feature/login', repoDir);
    await rebase('feature/login', { cwd: repoDir });

    // assert：topic 提交位于 feature 独有提交之上
    const log = await getCommitLog(repoDir, 50, 'topic');
    expect(log.map(c => c.message)).toEqual(['topic提交', '功能提交', '主分支提交', '初始提交']);
    expect(log[1].hash).toBe(featureTip);
  });

  it('getBranchDiff 应返回分支间差异文件', async () => {
    const files = await getBranchDiff('feature/login', 'main', { cwd: repoDir });
    expect(files).toEqual(['login.ts']);
  });
});

/** 删除分支链路：合并预检、强制删除、远程删除与存在性精确判定 */
describe('删除分支链路', () => {
  it('isBranchMerged 应区分已合并与未合并分支，分支不存在应抛错', async () => {
    // fixture:done 指向 main（已合并）；feature/login 有独有提交未合并进 main
    await git(['branch', 'done', 'main'], repoDir);

    expect(await isBranchMerged('done', { cwd: repoDir })).toBe(true);
    expect(await isBranchMerged('feature/login', { cwd: repoDir })).toBe(false);
    await expect(isBranchMerged('not-exist-branch', { cwd: repoDir })).rejects.toThrow(GitError);
  });

  it('deleteBranch 非强制应对未合并分支抛错，force=true 应强删成功', async () => {
    // 未合并分支 -d 失败
    await expect(deleteBranch('feature/login', { cwd: repoDir })).rejects.toThrow(GitError);

    // -D 跳过合并预检删除成功
    await deleteBranch('feature/login', { cwd: repoDir }, true);
    const names = (await listBranches({ cwd: repoDir })).map((b) => b.name);
    expect(names).not.toContain('feature/login');
  });

  it('localBranchExists 应精确判定本地分支并防 glob 模式误匹配', async () => {
    expect(await localBranchExists('main', { cwd: repoDir })).toBe(true);
    expect(await localBranchExists('feature/login', { cwd: repoDir })).toBe(true);
    // feat* 含 glob 字符：git branch --list 会把它当模式命中 feature/login，
    // 精确比对实现必须返回 false
    expect(await localBranchExists('feat*', { cwd: repoDir })).toBe(false);
    expect(await localBranchExists('not-exist-branch', { cwd: repoDir })).toBe(false);
  });

  it('deleteRemoteBranch 应从远程仓库删除指定分支', async () => {
    // fixture:裸仓库作为远程，推送 main 与 feature/login 两个分支
    await git(['init', '--bare', '-b', 'main', bareDir], repoDir);
    await git(['remote', 'add', 'origin', bareDir], repoDir);
    await git(['push', '-u', 'origin', 'main'], repoDir);
    await git(['push', 'origin', 'feature/login'], repoDir);

    const before = await git(['ls-remote', '--heads', 'origin'], repoDir);
    expect(before).toContain('refs/heads/feature/login');
    expect(before).toContain('refs/heads/main');

    // execute:删除远程 feature/login
    await deleteRemoteBranch('origin', 'feature/login', { cwd: repoDir });

    // assert:远程不再有该分支，main 保留
    const after = await git(['ls-remote', '--heads', 'origin'], repoDir);
    expect(after).not.toContain('refs/heads/feature/login');
    expect(after).toContain('refs/heads/main');
  });
});

/** 分支还原数据捕获：tip / upstream / 跟踪占用判定，还原与上游设置 */
describe('分支还原数据捕获', () => {
  it('createBranch 带 startPoint 应从指定提交建分支且 HEAD 不动', async () => {
    // fixture：main~1 为初始提交（旧提交）
    const firstCommit = await hashOf('main~1', repoDir);

    // execute：以旧提交 sha 为起点创建分支
    await createBranch('restore-point', { cwd: repoDir }, firstCommit);

    // assert：HEAD 仍在 main，新分支 tip 等于指定起点
    expect(await getCurrentBranch({ cwd: repoDir })).toBe('main');
    expect(await hashOf('restore-point', repoDir)).toBe(firstCommit);
    expect(await hashOf('main', repoDir)).not.toBe(firstCommit);
  });

  it('getBranchTip 应返回引用指向的提交哈希，引用不存在应抛错', async () => {
    const head = await hashOf('HEAD', repoDir);

    expect(await getBranchTip('refs/heads/main', { cwd: repoDir })).toBe(head);

    // 引用不存在时按执行失败抛错（与现有 GitError 错误风格一致）
    await expect(getBranchTip('refs/heads/not-exist-branch', { cwd: repoDir })).rejects.toThrow(GitError);
  });

  it('getBranchUpstream 未配置上游应返回 null', async () => {
    // fixture：仓库无远程，两个分支均未配置上游
    expect(await getBranchUpstream('main', { cwd: repoDir })).toBeNull();
    expect(await getBranchUpstream('feature/login', { cwd: repoDir })).toBeNull();
  });

  it('getBranchUpstream 配置上游后应返回 remote 与 branch（分支名含 / 按首个 / 切分）', async () => {
    // fixture：裸仓库作为远程，push -u 建立 main 与 feature/login 的上游
    await git(['init', '--bare', '-b', 'main', bareDir], repoDir);
    await git(['remote', 'add', 'origin', bareDir], repoDir);
    await git(['push', '-u', 'origin', 'main'], repoDir);
    await git(['push', '-u', 'origin', 'feature/login'], repoDir);

    expect(await getBranchUpstream('main', { cwd: repoDir })).toEqual({ remote: 'origin', branch: 'main' });
    // 远程分支名含 /：remote 取首段，剩余部分整体为 branch
    expect(await getBranchUpstream('feature/login', { cwd: repoDir })).toEqual({
      remote: 'origin',
      branch: 'feature/login',
    });
  });

  it('hasOtherLocalBranchTracking 应排除自身后判定其他分支是否跟踪同一上游', async () => {
    // fixture：裸仓库作为远程，仅 main 通过 push -u 跟踪 origin/main
    await git(['init', '--bare', '-b', 'main', bareDir], repoDir);
    await git(['remote', 'add', 'origin', bareDir], repoDir);
    await git(['push', '-u', 'origin', 'main'], repoDir);

    // 仅 main 自身跟踪 origin/main：排除自身后应为 false
    expect(await hasOtherLocalBranchTracking('main', 'origin/main', { cwd: repoDir })).toBe(false);

    // 新建 main-copy 并跟踪同一上游：存在其他跟踪分支
    await git(['branch', 'main-copy', 'main'], repoDir);
    await git(['branch', '--set-upstream-to=origin/main', 'main-copy'], repoDir);
    expect(await hasOtherLocalBranchTracking('main', 'origin/main', { cwd: repoDir })).toBe(true);
    expect(await hasOtherLocalBranchTracking('main-copy', 'origin/main', { cwd: repoDir })).toBe(true);

    // 无任何分支跟踪的上游应为 false
    expect(await hasOtherLocalBranchTracking('feature/login', 'origin/nothing', { cwd: repoDir })).toBe(false);
  });

  it('setBranchUpstream 应建立上游跟踪并可被 getBranchUpstream 读回', async () => {
    // fixture：裸仓库作为远程，push 不带 -u（不自动建立上游）
    await git(['init', '--bare', '-b', 'main', bareDir], repoDir);
    await git(['remote', 'add', 'origin', bareDir], repoDir);
    await git(['push', 'origin', 'main'], repoDir);
    expect(await getBranchUpstream('main', { cwd: repoDir })).toBeNull();

    // execute：显式设置 upstream（origin/main 形式）
    await setBranchUpstream('main', 'origin/main', { cwd: repoDir });

    // assert：读回上游信息
    expect(await getBranchUpstream('main', { cwd: repoDir })).toEqual({ remote: 'origin', branch: 'main' });
  });
});

/** 提交历史与分支过滤（回归：点击分支列表应只显示该分支提交） */
describe('提交历史', () => {
  it('getCommitLog 应按时间倒序返回提交', async () => {
    const log = await getCommitLog(repoDir);
    expect(log.map(c => c.message)).toEqual(['主分支提交', '初始提交']);
    expect(log[0].shortHash).toHaveLength(7);
    expect(log[0].authorName).toBe('测试用户');
    expect(log[0].parents).toHaveLength(1);
  });

  it('getCommitLog 应支持 limit 限制数量', async () => {
    const log = await getCommitLog(repoDir, 1);
    expect(log).toHaveLength(1);
    expect(log[0].message).toBe('主分支提交');
  });

  it('getCommitLog 按分支过滤应只返回该分支提交（回归用例）', async () => {
    const featureLog = await getCommitLog(repoDir, 50, 'feature/login');
    expect(featureLog).toHaveLength(3);
    expect(featureLog.map(c => c.message)).toContain('功能提交');

    const mainLog = await getCommitLog(repoDir, 50, 'main');
    expect(mainLog).toHaveLength(2);
    expect(mainLog.map(c => c.message)).not.toContain('功能提交');
  });

  it('getCommitLog 对不存在的分支应返回空列表', async () => {
    const log = await getCommitLog(repoDir, 50, 'not-exist-branch');
    expect(log).toEqual([]);
  });

  it('getCommitLog 按路径过滤应只返回触碰该路径的提交', async () => {
    // fixture：src/ 与 docs/ 各产生一个独立提交
    mkdirSync(join(repoDir, 'src'), { recursive: true });
    writeFileSync(join(repoDir, 'src', 'app.ts'), 'export const app = () => undefined;\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', 'src 提交'], repoDir);

    mkdirSync(join(repoDir, 'docs'), { recursive: true });
    writeFileSync(join(repoDir, 'docs', 'guide.md'), '# 使用指南\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', 'docs 提交'], repoDir);

    // execute：仅按路径过滤（不带分支）
    const srcLog = await getCommitLog(repoDir, 50, undefined, 'src');
    const docsLog = await getCommitLog(repoDir, 50, undefined, 'docs');

    // assert：各自只含触碰对应目录的提交
    expect(srcLog.map(c => c.message)).toEqual(['src 提交']);
    expect(docsLog.map(c => c.message)).toEqual(['docs 提交']);

    // 不带路径过滤时应包含全部 4 个提交
    const allLog = await getCommitLog(repoDir);
    expect(allLog).toHaveLength(4);
  });

  it('getCommitLog 分支与路径过滤应取交集（回归：分支不能被当作路径）', async () => {
    // fixture：main 上只提交 docs/，新分支上只提交 src/
    mkdirSync(join(repoDir, 'docs'), { recursive: true });
    writeFileSync(join(repoDir, 'docs', 'guide.md'), '# 使用指南\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', 'main docs 提交'], repoDir);

    await git(['checkout', '-b', 'feature-path'], repoDir);
    mkdirSync(join(repoDir, 'src'), { recursive: true });
    writeFileSync(join(repoDir, 'src', 'app.ts'), 'export const app = () => undefined;\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', '分支 src 提交'], repoDir);

    // execute：分支 + 路径组合过滤
    const branchSrcLog = await getCommitLog(repoDir, 50, 'feature-path', 'src');
    const branchDocsLog = await getCommitLog(repoDir, 50, 'feature-path', 'docs');
    const mainSrcLog = await getCommitLog(repoDir, 50, 'main', 'src');
    const mainDocsLog = await getCommitLog(repoDir, 50, 'main', 'docs');
    const branchAllLog = await getCommitLog(repoDir, 50, 'feature-path');

    // assert：branch 未被当路径解释——分支+路径结果非空且为正确交集
    expect(branchSrcLog.map(c => c.message)).toEqual(['分支 src 提交']);
    // 分支可达且触碰 docs 的提交（交集含祖先上的 docs 提交）
    expect(branchDocsLog.map(c => c.message)).toEqual(['main docs 提交']);
    // main 从未触碰 src → 空
    expect(mainSrcLog).toEqual([]);
    // main 上触碰 docs 的提交
    expect(mainDocsLog.map(c => c.message)).toEqual(['main docs 提交']);
    // 不带路径过滤时分支包含两个独有/祖先提交
    expect(branchAllLog.map(c => c.message)).toEqual([
      '分支 src 提交',
      'main docs 提交',
      '主分支提交',
      '初始提交',
    ]);
  });

  it('getCommitLog 应支持含空格的路径过滤', async () => {
    // fixture：目录名 "with space" 内产生一个提交
    mkdirSync(join(repoDir, 'with space'), { recursive: true });
    writeFileSync(join(repoDir, 'with space', 'note.txt'), '空格目录内容\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', '空格目录提交'], repoDir);

    // execute：路径含空格，参数数组形式应保留完整路径
    const log = await getCommitLog(repoDir, 50, undefined, 'with space');

    // assert：命中空格目录内的提交
    expect(log.map(c => c.message)).toEqual(['空格目录提交']);
    expect(log).toHaveLength(1);
  });

  it('getCommitLog 多路径过滤应返回任一路径命中的提交（并集）', async () => {
    // fixture：src/ 与 docs/ 各产生一个独立提交
    mkdirSync(join(repoDir, 'src'), { recursive: true });
    writeFileSync(join(repoDir, 'src', 'app.ts'), 'export const app = () => undefined;\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', 'src 提交'], repoDir);

    mkdirSync(join(repoDir, 'docs'), { recursive: true });
    writeFileSync(join(repoDir, 'docs', 'guide.md'), '# 使用指南\n');
    await git(['add', '.'], repoDir);
    await git(['commit', '-m', 'docs 提交'], repoDir);

    // execute：多选路径（pathspec 数组）
    const unionLog = await getCommitLog(repoDir, 50, undefined, ['src', 'docs']);

    // assert：并集语义——命中任一路径的提交均返回（基础两个提交只碰 README，不应出现）
    expect(unionLog.map(c => c.message)).toEqual(['docs 提交', 'src 提交']);

    // 单元素数组与字符串等价
    const singleArrayLog = await getCommitLog(repoDir, 50, undefined, ['src']);
    const singleStringLog = await getCommitLog(repoDir, 50, undefined, 'src');
    expect(singleArrayLog.map(c => c.message)).toEqual(['src 提交']);
    expect(singleArrayLog.map(c => c.message)).toEqual(singleStringLog.map(c => c.message));

    // 空数组（或过滤空串后无剩余）应跳过路径过滤，返回全部提交
    const emptyArrayLog = await getCommitLog(repoDir, 50, undefined, []);
    expect(emptyArrayLog).toHaveLength(4);
    const blankArrayLog = await getCommitLog(repoDir, 50, undefined, ['']);
    expect(blankArrayLog).toHaveLength(4);
  });

  it('getCommitDetail 应返回提交详情与差异', async () => {
    const mainTip = await hashOf('main', repoDir);
    const parent = await hashOf('main~1', repoDir);
    const detail = await getCommitDetail(repoDir, mainTip);
    expect(detail).not.toBeNull();
    expect(detail?.message).toBe('主分支提交');
    expect(detail?.parents).toEqual([parent]);
    expect(detail?.diffs.map(d => d.path)).toContain('README.md');
  });

  it('getCommitDetail 对无效哈希应返回 null', async () => {
    const detail = await getCommitDetail(repoDir, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    expect(detail).toBeNull();
  });

  it('getCommitFileDiffs 应返回提交变更文件', async () => {
    const featureTip = await hashOf('feature/login', repoDir);
    const diffs = await getCommitFileDiffs(repoDir, featureTip);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].path).toBe('login.ts');
    expect(diffs[0].additions).toBe(1);
    expect(diffs[0].deletions).toBe(0);
  });
});

/** 工作区状态与提交流转 */
describe('状态与提交', () => {
  it('干净工作区应无变更', async () => {
    const status = await getStatus({ cwd: repoDir });
    expect(status.currentBranch).toBe('main');
    expect(status.hasChanges).toBe(false);
    expect(status.changes).toEqual([]);
  });

  it('修改文件后应识别为未暂存变更', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# 改动了\n');
    const status = await getStatus({ cwd: repoDir });
    expect(status.hasChanges).toBe(true);
    expect(status.hasUnstagedChanges).toBe(true);
    expect(status.changes[0]).toMatchObject({ path: 'README.md', status: 'modified', staged: false });
  });

  it('add 后应识别为已暂存变更', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# 改动了\n');
    await add(['README.md'], { cwd: repoDir });
    const status = await getStatus({ cwd: repoDir });
    expect(status.hasStagedChanges).toBe(true);
    expect(status.hasUnstagedChanges).toBe(false);
    expect(status.changes[0].staged).toBe(true);
  });

  it('commit 后应清空状态并记录提交信息（含空格消息）', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# 改动了\n');
    await add(['README.md'], { cwd: repoDir });
    await commit('更新README 修复问题', { cwd: repoDir });

    const status = await getStatus({ cwd: repoDir });
    expect(status.hasChanges).toBe(false);

    const log = await getCommitLog(repoDir, 1);
    // 提交信息不应带入实现层拼接的引号
    expect(log[0].message).toBe('更新README 修复问题');
  });

  it('未跟踪新文件应计入变更', async () => {
    writeFileSync(join(repoDir, 'new.txt'), 'new\n');
    const status = await getStatus({ cwd: repoDir });
    expect(status.hasChanges).toBe(true);
    expect(status.changes[0].path).toBe('new.txt');
    expect(status.changes[0].staged).toBe(false);
    // 现状记录：git status --porcelain 下未跟踪文件不计入 hasUnstagedChanges
    expect(status.hasUnstagedChanges).toBe(false);
  });
});

/** 仓库已跟踪文件列表（IDEA 风格路径多选数据源） */
describe('文件列表', () => {
  it('listTrackedFiles 应返回已跟踪文件且不含未跟踪文件', async () => {
    // fixture：新增一个已暂存文件 + 一个未跟踪文件
    writeFileSync(join(repoDir, 'staged.txt'), '已暂存内容\n');
    await add(['staged.txt'], { cwd: repoDir });
    writeFileSync(join(repoDir, 'untracked.txt'), '未跟踪内容\n');

    // execute
    const files = await listTrackedFiles(repoDir);

    // assert：已跟踪文件（含基础提交与新暂存文件）在列，未跟踪文件不在列
    expect(files).toContain('README.md');
    expect(files).toContain('staged.txt');
    expect(files).not.toContain('untracked.txt');
  });
});

/** 差异比较 */
describe('差异比较', () => {
  it('getWorkingDiff 应返回工作区差异', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# 改动了\n多了一行\n');
    const diffs = await getWorkingDiff({ cwd: repoDir });
    expect(diffs.map(d => d.path)).toContain('README.md');
    const readme = diffs.find(d => d.path === 'README.md');
    expect((readme?.additions ?? 0) + (readme?.deletions ?? 0)).toBeGreaterThan(0);
  });

  it('getCommitDiff 以空 to 应比较提交与工作区差异', async () => {
    // fixture：记录最后一次提交的哈希，再修改工作区同一文件（不暂存）
    const lastHash = await hashOf('HEAD', repoDir);
    writeFileSync(join(repoDir, 'README.md'), '# 测试仓库\n工作区新改动\n');

    // execute：to 传空串，语义等价 git diff <hash>（提交 → 当前工作区）
    const diffs = await getCommitDiff(lastHash, '', { cwd: repoDir });

    // assert：返回包含被改动的文件，且差异行反映工作区改动
    expect(diffs.map(d => d.path)).toContain('README.md');
    const readme = diffs.find(d => d.path === 'README.md');
    expect(readme).toBeDefined();
    expect(readme!.lines.some(l => l.type === 'add' && l.content.includes('工作区新改动'))).toBe(true);
    expect(readme!.lines.some(l => l.type === 'delete' && l.content.includes('主分支改动'))).toBe(true);
    expect((readme?.additions ?? 0) + (readme?.deletions ?? 0)).toBeGreaterThan(0);
  });
});
