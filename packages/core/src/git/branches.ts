import { gitExec, gitExecStrict } from './executor.js';
import { GitError, type GitCommandOptions, type Branch } from './types.js';

/**
 * 判断分支简称是否为远程符号引用（如 refs/remotes/origin/HEAD 会显示为裸的 "origin"）
 * 通过远程 HEAD 的简称集合精确判定，避免误伤同名本地分支
 * @param name 分支简称
 * @param headAliases 远程 HEAD 简称集合
 * @returns 是远程符号引用返回 true
 */
function isRemoteHeadAlias(name: string, headAliases: Set<string>): boolean {
  return headAliases.has(name);
}

/**
 * 获取所有分支列表
 * @param options - Git 命令选项
 * @returns 分支列表
 */
export async function listBranches(options: GitCommandOptions): Promise<Branch[]> {
  const result = await gitExecStrict('branch -a --format=%(refname:short)|%(objectname:short)|%(subject)', options);
  
  // 获取当前分支名称
  const currentBranch = await getCurrentBranch(options);
  
  const branches: Branch[] = [];
  const seen = new Set<string>();

  // 远程 HEAD 简称集合：refs/remotes/origin/HEAD → "origin"
  const headAliases = new Set<string>();
  const remotesResult = await gitExec(
    ['for-each-ref', '--format=%(refname:short)', 'refs/remotes'],
    options
  ).catch(() => null);
  for (const ref of (remotesResult?.stdout ?? '').split('\n')) {
    const trimmed = ref.trim();
    // 形如 "origin" 的裸远程名即 origin/HEAD 的简称
    if (trimmed && !trimmed.includes('/')) headAliases.add(trimmed);
  }

  // 解析 git branch 输出
  if (result.stdout) {
    // 获取未推送分支信息
    const unpushedMap = await getUnpushedBranches(options);
    const unpulledMap = await getUnpulledBranches(options);
    
    for (const line of result.stdout.split('\n')) {
      if (!line.trim()) continue;

      const [name, commit, message] = line.split('|');
      if (!name) continue;
      // 跳过远程符号引用：git 会把 refs/remotes/<remote>/HEAD 简称为裸的 <remote>
      // （例如 "origin"），它不是真实分支，显示出来会误导
      if (isRemoteHeadAlias(name, headAliases)) continue;

      const isCurrent = name === currentBranch;
      const isRemote = name.startsWith('origin/');
      const remote = isRemote ? name.split('/')[0] : undefined;
      
      // 获取未推送信息
      const unpushedInfo = unpushedMap.get(name);
      const unpulledInfo = unpulledMap.get(name);

      branches.push({
        name,
        isCurrent,
        isRemote,
        remote,
        commit,
        message,
        hasUnpushed: unpushedInfo?.hasUnpushed ?? false,
        unpushedCount: unpushedInfo?.unpushedCount ?? 0,
        hasUnpulled: unpulledInfo?.hasUnpulled ?? false,
        unpulledCount: unpulledInfo?.unpulledCount ?? 0,
      });
      seen.add(name);
    }
  }

  // 处理没有提交的分支（orphan branch）
  // 当分支没有任何提交时，git branch 不会显示它，但 HEAD 可能指向它
  if (currentBranch && !seen.has(currentBranch) && !currentBranch.startsWith('HEAD')) {
    // 从 HEAD 文件读取分支信息
    const headContent = await gitExec('symbolic-ref HEAD', options);
    if (headContent.stdout) {
      branches.unshift({
        name: currentBranch,
        isCurrent: true,
        isRemote: false,
        commit: undefined,
        message: undefined,
        hasUnpushed: false,
        unpushedCount: 0,
      });
    }
  }

  return branches;
}

/**
 * 获取未推送分支信息
 * @param options - Git 命令选项
 * @returns 未推送分支映射
 */
async function getUnpushedBranches(options: GitCommandOptions): Promise<Map<string, { hasUnpushed: boolean; unpushedCount: number }>> {
  const map = new Map<string, { hasUnpushed: boolean; unpushedCount: number }>();
  
  try {
    // 使用 git log 检查每个本地分支的未推送提交
    const result = await gitExec('branch --format=%(refname:short)', options);
    if (!result.stdout) return map;
    
    const localBranches = result.stdout.split('\n').filter(b => b && !b.startsWith('origin/'));
    
    for (const branch of localBranches) {
      try {
        // 检查本地分支相对于远程分支的提交数
        const unpushedResult = await gitExec(
          `log --oneline origin/${branch}..${branch} 2>/dev/null | wc -l | tr -d ' '`,
          options
        );
        
        const count = parseInt(unpushedResult.stdout || '0', 10);
        if (count > 0) {
          map.set(branch, { hasUnpushed: true, unpushedCount: count });
        }
      } catch {
        // 远程分支不存在，跳过
      }
    }
  } catch {
    // 忽略错误
  }
  
  return map;
}

/**
 * 获取未拉取的远程提交数（Incoming）
 * @param options - Git 命令选项
 * @returns 未拉取分支数量
 */
async function getUnpulledBranches(options: GitCommandOptions): Promise<Map<string, { hasUnpulled: boolean; unpulledCount: number }>> {
  const map = new Map<string, { hasUnpulled: boolean; unpulledCount: number }>();
  
  try {
    const result = await gitExec('branch --format=%(refname:short)', options);
    if (!result.stdout) return map;
    
    const localBranches = result.stdout.split('\n').filter(b => b && !b.startsWith('origin/'));
    
    for (const branch of localBranches) {
      try {
        // 检查远程分支相对于本地分支的提交数（未拉取的）
        const unpulledResult = await gitExec(
          `log --oneline ${branch}..origin/${branch} 2>/dev/null | wc -l | tr -d ' '`,
          options
        );
        
        const count = parseInt(unpulledResult.stdout || '0', 10);
        if (count > 0) {
          map.set(branch, { hasUnpulled: true, unpulledCount: count });
        }
      } catch {
        // 远程分支不存在，跳过
      }
    }
  } catch {
    // 忽略错误
  }
  
  return map;
}

/**
 * 获取当前分支名称
 * @param options - Git 命令选项
 * @returns 当前分支名称
 */
export async function getCurrentBranch(options: GitCommandOptions): Promise<string> {
  const result = await gitExecStrict('branch --show-current', options);
  return result.stdout || 'HEAD';
}

/**
 * 创建新分支
 * @param name - 分支名称
 * @param options - Git 命令选项
 * @param startPoint - 起点引用（如提交 sha），指定后从该起点创建；
 *   省略时行为不变（基于当前 HEAD）
 */
export async function createBranch(
  name: string,
  options: GitCommandOptions,
  startPoint?: string
): Promise<void> {
  const args = startPoint ? ['branch', name, startPoint] : ['branch', name];
  await gitExecStrict(args, options);
}

/**
 * 删除分支
 * @param name - 分支名称
 * @param options - Git 命令选项
 * @param force - 是否强制删除
 */
export async function deleteBranch(name: string, options: GitCommandOptions, force = false): Promise<void> {
  const flag = force ? '-D' : '-d';
  await gitExecStrict(`branch ${flag} ${name}`, options);
}

/**
 * 判断本地分支是否精确存在（防 glob 模式误匹配）
 *
 * git branch --list <pattern> 会把参数当 glob 模式匹配（如 feat* 会命中
 * feature/login），因此这里不向 --list 传分支名，而是列出全部本地分支后
 * 做精确相等比对
 * @param name - 分支名称
 * @param options - Git 命令选项
 * @returns 是否存在同名本地分支
 */
export async function localBranchExists(name: string, options: GitCommandOptions): Promise<boolean> {
  const result = await gitExecStrict(['branch', '--list', '--format=%(refname:short)'], options);
  return result.stdout.split('\n').some((line) => line === name);
}

/**
 * 判断分支是否已合并到 HEAD（merge-base 祖先判定）
 * @param branch - 分支名称
 * @param options - Git 命令选项
 * @returns 已合并返回 true，未合并返回 false
 * @throws GitError 分支不存在等其他非 0 退出码时抛出
 */
export async function isBranchMerged(branch: string, options: GitCommandOptions): Promise<boolean> {
  const result = await gitExec(['merge-base', '--is-ancestor', branch, 'HEAD'], options);

  // exit 0 = 是 HEAD 祖先（已合并）；exit 1 = 不是祖先（未合并，属正常语义而非执行失败）
  if (result.exitCode === 0) {
    return true;
  }
  if (result.exitCode === 1) {
    return false;
  }

  // 其他非 0 退出码（如分支不存在 exit 128）按执行失败抛错
  throw new GitError(
    `Git 命令执行失败: merge-base --is-ancestor ${branch} HEAD\n${result.stderr}`,
    result
  );
}

/**
 * 删除远程分支
 * @param remote - 远程仓库名称（如 origin）
 * @param name - 远程分支名称（远程名首段之后的剩余部分）
 * @param options - Git 命令选项
 */
export async function deleteRemoteBranch(
  remote: string,
  name: string,
  options: GitCommandOptions
): Promise<void> {
  await gitExecStrict(['push', remote, '--delete', name], options);
}

/**
 * 获取引用指向的提交哈希（删除分支前捕获还原数据用）
 * @param ref - 引用名（本地分支传 refs/heads/<name>，远程跟踪引用传 <remote>/<name>）
 * @param options - Git 命令选项
 * @returns 完整提交哈希
 * @throws GitError 引用不存在等执行失败时抛出（调用方据此中止删除，保证拿不到还原数据就不删）
 */
export async function getBranchTip(ref: string, options: GitCommandOptions): Promise<string> {
  const result = await gitExecStrict(['rev-parse', ref], options);
  return result.stdout;
}

/**
 * 获取本地分支的上游跟踪信息
 * @param branch - 本地分支名称
 * @param options - Git 命令选项
 * @returns 上游 {remote, branch}（如 origin/dev 按第一个 / 切分）；
 *   未配置上游或输出无法解析时返回 null
 * @throws GitError 除"未配置上游"之外的执行错误时抛出
 */
export async function getBranchUpstream(
  branch: string,
  options: GitCommandOptions
): Promise<{ remote: string; branch: string } | null> {
  const result = await gitExec(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`], options);

  // 非 0 退出码：未配置上游属正常业务语义返回 null，其余按执行失败抛出。
  // 本机 git 为中文本地化（"尚未给分支 ... 设置上游"），需同时匹配英文文案
  if (result.exitCode !== 0) {
    const missingUpstream =
      result.stderr.includes('no upstream') ||
      result.stderr.includes('尚未给分支');
    if (missingUpstream) {
      return null;
    }
    throw new GitError(
      `Git 命令执行失败: rev-parse --abbrev-ref ${branch}@{upstream}\n${result.stderr}`,
      result
    );
  }

  // 输出形如 origin/dev；按第一个 / 切分，远程分支名部分可继续含 /
  const upstream = result.stdout;
  const sepIndex = upstream.indexOf('/');
  if (sepIndex <= 0 || sepIndex === upstream.length - 1) {
    return null;
  }
  return { remote: upstream.slice(0, sepIndex), branch: upstream.slice(sepIndex + 1) };
}

/**
 * 判断是否存在其他本地分支跟踪同一上游（判定 tracking 分支是否可删）
 * @param branch - 待判定的本地分支（扫描时排除自身）
 * @param upstream - 上游引用简称（remote/branch 形式，如 origin/dev）
 * @param options - Git 命令选项
 * @returns 排除自身后存在分支跟踪同一上游时返回 true
 */
export async function hasOtherLocalBranchTracking(
  branch: string,
  upstream: string,
  options: GitCommandOptions
): Promise<boolean> {
  const result = await gitExecStrict(
    ['for-each-ref', 'refs/heads', '--format=%(refname:short)%09%(upstream:short)'],
    options
  );

  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [name, trackedUpstream] = line.split('\t');
    if (name && name !== branch && trackedUpstream === upstream) {
      return true;
    }
  }
  return false;
}

/**
 * 设置本地分支的上游跟踪关系（还原分支时恢复 upstream）
 * @param branch - 本地分支名称
 * @param upstream - 上游引用（remote/branch 形式，如 origin/dev）
 * @param options - Git 命令选项
 */
export async function setBranchUpstream(
  branch: string,
  upstream: string,
  options: GitCommandOptions
): Promise<void> {
  await gitExecStrict(['branch', `--set-upstream-to=${upstream}`, branch], options);
}

/**
 * 重命名分支
 * @param oldName - 原分支名称
 * @param newName - 新分支名称
 * @param options - Git 命令选项
 */
export async function renameBranch(oldName: string, newName: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`branch -m ${oldName} ${newName}`, options);
}

/**
 * 切换分支
 * @param branch - 分支名称
 * @param options - Git 命令选项
 */
export async function checkout(branch: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`checkout ${branch}`, options);
}

/**
 * 创建并切换到新分支
 * @param branch - 分支名称
 * @param options - Git 命令选项
 * @param startPoint - 起点引用（如提交 sha），指定后从该起点创建；
 *   省略时行为不变（基于当前 HEAD）
 */
export async function checkoutNew(
  branch: string,
  options: GitCommandOptions,
  startPoint?: string
): Promise<void> {
  const args = startPoint ? ['checkout', '-b', branch, startPoint] : ['checkout', '-b', branch];
  await gitExecStrict(args, options);
}

/**
 * 合并分支
 * @param branch - 要合并的分支名称
 * @param options - Git 命令选项
 */
export async function merge(branch: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`merge ${branch}`, options);
}

/**
 * 变基到指定分支
 * @param branch - 目标分支名称
 * @param options - Git 命令选项
 */
export async function rebase(branch: string, options: GitCommandOptions): Promise<void> {
  await gitExecStrict(`rebase ${branch}`, options);
}

/**
 * 中止变基
 * @param options - Git 命令选项
 */
export async function rebaseAbort(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('rebase --abort', options);
}

/**
 * 继续变基（解决冲突后）
 * @param options - Git 命令选项
 */
export async function rebaseContinue(options: GitCommandOptions): Promise<void> {
  await gitExecStrict('rebase --continue', options);
}

/**
 * 获取分支差异（与主分支比较）
 * @param branch - 分支名称
 * @param base - 基准分支（默认 main/master）
 * @param options - Git 命令选项
 * @returns 差异文件列表
 */
export async function getBranchDiff(
  branch: string,
  base: string,
  options: GitCommandOptions
): Promise<string[]> {
  const result = await gitExecStrict(`diff --name-only ${base}...${branch}`, options);
  return result.stdout ? result.stdout.split('\n').filter(Boolean) : [];
}

/**
 * 获取当前 Git 作者的名称与邮箱（git config user.name / user.email）
 * @param options - Git 命令选项
 * @returns 作者信息；未配置时对应字段为空字符串
 */
export async function getCurrentAuthor(
  options: GitCommandOptions
): Promise<{ name: string; email: string }> {
  const name = await gitExec('config user.name', options).catch(() => null);
  const email = await gitExec('config user.email', options).catch(() => null);
  return {
    name: (name?.stdout ?? '').trim(),
    email: (email?.stdout ?? '').trim(),
  };
}

/**
 * 姓名标准化用的两段式模式：两个单词由标点或空白分隔（对齐 IDEA VcsUserUtil.NAME_PATTERN）
 * 使用显式字符类代替 \p{Punct}，兼容当前编译目标
 */
const NAME_PATTERN = /^(\w+)[!-/:-@[-`{-~\s](\w+)$/;

/** 可打印 ASCII 判定（对齐 IDEA PRINTABLE_ASCII_PATTERN） */
const PRINTABLE_ASCII = /^[ -~]*$/;

/**
 * 取姓名中的「名 姓」两段（仅当恰好两个单词时成立）
 * @param name 原始姓名
 * @returns 两段姓名，或 null 表示不适用
 */
function getFirstAndLastName(name: string): [string, string] | null {
  const m = NAME_PATTERN.exec(name);
  return m ? [m[1], m[2]] : null;
}

/**
 * 姓名转小写（仅对纯可打印 ASCII 生效，中文等保持原样）
 * @param name 姓名
 * @returns 小写后的姓名
 */
function nameToLowerCase(name: string): string {
  return PRINTABLE_ASCII.test(name) ? name.toLowerCase() : name;
}

/**
 * 姓名标准化：两段式姓名统一为「名 姓」小写，其余整体小写
 * 用于容忍「Zhang San」「zhang.san」「zhang-s#an」等写法差异
 * @param name 姓名
 * @returns 标准化后的姓名
 */
function getNameInStandardForm(name: string): string {
  const pair = getFirstAndLastName(name);
  if (pair) return `${pair[0].toLowerCase()} ${pair[1].toLowerCase()}`;
  return nameToLowerCase(name);
}

/**
 * 从邮箱取用户名部分（@ 之前）
 * @param email 邮箱
 * @returns 用户名部分；无 @ 时返回 null
 */
function getNameFromEmail(email: string): string | null {
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : null;
}

/** 一位作者（姓名 + 邮箱） */
interface Author {
  name: string;
  email: string;
}

/**
 * 导入所有提交作者并按姓名标准化建立索引
 * 同时建立「邮箱用户名部分 → 作者」索引，用于容忍姓名写法差异
 * @param commits 提交作者列表（每条含 name/email）
 * @returns 按标准化姓名与邮箱用户名索引的作者集合
 */
function buildAuthorIndex(commits: Author[]): {
  byName: Map<string, Author[]>;
  byEmailName: Map<string, Author[]>;
} {
  const byName = new Map<string, Author[]>();
  const byEmailName = new Map<string, Author[]>();
  const push = (map: Map<string, Author[]>, key: string, value: Author): void => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const commit of commits) {
    if (commit.name) push(byName, getNameInStandardForm(commit.name), commit);
    const emailName = getNameFromEmail(commit.email);
    if (emailName) push(byEmailName, getNameInStandardForm(emailName), commit);
  }
  return { byName, byEmailName };
}

/**
 * 按姓名解析出「可能是我」的作者集合（对齐 IDEA resolveUserName）
 * 姓名标准化后在姓名索引与邮箱用户名索引中都查一遍并取并集
 * @param name 姓名或邮箱用户名
 * @param index 全部作者索引
 * @returns 匹配到的作者集合
 */
function resolveUsersByName(
  name: string,
  index: { byName: Map<string, Author[]>; byEmailName: Map<string, Author[]> },
): Author[] {
  const key = getNameInStandardForm(name);
  return [...(index.byName.get(key) ?? []), ...(index.byEmailName.get(key) ?? [])];
}

/**
 * 构造当前用户可能对应的作者集合（对齐 IDEA VcsLogUserResolver.resolveCurrentUser）
 * ① 用配置姓名解析出的作者集合
 * ② 再用邮箱用户名解析；结果要过滤掉同名不同人——
 *    只保留邮箱出现在 ① 集合中的候选（如 ivan@ivanov.com 与 ivan@petrov.com 不是同一人）
 * @param current 当前 Git 配置的作者
 * @param index 全部作者索引
 * @returns 可能属于当前用户的作者集合
 */
function resolveCurrentUsers(
  current: Author,
  index: { byName: Map<string, Author[]>; byEmailName: Map<string, Author[]> },
): Set<string> {
  const result = new Set<string>();
  const usersByName = current.name ? resolveUsersByName(current.name, index) : [];
  for (const user of usersByName) result.add(`${user.name}\u0000${user.email.toLowerCase()}`);

  const emailName = getNameFromEmail(current.email);
  if (emailName) {
    const knownEmails = new Set(usersByName.map(u => u.email.toLowerCase()));
    for (const candidate of resolveUsersByName(emailName, index)) {
      // 同名不同人过滤：候选邮箱必须在姓名匹配出的邮箱集合内
      if (knownEmails.has(candidate.email.toLowerCase())) {
        result.add(`${candidate.name}\u0000${candidate.email.toLowerCase()}`);
      }
    }
  }
  return result;
}

/**
 * 找出「我的分支」：分支的独有提交全部由当前作者创作，且至少有一条独有提交
 * 独有提交指该分支相对其他本地分支独有的提交（对齐 IDEA Show My Branches 语义）
 * 本地与远程分支都参与判定；远程分支按 upstream 归属关系独立计算
 * @param options - Git 命令选项
 * @returns 属于当前作者的分支名列表（本地为短名，远程为 remote/name 形式）
 */
export async function findMyBranches(options: GitCommandOptions): Promise<string[]> {
  const current = await getCurrentAuthor(options);
  if (!current.email && !current.name) return [];

  // 本地分支（严格 refs/heads）与远程分支（refs/remotes，排除 */HEAD）
  const branchResult = await gitExec(
    ['for-each-ref', '--format=%(refname:short)|%(refname)', 'refs/heads', 'refs/remotes'],
    options
  );
  const local: string[] = [];
  const remote: string[] = [];
  for (const line of (branchResult.stdout ?? '').split('\n')) {
    const [shortName, fullRef] = line.split('|');
    if (!shortName || !fullRef) continue;
    if (fullRef.startsWith('refs/heads/')) local.push(shortName);
    else if (fullRef.startsWith('refs/remotes/') && !fullRef.endsWith('/HEAD')) remote.push(shortName);
  }
  if (local.length === 0 && remote.length === 0) return [];

  // 收集仓库全部提交作者，用于姓名/邮箱口径匹配
  const allAuthorsResult = await gitExec(
    ['log', '--all', '--format=%ae%n%an'],
    options
  ).catch(() => null);
  const authorLines = (allAuthorsResult?.stdout ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  const allAuthors: Author[] = [];
  for (let i = 0; i < authorLines.length; i += 2) {
    allAuthors.push({ email: authorLines[i] ?? '', name: authorLines[i + 1] ?? '' });
  }
  const index = buildAuthorIndex(allAuthors);
  // 当前用户可能对应的作者集合（姓名/邮箱两种口径，已过滤同名不同人）
  const meKeySet = resolveCurrentUsers(current, index);

  /**
   * 判断单个 ref 的独有提交是否全部由我创作
   * @param ref 分支引用
   * @param excludeRefs 计算独有提交时要排除的其他分支
   * @returns 是否属于我的分支
   */
  const checkRef = async (ref: string, excludeRefs: string[]): Promise<boolean> => {
    const logArgs = ['log', '--format=%ae%n%an', ref];
    if (excludeRefs.length > 0) logArgs.push('--not', ...excludeRefs);
    const logResult = await gitExec(logArgs, options).catch(() => null);
    if (!logResult) return false;

    const lines = (logResult.stdout ?? '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return false; // 无独有提交 → 不算我的分支

    for (let i = 0; i < lines.length; i += 2) {
      const author: Author = { email: lines[i] ?? '', name: lines[i + 1] ?? '' };
      if (!meKeySet.has(`${author.name}\u0000${author.email.toLowerCase()}`)) return false;
    }
    return true;
  };

  const result: string[] = [];

  // 本地分支：排除其他本地分支与其他远程分支（远程独有的提交不算本地分支独有）
  for (const branch of local) {
    const others = [...local.filter(b => b !== branch), ...remote];
    if (await checkRef(branch, others)) result.push(branch);
  }

  // 远程分支：只与其他远程分支比较（与本地分支指向同一提交时仍应判定为独有）
  for (const branch of remote) {
    const others = remote.filter(b => b !== branch);
    if (await checkRef(branch, others)) result.push(branch);
  }

  return result;
}
