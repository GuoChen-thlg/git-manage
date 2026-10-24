import { gitExec, gitExecStrict } from './executor.js';
import { GitError, type GitCommandOptions, type Branch } from './types.js';

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

  // 解析 git branch 输出
  if (result.stdout) {
    // 获取未推送分支信息
    const unpushedMap = await getUnpushedBranches(options);
    const unpulledMap = await getUnpulledBranches(options);
    
    for (const line of result.stdout.split('\n')) {
      if (!line.trim()) continue;

      const [name, commit, message] = line.split('|');
      if (!name) continue;

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
 * 找出「我的分支」：分支的独有提交全部由当前作者创作，且至少有一条独有提交
 * 独有提交指该分支有、而其他本地分支都没有的提交（对齐 IDEA Show My Branches 语义）
 * @param options - Git 命令选项
 * @returns 属于当前作者的分支名列表（含当前分支）；无法确定作者时返回空数组
 */
export async function findMyBranches(options: GitCommandOptions): Promise<string[]> {
  const author = await getCurrentAuthor(options);
  if (!author.email && !author.name) return [];

  // 本地分支列表（--format 输出每行一个分支名）
  const branchResult = await gitExec('branch --format=%(refname:short)', options);
  const branches = (branchResult.stdout ?? '').split('\n').map(b => b.trim()).filter(Boolean);
  if (branches.length === 0) return [];

  const result: string[] = [];

  for (const branch of branches) {
    // 该分支相对其他分支的独有提交（左闭右开：其他分支...分支）
    // 用 --not 排除所有其他本地分支，得到仅存在于该分支的提交
    const others = branches.filter(b => b !== branch);
    // gitExec 数组形式不经 shell，分支名原样作为参数，无需转义
    const logArgs = ['log', '--format=%ae%n%an', branch];
    if (others.length > 0) logArgs.push('--not', ...others);
    const logResult = await gitExec(logArgs, options).catch(() => null);
    if (!logResult) continue;

    const lines = (logResult.stdout ?? '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue; // 无独有提交 → 不算我的分支

    // 每两条为一次提交：邮箱、名称
    let allMine = true;
    for (let i = 0; i < lines.length; i += 2) {
      const email = lines[i] ?? '';
      const name = lines[i + 1] ?? '';
      const emailMatch = author.email && email.toLowerCase() === author.email.toLowerCase();
      const nameMatch = author.name && name === author.name;
      if (!emailMatch && !nameMatch) {
        allMine = false;
        break;
      }
    }
    if (allMine) result.push(branch);
  }

  return result;
}
