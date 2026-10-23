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
  GitError,
} from "../../core/dist/index.js";

/** 获取环境变量 */
const PORT = parseInt(process.env.OPENCHAMBER_SERVICE_PORT || "0", 10);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN || "";

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
async function handleRequest(request: Request): Promise<Response> {
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
        await checkoutNew(body.name as string, { cwd: directory });
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
        await execFileAsync("git", ["fetch", "--all"], { cwd: directory });
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
      case "/git-revert": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["revert", "--no-edit", body.hash as string], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-undo-commit": {
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const execFileAsync = promisify(execFile);
        await execFileAsync("git", ["reset", "--soft", "HEAD~1"], { cwd: directory });
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

// 启动服务器
Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`Service running on port ${PORT}`);
