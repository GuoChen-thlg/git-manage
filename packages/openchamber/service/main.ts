import {
  getBranches,
  getCommitLog,
  getCommitDetail,
  getCommitFileDiffs,
  getStatus,
  checkout,
  checkoutNew,
  stash,
  merge,
  deleteBranch,
  localBranchExists,
  isBranchMerged,
  deleteRemoteBranch,
  getBranchTip,
  getBranchUpstream,
  hasOtherLocalBranchTracking,
  setBranchUpstream,
  listRemotes,
  createBranch,
  renameBranch,
  rebase,
  rebaseAbort,
  rebaseContinue,
  abortMerge,
  continueMerge,
  getBranchDiffFiles,
  getCommitDiff,
  pull,
  push,
  forcePush,
  listTrackedFiles,
  findMyBranches,
  isHeadCommit,
  isMergeCommit,
  isWorkingTreeClean,
  uncommitHead,
  rewordCommit,
  dropCommit,
  pushUpToCommit,
  listWorktrees,
  addWorktree,
  removeWorktree,
  pruneWorktrees,
  getGitCommandLogs,
  clearGitCommandLogs,
  GitError,
} from "../../core/dist/index.js";

/** 获取环境变量 */
const PORT = parseInt(process.env.OPENCHAMBER_SERVICE_PORT || "0", 10);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN || "";
/** 调试日志大小上限（字节），超限后截断重写，避免无限增长 */
const DEBUG_LOG_MAX_BYTES = 1024 * 1024;

/**
 * 调试日志是否开启
 * @returns GIT_MANAGE_DEBUG=1（或 true）时开启，其余情况关闭
 */
function isDebugLogEnabled(): boolean {
  const flag = process.env.GIT_MANAGE_DEBUG || "";
  return flag === "1" || flag.toLowerCase() === "true";
}

/**
 * 追加一行调试日志（按平台写到用户目录，不依赖本机开发路径）
 * 超过大小上限时截断重写，防止日志无限增长
 * @param line 日志行（含换行符）
 */
async function appendDebugLog(line: string): Promise<void> {
  const { appendFile, mkdir, stat, writeFile } = await import("fs/promises");
  const { dirname, join } = await import("path");
  const { homedir } = await import("os");
  const platform = process.platform;
  let baseDir: string;
  if (platform === "win32") {
    // Windows：%APPDATA%\git-manage
    baseDir = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    // macOS：~/Library/Logs/git-manage
    baseDir = join(homedir(), "Library", "Logs");
  } else {
    // Linux：$XDG_CONFIG_HOME/git-manage，未设置则 ~/.config/git-manage
    baseDir = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  }
  const path = join(baseDir, "git-manage", "gitpanel-debug.log");
  await mkdir(dirname(path), { recursive: true });
  // 超限时截断重写，防止日志无限增长
  let overflow = false;
  try {
    overflow = (await stat(path)).size + Buffer.byteLength(line) > DEBUG_LOG_MAX_BYTES;
  } catch {
    // 文件不存在视为未超限，交给 appendFile 创建
  }
  if (overflow) {
    await writeFile(path, line, "utf8");
  } else {
    await appendFile(path, line, "utf8");
  }
}

/** 验证请求 Token */
function verifyToken(request: Request): boolean {
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${TOKEN}`;
}

/**
 * 删除本地分支前捕获还原所需数据
 * @param branch - 本地分支名称
 * @param options - Git 命令选项
 * @returns tip（分支指向的提交哈希）、upstream（未配置为 null）、
 *   canDeleteTracking（是否有其他本地分支跟踪同一上游）
 * @throws GitError tip 获取失败时抛出（拿不到还原数据则不删）
 */
async function captureLocalRestoreData(
  branch: string,
  options: { cwd: string }
): Promise<{
  tip: string;
  upstream: { remote: string; branch: string } | null;
  canDeleteTracking: boolean;
}> {
  const tip = await getBranchTip(`refs/heads/${branch}`, options);
  const upstream = await getBranchUpstream(branch, options);
  const canDeleteTracking = upstream
    ? await hasOtherLocalBranchTracking(branch, `${upstream.remote}/${upstream.branch}`, options)
    : false;
  return { tip, upstream, canDeleteTracking };
}

/** 处理请求 */
/**
 * 处理一次 service 请求
 * 导出以便单元测试直接调用，无需启动真实服务器
 * @param request HTTP 请求
 * @returns HTTP 响应
 */
export async function handleRequest(request: Request): Promise<Response> {
  if (!verifyToken(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 健康检查
  if (path === "/health") {
    return new Response("ok", { status: 200 });
  }

  try {
    const body = await request.json();
    const directory = body.directory as string;

    switch (path) {
      case "/git-status": {
        const status = await getStatus({ cwd: directory });
        return Response.json(status);
      }
      case "/git-branches": {
        const branches = await getBranches(directory);
        return Response.json(branches);
      }
      case "/git-my-branches": {
        const mine = await findMyBranches({ cwd: directory });
        console.log(`[git-manager-service] ${JSON.stringify({ event: "my-branches", count: mine.length })}`);
        return Response.json(mine);
      }
      case "/git-checkout": {
        await checkout(body.branch as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-stash": {
        await stash({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-merge": {
        await merge(body.branch as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-delete-branch": {
        const branch = body.branch as string;
        const force = body.force === true;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", directory, branch, force })}`);

        try {
          // 1) 强制删除且为本地分支：跳过合并预检直接 -D（删除前先捕获还原数据）
          if (force && (await localBranchExists(branch, options))) {
            const restore = await captureLocalRestoreData(branch, options);
            await deleteBranch(branch, options, true);
            return Response.json({ success: true, kind: "local", ...restore });
          }

          // 2) 本地分支不存在：首段命中远程名则走远程删除，否则本地与远程均不存在
          if (!(await localBranchExists(branch, options))) {
            const segments = branch.split("/");
            const remoteName = segments[0];
            const remotePath = segments.slice(1).join("/");
            const remoteNames = (await listRemotes(options)).map((r) => r.name);

            if (remotePath && remoteNames.includes(remoteName)) {
              // 删除前捕获远程分支 tip（<remote>/<name> 跟踪引用），失败保守不删
              const tip = await getBranchTip(`${remoteName}/${remotePath}`, options);
              await deleteRemoteBranch(remoteName, remotePath, options);
              return Response.json({
                success: true,
                kind: "remote",
                tip,
                upstream: null,
                canDeleteTracking: false,
              });
            }

            console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "NOT_FOUND", branch })}`);
            return Response.json(
              { code: "NOT_FOUND", message: `Branch not found: ${branch}` },
              { status: 404 }
            );
          }

          // 3) 本地存在且非强制：合并预检，未合并返回 409
          if (!(await isBranchMerged(branch, options))) {
            console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "NOT_MERGED", branch })}`);
            return Response.json(
              { code: "NOT_MERGED", message: `Branch not merged into HEAD: ${branch}` },
              { status: 409 }
            );
          }

          // 删除前捕获还原所需数据，删除成功后随响应返回
          const restore = await captureLocalRestoreData(branch, options);
          await deleteBranch(branch, options);
          return Response.json({ success: true, kind: "local", ...restore });
        } catch (error) {
          // git 执行失败统一 500 结构化错误，message 取 git stderr
          const stderr = error instanceof GitError && error.result.stderr
            ? error.result.stderr
            : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-debug-log": {
        // 面板调试日志落盘：仅 GIT_MANAGE_DEBUG 开启时写入用户目录，关闭时直接返回成功
        if (!isDebugLogEnabled()) {
          return Response.json({ success: true });
        }
        const line = JSON.stringify({ ts: new Date().toISOString(), event: body.event, data: body.data }) + "\n";
        try {
          await appendDebugLog(line);
        } catch (e) {
          console.error(`[git-manager-service] ${JSON.stringify({ event: "debug-log-write-error", message: String(e) })}`);
        }
        return Response.json({ success: true });
      }
      case "/git-create-branch": {
        // startPoint 可选：选中提交时基于该提交建分支，省略则基于当前 HEAD
        const startPoint = body.startPoint as string | undefined;
        await createBranch(body.name as string, { cwd: directory }, startPoint);
        return Response.json({ success: true });
      }
      case "/git-restore-branch": {
        const branch = body.branch as string;
        const tip = body.tip as string;
        const upstream = body.upstream as { remote: string; branch: string } | undefined;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "restore-branch", directory, branch, tip, upstream })}`);

        try {
          // 按删除前捕获的 tip 重建分支
          await createBranch(branch, options, tip);

          // 恢复 upstream 失败仅告警不回抛：分支已还原即算成功（对齐 IDEA restoreUpstream）
          if (upstream) {
            try {
              await setBranchUpstream(branch, `${upstream.remote}/${upstream.branch}`, options);
            } catch (upstreamError) {
              const message = upstreamError instanceof Error ? upstreamError.message : String(upstreamError);
              console.warn(`[git-manager-service] ${JSON.stringify({ event: "restore-branch", code: "UPSTREAM_RESTORE_FAILED", branch, message })}`);
            }
          }

          return Response.json({ success: true });
        } catch (error) {
          // 重建失败（同名分支已存在、tip 无效等）统一 500 结构化错误
          const stderr = error instanceof GitError && error.result.stderr
            ? error.result.stderr
            : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "restore-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-delete-remote-branch": {
        const remote = body.remote as string;
        const branch = body.branch as string;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-remote-branch", directory, remote, branch })}`);

        try {
          await deleteRemoteBranch(remote, branch, options);
          return Response.json({ success: true });
        } catch (error) {
          // git 执行失败统一 500 结构化错误，message 取 git stderr
          const stderr = error instanceof GitError && error.result.stderr
            ? error.result.stderr
            : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "delete-remote-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-checkout-new": {
        // startPoint 可选：从右键选中的提交创建并切换，省略则基于当前 HEAD
        const startPoint = body.startPoint as string | undefined;
        await checkoutNew(body.name as string, { cwd: directory }, startPoint);
        return Response.json({ success: true });
      }
      case "/git-rename-branch": {
        await renameBranch(body.oldName as string, body.newName as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-rebase": {
        await rebase(body.branch as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-rebase-abort": {
        await rebaseAbort({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-rebase-continue": {
        await rebaseContinue({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-merge-abort": {
        await abortMerge({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-merge-continue": {
        await continueMerge({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-cherry-pick": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["cherry-pick", body.hash as string], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-branch-diff": {
        const diffs = await getBranchDiffFiles(body.from as string, body.to as string, { cwd: directory });
        return Response.json(diffs);
      }
      case "/git-log": {
        const branch = body.branch as string | undefined;
        const path = body.path as string | string[] | undefined;
        console.log("[git-manager-service] git-log, directory:", directory, "branch:", branch, "path:", path, "limit:", body.limit);
        const commits = await getCommitLog(directory, body.limit as number, branch, path);
        console.log("[git-manager-service] git-log 结果, 数量:", commits.length);
        return Response.json(commits);
      }
      case "/git-files": {
        const files = await listTrackedFiles(directory);
        console.log("[git-manager-service] git-files, directory:", directory, "数量:", files.length);
        return Response.json(files);
      }
      case "/git-show":
      case "/git-commit-detail": {
        const detail = await getCommitDetail(directory, body.hash);
        return Response.json(detail);
      }
      case "/git-diff":
      case "/git-commit-diffs": {
        const diffs = await getCommitFileDiffs(directory, body.hash);
        return Response.json(diffs);
      }
      case "/git-diff-vs-local": {
        // 与本地（工作区）比较：from=提交哈希，to=空串，等价 git diff <hash>
        const diffs = await getCommitDiff(body.hash as string, "", { cwd: directory });
        return Response.json(diffs);
      }
      case "/git-pull": {
        await pull({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-push": {
        await push({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-force-push": {
        await forcePush({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-favorites-get": {
        const { readFileSync, existsSync } = await import("fs");
        const { join } = await import("path");
        const favPath = join(directory, ".git", "git-manager-favorites.json");
        if (existsSync(favPath)) {
          const content = readFileSync(favPath, "utf-8");
          return Response.json(JSON.parse(content));
        }
        return Response.json([]);
      }
      case "/git-favorites-set": {
        const { writeFileSync } = await import("fs");
        const { join } = await import("path");
        const favPath = join(directory, ".git", "git-manager-favorites.json");
        writeFileSync(favPath, JSON.stringify(body.favorites, null, 2));
        return Response.json({ success: true });
      }
      case "/git-stash-now": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["stash"], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-fetch": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["fetch", "origin", "--prune"], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-reset": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        const mode = body.mode as string;
        const hash = body.hash as string;
        await execFileAsync("git", ["reset", `--${mode}`, hash], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-commit-edit-info": {
        // 提交是否可用于编辑/删除（是否为 HEAD、是否为合并提交）
        const hash = body.hash as string;
        const head = await isHeadCommit(hash, { cwd: directory });
        const merge = await isMergeCommit(hash, { cwd: directory });
        return Response.json({ isHead: head, isMerge: merge });
      }
      case "/git-working-tree-clean": {
        const clean = await isWorkingTreeClean({ cwd: directory });
        return Response.json(clean);
      }
      case "/git-reword-commit": {
        await rewordCommit(body.hash as string, body.message as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-drop-commit": {
        await dropCommit(body.hash as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-push-up-to": {
        const ref = await pushUpToCommit(body.hash as string, body.branch as string, { cwd: directory });
        return Response.json({ success: true, ref });
      }
      case "/git-worktree-list": {
        const worktrees = await listWorktrees({ cwd: directory });
        return Response.json(worktrees);
      }
      case "/git-worktree-add": {
        // createBranch 为 true 时以 -b 新建分支并检出
        await addWorktree(
          body.path as string,
          body.branch as string,
          body.createBranch === true,
          body.startPoint as string | undefined,
          { cwd: directory },
        );
        return Response.json({ success: true });
      }
      case "/git-worktree-remove": {
        await removeWorktree(body.path as string, body.force === true, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-worktree-prune": {
        await pruneWorktrees({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-command-logs": {
        // since 传上次获取到的最大 id，只回增量；directory 可选，用于过滤仓库
        const since = typeof body.since === "number" ? body.since : 0;
        const logs = getGitCommandLogs(since);
        const filtered = directory ? logs.filter((l) => l.cwd === directory) : logs;
        return Response.json(filtered);
      }
      case "/git-command-logs-clear": {
        clearGitCommandLogs();
        return Response.json({ success: true });
      }
      case "/git-revert": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["revert", "--no-edit", body.hash as string], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-undo-commit": {
        // 撤销提交：校验目标确为当前 HEAD 且工作区干净（对齐 IDEA Uncommit）
        await uncommitHead(body.hash as string, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-is-repo": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        try {
          await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: directory });
          return Response.json(true);
        } catch {
          return Response.json(false);
        }
      }
      default:
        return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(message, { status: 500 });
  }
}

// 仅在作为入口脚本直接运行时启动服务器；被测试 import 时不启动
// Bun 用 import.meta.main，Node（含 esbuild 打包成 cjs 后的产物）用 require.main === module
const isMainModule =
  (import.meta as { main?: boolean }).main === true ||
  (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module);

if (isMainModule) {
  if (typeof Bun !== 'undefined') {
    Bun.serve({ port: PORT, fetch: handleRequest });
    console.log(`Service running on port ${PORT}`);
  } else {
    // Node 运行时：用 http 模块适配 handleRequest，便于脱离 Bun 做黑盒测试
    void import('node:http').then(({ createServer }) => {
      createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          const url = `http://127.0.0.1:${PORT}${req.url ?? '/'}`;
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: body.length > 0 ? body : undefined,
          });
          void handleRequest(request).then(async (response) => {
            res.writeHead(response.status, Object.fromEntries(response.headers));
            res.end(await response.text());
          }).catch(() => {
            res.writeHead(500);
            res.end('internal error');
          });
        });
      }).listen(PORT);
      console.log(`Service running on port ${PORT} (node)`);
    });
  }
}
