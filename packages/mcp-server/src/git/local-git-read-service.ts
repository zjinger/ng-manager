import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";
import type { GitReadService } from "../context/tool-context";

const execFileAsync = promisify(execFile);

function resolveCwd(workspaceRoot: string, projectPath?: string): string {
  return path.resolve(projectPath || workspaceRoot);
}

async function git(cwd: string, args: string[], maxBuffer = 200000): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    timeout: 10000,
    maxBuffer,
  });
  return String(stdout);
}

function parseChangedFiles(statusText: string): string[] {
  return statusText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(.{2})\s+/, "").replace(/^"|"$/g, ""))
    .map((line) => line.includes(" -> ") ? line.split(" -> ").pop()! : line)
    .filter(Boolean);
}

export function createLocalGitReadService(workspaceRoot: string): GitReadService {
  return {
    async status(input) {
      const cwd = resolveCwd(workspaceRoot, input.projectPath);
      const short = await git(cwd, ["status", "--short", "--untracked-files=all"]);
      return {
        cwd,
        branch: (await git(cwd, ["branch", "--show-current"])).trim() || undefined,
        changedFiles: parseChangedFiles(short),
        short,
      };
    },
    async diff(input) {
      const cwd = resolveCwd(workspaceRoot, input.projectPath);
      const text = await git(cwd, ["diff", "--no-ext-diff"], input.maxBytes ?? 200000);
      const maxBytes = input.maxBytes ?? 200000;
      return {
        cwd,
        diff: text.length > maxBytes ? text.slice(0, maxBytes) : text,
        truncated: text.length > maxBytes || undefined,
      };
    },
    async changedFiles(input) {
      const cwd = resolveCwd(workspaceRoot, input.projectPath);
      const short = await git(cwd, ["status", "--short", "--untracked-files=all"]);
      return parseChangedFiles(short);
    },
    async currentBranch(input) {
      return (await git(resolveCwd(workspaceRoot, input.projectPath), ["branch", "--show-current"])).trim();
    },
    async latestLog(input) {
      return (await git(resolveCwd(workspaceRoot, input.projectPath), ["log", "-1", "--pretty=format:%h %s"])).trim();
    },
  };
}
