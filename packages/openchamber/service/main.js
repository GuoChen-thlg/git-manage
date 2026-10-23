"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../core/dist/index.js
var import_child_process = require("child_process");
var import_util = require("util");
var GitError = class extends Error {
  constructor(message, result) {
    super(message);
    this.result = result;
    this.name = "GitError";
  }
  result;
};
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
async function gitExec(command, options) {
  const { cwd, timeout = 3e4, env } = options;
  const args = typeof command === "string" ? command.split(/\s+/).filter(Boolean) : command;
  const commandText = Array.isArray(command) ? command.join(" ") : command;
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      timeout,
      env: {
        ...process.env,
        ...env,
        // 禁用 Git 提示
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "echo"
      },
      maxBuffer: 10 * 1024 * 1024
      // 10MB
    });
    return {
      // 只清理尾部空白：git status --porcelain 行首空格承载暂存状态语义，不能吃掉
      stdout: result.stdout.trimEnd(),
      stderr: result.stderr.trim(),
      exitCode: 0
    };
  } catch (error) {
    const execError = error;
    if (execError.killed) {
      throw new GitError(`Git \u547D\u4EE4\u6267\u884C\u8D85\u65F6: ${commandText}`, {
        stdout: execError.stdout ?? "",
        stderr: "\u547D\u4EE4\u6267\u884C\u8D85\u65F6",
        exitCode: -1
      });
    }
    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      exitCode: execError.code ?? 1
    };
  }
}
async function gitExecStrict(command, options) {
  const result = await gitExec(command, options);
  if (result.exitCode !== 0) {
    const commandText = Array.isArray(command) ? command.join(" ") : command;
    throw new GitError(
      `Git \u547D\u4EE4\u6267\u884C\u5931\u8D25: ${commandText}
${result.stderr}`,
      result
    );
  }
  return result;
}
async function listBranches(options) {
  const result = await gitExecStrict("branch -a --format=%(refname:short)|%(objectname:short)|%(subject)", options);
  const currentBranch = await getCurrentBranch(options);
  const branches = [];
  const seen = /* @__PURE__ */ new Set();
  if (result.stdout) {
    const unpushedMap = await getUnpushedBranches(options);
    const unpulledMap = await getUnpulledBranches(options);
    for (const line of result.stdout.split("\n")) {
      if (!line.trim()) continue;
      const [name, commit2, message] = line.split("|");
      if (!name) continue;
      const isCurrent = name === currentBranch;
      const isRemote = name.startsWith("origin/");
      const remote = isRemote ? name.split("/")[0] : void 0;
      const unpushedInfo = unpushedMap.get(name);
      const unpulledInfo = unpulledMap.get(name);
      branches.push({
        name,
        isCurrent,
        isRemote,
        remote,
        commit: commit2,
        message,
        hasUnpushed: unpushedInfo?.hasUnpushed ?? false,
        unpushedCount: unpushedInfo?.unpushedCount ?? 0,
        hasUnpulled: unpulledInfo?.hasUnpulled ?? false,
        unpulledCount: unpulledInfo?.unpulledCount ?? 0
      });
      seen.add(name);
    }
  }
  if (currentBranch && !seen.has(currentBranch) && !currentBranch.startsWith("HEAD")) {
    const headContent = await gitExec("symbolic-ref HEAD", options);
    if (headContent.stdout) {
      branches.unshift({
        name: currentBranch,
        isCurrent: true,
        isRemote: false,
        commit: void 0,
        message: void 0,
        hasUnpushed: false,
        unpushedCount: 0
      });
    }
  }
  return branches;
}
async function getUnpushedBranches(options) {
  const map = /* @__PURE__ */ new Map();
  try {
    const result = await gitExec("branch --format=%(refname:short)", options);
    if (!result.stdout) return map;
    const localBranches = result.stdout.split("\n").filter((b) => b && !b.startsWith("origin/"));
    for (const branch of localBranches) {
      try {
        const unpushedResult = await gitExec(
          `log --oneline origin/${branch}..${branch} 2>/dev/null | wc -l | tr -d ' '`,
          options
        );
        const count = parseInt(unpushedResult.stdout || "0", 10);
        if (count > 0) {
          map.set(branch, { hasUnpushed: true, unpushedCount: count });
        }
      } catch {
      }
    }
  } catch {
  }
  return map;
}
async function getUnpulledBranches(options) {
  const map = /* @__PURE__ */ new Map();
  try {
    const result = await gitExec("branch --format=%(refname:short)", options);
    if (!result.stdout) return map;
    const localBranches = result.stdout.split("\n").filter((b) => b && !b.startsWith("origin/"));
    for (const branch of localBranches) {
      try {
        const unpulledResult = await gitExec(
          `log --oneline ${branch}..origin/${branch} 2>/dev/null | wc -l | tr -d ' '`,
          options
        );
        const count = parseInt(unpulledResult.stdout || "0", 10);
        if (count > 0) {
          map.set(branch, { hasUnpulled: true, unpulledCount: count });
        }
      } catch {
      }
    }
  } catch {
  }
  return map;
}
async function getCurrentBranch(options) {
  const result = await gitExecStrict("branch --show-current", options);
  return result.stdout || "HEAD";
}
async function createBranch(name, options, startPoint) {
  const args = startPoint ? ["branch", name, startPoint] : ["branch", name];
  await gitExecStrict(args, options);
}
async function deleteBranch(name, options, force = false) {
  const flag = force ? "-D" : "-d";
  await gitExecStrict(`branch ${flag} ${name}`, options);
}
async function localBranchExists(name, options) {
  const result = await gitExecStrict(["branch", "--list", "--format=%(refname:short)"], options);
  return result.stdout.split("\n").some((line) => line === name);
}
async function isBranchMerged(branch, options) {
  const result = await gitExec(["merge-base", "--is-ancestor", branch, "HEAD"], options);
  if (result.exitCode === 0) {
    return true;
  }
  if (result.exitCode === 1) {
    return false;
  }
  throw new GitError(
    `Git \u547D\u4EE4\u6267\u884C\u5931\u8D25: merge-base --is-ancestor ${branch} HEAD
${result.stderr}`,
    result
  );
}
async function deleteRemoteBranch(remote, name, options) {
  await gitExecStrict(["push", remote, "--delete", name], options);
}
async function getBranchTip(ref, options) {
  const result = await gitExecStrict(["rev-parse", ref], options);
  return result.stdout;
}
async function getBranchUpstream(branch, options) {
  const result = await gitExec(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`], options);
  if (result.exitCode !== 0) {
    const missingUpstream = result.stderr.includes("no upstream") || result.stderr.includes("\u5C1A\u672A\u7ED9\u5206\u652F");
    if (missingUpstream) {
      return null;
    }
    throw new GitError(
      `Git \u547D\u4EE4\u6267\u884C\u5931\u8D25: rev-parse --abbrev-ref ${branch}@{upstream}
${result.stderr}`,
      result
    );
  }
  const upstream = result.stdout;
  const sepIndex = upstream.indexOf("/");
  if (sepIndex <= 0 || sepIndex === upstream.length - 1) {
    return null;
  }
  return { remote: upstream.slice(0, sepIndex), branch: upstream.slice(sepIndex + 1) };
}
async function hasOtherLocalBranchTracking(branch, upstream, options) {
  const result = await gitExecStrict(
    ["for-each-ref", "refs/heads", "--format=%(refname:short)%09%(upstream:short)"],
    options
  );
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const [name, trackedUpstream] = line.split("	");
    if (name && name !== branch && trackedUpstream === upstream) {
      return true;
    }
  }
  return false;
}
async function setBranchUpstream(branch, upstream, options) {
  await gitExecStrict(["branch", `--set-upstream-to=${upstream}`, branch], options);
}
async function renameBranch(oldName, newName, options) {
  await gitExecStrict(`branch -m ${oldName} ${newName}`, options);
}
async function checkout(branch, options) {
  await gitExecStrict(`checkout ${branch}`, options);
}
async function checkoutNew(branch, options, startPoint) {
  const args = startPoint ? ["checkout", "-b", branch, startPoint] : ["checkout", "-b", branch];
  await gitExecStrict(args, options);
}
async function merge(branch, options) {
  await gitExecStrict(`merge ${branch}`, options);
}
async function rebase(branch, options) {
  await gitExecStrict(`rebase ${branch}`, options);
}
async function rebaseAbort(options) {
  await gitExecStrict("rebase --abort", options);
}
async function rebaseContinue(options) {
  await gitExecStrict("rebase --continue", options);
}
function parseFileStatus(indexStatus, worktreeStatus) {
  if (indexStatus === "R" || indexStatus === "C") return "renamed";
  if (indexStatus === "D" || worktreeStatus === "D") return "deleted";
  if (indexStatus === "A" || worktreeStatus === "?") return "added";
  if (indexStatus === "M" || worktreeStatus === "M") return "modified";
  if (indexStatus === "U" || worktreeStatus === "U") return "conflicted";
  return "modified";
}
async function getStatus(options) {
  const currentBranch = await getCurrentBranchName(options);
  const result = await gitExec("status --porcelain=v1", options);
  if (result.exitCode !== 0) {
    return {
      currentBranch,
      changes: [],
      hasChanges: false,
      hasUnstagedChanges: false,
      hasStagedChanges: false
    };
  }
  const changes = [];
  let hasUnstagedChanges = false;
  let hasStagedChanges = false;
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const indexStatus = line[0];
    const worktreeStatus = line[1];
    const path = line.substring(3).trim();
    if (!path) continue;
    const staged = indexStatus !== " " && indexStatus !== "?";
    const status = parseFileStatus(indexStatus, worktreeStatus);
    if (staged) hasStagedChanges = true;
    if (worktreeStatus !== " " && worktreeStatus !== "?") hasUnstagedChanges = true;
    changes.push({
      path,
      status,
      staged
    });
  }
  return {
    currentBranch,
    changes,
    hasChanges: changes.length > 0,
    hasUnstagedChanges,
    hasStagedChanges
  };
}
async function getCurrentBranchName(options) {
  const result = await gitExec("branch --show-current", options);
  return result.stdout || "HEAD";
}
async function stash(options, message) {
  await gitExecStrict(message ? ["stash", "push", "-m", message] : ["stash", "push"], options);
}
function parseDiffLine(line, lineType, newLineNum, oldLineNum) {
  return {
    type: lineType,
    content: line.substring(1),
    newLine: lineType !== "delete" ? newLineNum : void 0,
    oldLine: lineType !== "add" ? oldLineNum : void 0
  };
}
function parseUnifiedDiff(diffOutput) {
  const lines = [];
  let newLineNum = 0;
  let oldLineNum = 0;
  for (const line of diffOutput.split("\n")) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10) - 1;
        newLineNum = parseInt(match[2], 10) - 1;
      }
      continue;
    }
    if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }
    if (line.startsWith("+")) {
      newLineNum++;
      lines.push(parseDiffLine(line, "add", newLineNum, oldLineNum));
    } else if (line.startsWith("-")) {
      oldLineNum++;
      lines.push(parseDiffLine(line, "delete", newLineNum, oldLineNum));
    } else if (line.startsWith(" ") || line === "") {
      newLineNum++;
      oldLineNum++;
      lines.push(parseDiffLine(line, "context", newLineNum, oldLineNum));
    }
  }
  return lines;
}
async function getCommitDiff(from, to, options) {
  const result = await gitExec(`diff ${from} ${to}`, options);
  if (!result.stdout) {
    return [];
  }
  const fileDiffs = [];
  const fileSections = result.stdout.split("diff --git ");
  for (const section of fileSections) {
    if (!section.trim()) continue;
    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;
    const path = pathMatch[1];
    const lines = parseUnifiedDiff("diff --git " + section);
    const additions = lines.filter((l) => l.type === "add").length;
    const deletions = lines.filter((l) => l.type === "delete").length;
    fileDiffs.push({
      path,
      additions,
      deletions,
      lines
    });
  }
  return fileDiffs;
}
async function getBranchDiffFiles(from, to, options) {
  const result = await gitExec(`diff ${from}...${to}`, options);
  if (!result.stdout) {
    return [];
  }
  const fileDiffs = [];
  const fileSections = result.stdout.split("diff --git ");
  for (const section of fileSections) {
    if (!section.trim()) continue;
    const pathMatch = section.match(/b\/(.+)$/m);
    if (!pathMatch) continue;
    const path = pathMatch[1];
    const lines = parseUnifiedDiff("diff --git " + section);
    const additions = lines.filter((l) => l.type === "add").length;
    const deletions = lines.filter((l) => l.type === "delete").length;
    fileDiffs.push({
      path,
      additions,
      deletions,
      lines
    });
  }
  return fileDiffs;
}
function parseCommit(raw) {
  const lines = raw.split("\n");
  if (lines.length < 4) return null;
  const hash = lines[0];
  const shortHash = hash.substring(0, 7);
  const message = lines[1];
  const authorName = lines[2];
  const authorEmail = lines[3].replace(/[<>]/g, "");
  const date = lines[4] || "";
  const parents = lines[5] ? lines[5].split(" ").filter(Boolean) : [];
  return {
    hash,
    shortHash,
    message,
    authorName,
    authorEmail,
    date,
    parents
  };
}
async function getLog(options = {}, gitOptions) {
  const format = "%H%n%s%n%an%n%ae%n%ai%n%P";
  const args = ["log", `--format=${format}`];
  if (options.maxCount) {
    args.push(`--max-count=${options.maxCount}`);
  }
  if (options.since) {
    args.push(`--since="${options.since}"`);
  }
  if (options.until) {
    args.push(`--until="${options.until}"`);
  }
  if (options.branch) {
    args.push(options.branch);
  }
  if (typeof options.path === "string") {
    if (options.path) {
      args.push("--", options.path);
    }
  } else if (Array.isArray(options.path)) {
    const paths = options.path.filter((p) => p !== "");
    if (paths.length > 0) {
      args.push("--", ...paths);
    }
  }
  const result = await gitExec(args, gitOptions);
  if (!result.stdout) {
    return [];
  }
  const commits = [];
  const lines = result.stdout.split("\n");
  const COMMIT_FIELDS = 6;
  for (let i = 0; i < lines.length; i += COMMIT_FIELDS) {
    const block = lines.slice(i, i + COMMIT_FIELDS).join("\n");
    const commit2 = parseCommit(block.trim());
    if (commit2) {
      commits.push(commit2);
    }
  }
  return commits;
}
async function showCommit(hash, options) {
  const format = "%H%n%s%n%an%n%ae%n%ai%n%P";
  const result = await gitExec(`show --format=${format} --stat ${hash}`, options);
  if (!result.stdout) {
    return null;
  }
  const lines = result.stdout.split("\n");
  if (lines.length < 5) return null;
  const commit2 = {
    hash: lines[0],
    shortHash: lines[0].substring(0, 7),
    message: lines[1],
    authorName: lines[2],
    authorEmail: lines[3].replace(/[<>]/g, ""),
    date: lines[4],
    parents: lines[5] ? lines[5].split(" ").filter(Boolean) : []
  };
  const diffs = await getCommitDiff(commit2.parents[0] || "", hash, options);
  return {
    ...commit2,
    diffs
  };
}
async function listTrackedFiles(cwd) {
  const result = await gitExec(["ls-files", "-z"], { cwd });
  if (!result.stdout) {
    return [];
  }
  const files = result.stdout.split("\0").filter((file) => file !== "");
  return files;
}
async function listRemotes(options) {
  const result = await gitExec("remote -v", options);
  if (!result.stdout) {
    return [];
  }
  const remoteMap = /* @__PURE__ */ new Map();
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const name = parts[0];
    const url = parts[1];
    const isPush = parts[2] === "(push)";
    if (!remoteMap.has(name)) {
      remoteMap.set(name, { name, url });
    }
    if (isPush) {
      remoteMap.get(name).pushUrl = url;
    }
  }
  return Array.from(remoteMap.values());
}
async function pull(options, remote = "origin", branch) {
  const args = branch ? `pull ${remote} ${branch}` : `pull ${remote}`;
  await gitExecStrict(args, options);
}
async function push(options, remote = "origin", branch) {
  const args = branch ? `push ${remote} ${branch}` : `push ${remote}`;
  await gitExecStrict(args, options);
}
async function forcePush(options, remote = "origin", branch) {
  const args = branch ? `push --force ${remote} ${branch}` : `push --force ${remote}`;
  await gitExecStrict(args, options);
}
async function abortMerge(options) {
  await gitExecStrict("merge --abort", options);
}
async function continueMerge(options) {
  await gitExecStrict("merge --continue", options);
}
async function getBranches(cwd) {
  return listBranches({ cwd });
}
async function getCommitLog(cwd, limit = 50, branch, path) {
  return getLog({ maxCount: limit, branch, path }, { cwd });
}
async function getCommitDetail(cwd, commitHash) {
  return showCommit(commitHash, { cwd });
}
async function getCommitFileDiffs(cwd, commitHash) {
  const commit2 = await showCommit(commitHash, { cwd });
  if (!commit2 || !commit2.parents[0]) {
    return [];
  }
  return getCommitDiff(commit2.parents[0], commitHash, { cwd });
}

// service/main.ts
var PORT = parseInt(process.env.OPENCHAMBER_SERVICE_PORT || "0", 10);
var TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN || "";
var DEBUG_LOG_PATH = "/Users/guochen/workingarea/node-projects/git-manage/gitpanel-debug.log";
function verifyToken(request) {
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${TOKEN}`;
}
async function captureLocalRestoreData(branch, options) {
  const tip = await getBranchTip(`refs/heads/${branch}`, options);
  const upstream = await getBranchUpstream(branch, options);
  const canDeleteTracking = upstream ? await hasOtherLocalBranchTracking(branch, `${upstream.remote}/${upstream.branch}`, options) : false;
  return { tip, upstream, canDeleteTracking };
}
async function handleRequest(request) {
  if (!verifyToken(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/health") {
    return new Response("ok", { status: 200 });
  }
  try {
    const body = await request.json();
    const directory = body.directory;
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
        await checkout(body.branch, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-stash": {
        await stash({ cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-merge": {
        await merge(body.branch, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-delete-branch": {
        const branch = body.branch;
        const force = body.force === true;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", directory, branch, force })}`);
        try {
          if (force && await localBranchExists(branch, options)) {
            const restore2 = await captureLocalRestoreData(branch, options);
            await deleteBranch(branch, options, true);
            return Response.json({ success: true, kind: "local", ...restore2 });
          }
          if (!await localBranchExists(branch, options)) {
            const segments = branch.split("/");
            const remoteName = segments[0];
            const remotePath = segments.slice(1).join("/");
            const remoteNames = (await listRemotes(options)).map((r) => r.name);
            if (remotePath && remoteNames.includes(remoteName)) {
              const tip = await getBranchTip(`${remoteName}/${remotePath}`, options);
              await deleteRemoteBranch(remoteName, remotePath, options);
              return Response.json({
                success: true,
                kind: "remote",
                tip,
                upstream: null,
                canDeleteTracking: false
              });
            }
            console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "NOT_FOUND", branch })}`);
            return Response.json(
              { code: "NOT_FOUND", message: `Branch not found: ${branch}` },
              { status: 404 }
            );
          }
          if (!await isBranchMerged(branch, options)) {
            console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "NOT_MERGED", branch })}`);
            return Response.json(
              { code: "NOT_MERGED", message: `Branch not merged into HEAD: ${branch}` },
              { status: 409 }
            );
          }
          const restore = await captureLocalRestoreData(branch, options);
          await deleteBranch(branch, options);
          return Response.json({ success: true, kind: "local", ...restore });
        } catch (error) {
          const stderr = error instanceof GitError && error.result.stderr ? error.result.stderr : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "delete-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-debug-log": {
        const line = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), event: body.event, data: body.data }) + "\n";
        try {
          const { appendFile } = await import("fs/promises");
          await appendFile(DEBUG_LOG_PATH, line, "utf8");
        } catch (e) {
          console.error(`[git-manager-service] ${JSON.stringify({ event: "debug-log-write-error", message: String(e) })}`);
        }
        return Response.json({ success: true });
      }
      case "/git-create-branch": {
        const startPoint = body.startPoint;
        await createBranch(body.name, { cwd: directory }, startPoint);
        return Response.json({ success: true });
      }
      case "/git-restore-branch": {
        const branch = body.branch;
        const tip = body.tip;
        const upstream = body.upstream;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "restore-branch", directory, branch, tip, upstream })}`);
        try {
          await createBranch(branch, options, tip);
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
          const stderr = error instanceof GitError && error.result.stderr ? error.result.stderr : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "restore-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-delete-remote-branch": {
        const remote = body.remote;
        const branch = body.branch;
        const options = { cwd: directory };
        console.log(`[git-manager-service] ${JSON.stringify({ event: "delete-remote-branch", directory, remote, branch })}`);
        try {
          await deleteRemoteBranch(remote, branch, options);
          return Response.json({ success: true });
        } catch (error) {
          const stderr = error instanceof GitError && error.result.stderr ? error.result.stderr : error instanceof Error ? error.message : String(error);
          console.error(`[git-manager-service] ${JSON.stringify({ event: "delete-remote-branch", code: "GIT_ERROR", message: stderr })}`);
          return Response.json({ code: "GIT_ERROR", message: stderr }, { status: 500 });
        }
      }
      case "/git-checkout-new": {
        const startPoint = body.startPoint;
        await checkoutNew(body.name, { cwd: directory }, startPoint);
        return Response.json({ success: true });
      }
      case "/git-rename-branch": {
        await renameBranch(body.oldName, body.newName, { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-rebase": {
        await rebase(body.branch, { cwd: directory });
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
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        await execFileAsync2("git", ["cherry-pick", body.hash], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-branch-diff": {
        const diffs = await getBranchDiffFiles(body.from, body.to, { cwd: directory });
        return Response.json(diffs);
      }
      case "/git-log": {
        const branch = body.branch;
        const path2 = body.path;
        console.log("[git-manager-service] git-log, directory:", directory, "branch:", branch, "path:", path2, "limit:", body.limit);
        const commits = await getCommitLog(directory, body.limit, branch, path2);
        console.log("[git-manager-service] git-log \u7ED3\u679C, \u6570\u91CF:", commits.length);
        return Response.json(commits);
      }
      case "/git-files": {
        const files = await listTrackedFiles(directory);
        console.log("[git-manager-service] git-files, directory:", directory, "\u6570\u91CF:", files.length);
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
        const diffs = await getCommitDiff(body.hash, "", { cwd: directory });
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
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        await execFileAsync2("git", ["stash"], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-fetch": {
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        await execFileAsync2("git", ["fetch", "--all"], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-reset": {
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        const mode = body.mode;
        const hash = body.hash;
        await execFileAsync2("git", ["reset", `--${mode}`, hash], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-revert": {
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        await execFileAsync2("git", ["revert", "--no-edit", body.hash], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-undo-commit": {
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        await execFileAsync2("git", ["reset", "--soft", "HEAD~1"], { cwd: directory });
        return Response.json({ success: true });
      }
      case "/git-is-repo": {
        const { execFile: execFile2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execFileAsync2 = promisify2(execFile2);
        try {
          await execFileAsync2("git", ["rev-parse", "--git-dir"], { cwd: directory });
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
Bun.serve({
  port: PORT,
  fetch: handleRequest
});
console.log(`Service running on port ${PORT}`);
