const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const HUB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(HUB_ROOT, "..", "..");
const VERSION_FILE = path.join(HUB_ROOT, "VERSION");
const OUTPUT_DIR = path.join(HUB_ROOT, "release-notes");
const STATE_FILE = path.join(OUTPUT_DIR, ".release-notes-state.json");

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [key, value] = item.slice(2).split("=");
    args[key] = value ?? "true";
  }
  return args;
}

function readVersion(input) {
  if (input?.trim()) return input.trim();
  if (!fs.existsSync(VERSION_FILE)) return "0.1.0";
  return fs.readFileSync(VERSION_FILE, "utf8").trim() || "0.1.0";
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function classify(subject) {
  const normalized = subject.toLowerCase();
  if (normalized.startsWith("feat")) return "新增功能";
  if (normalized.startsWith("fix")) return "问题修复";
  if (normalized.startsWith("perf")) return "性能优化";
  if (normalized.startsWith("refactor")) return "重构优化";
  if (normalized.startsWith("docs")) return "文档更新";
  return "其他改动";
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (!data || typeof data !== "object") return null;
    if (typeof data.lastCommit !== "string" || !data.lastCommit.trim()) return null;
    return data;
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function commitExists(hash) {
  if (!hash?.trim()) return false;
  try {
    runGit(["cat-file", "-e", `${hash}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function collectCommits({ maxCount, sinceCommit }) {
  const args = ["log", "--pretty=format:%h|%ad|%s", "--date=short"];

  if (sinceCommit?.trim()) {
    args.push(`${sinceCommit}..HEAD`);
  } else {
    args.push("-n", String(maxCount));
  }

  args.push("--", "apps/hub-v2");

  const output = runGit(args);
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...rest] = line.split("|");
      return { hash, date, subject: rest.join("|") };
    });
}

function buildMarkdown(version, commits, meta) {
  const groups = new Map();
  for (const commit of commits) {
    const key = classify(commit.subject);
    const list = groups.get(key) || [];
    list.push(commit);
    groups.set(key, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# 升级说明 v${version}`);
  lines.push("");
  lines.push(`- 发布日期：${today}`);
  lines.push(`- 适用范围：hub-v2（web + server）`);
  lines.push(`- 自动汇总提交数：${commits.length}`);
  lines.push(`- 对比范围：${meta.rangeLabel}`);
  lines.push(`- 当前基线：${meta.headCommit}`);
  lines.push("");
  lines.push("## 版本说明");
  lines.push("- 本版本采用语义化版本（SemVer）：`主版本.次版本.修订号`。");
  lines.push("- 主版本：不兼容改动；次版本：向后兼容的新功能；修订号：兼容性修复。");
  lines.push("");

  const orderedTitles = ["新增功能", "问题修复", "性能优化", "重构优化", "文档更新", "其他改动"];
  for (const title of orderedTitles) {
    const list = groups.get(title) || [];
    if (list.length === 0) continue;
    lines.push(`## ${title}`);
    for (const item of list) {
      lines.push(`- ${item.subject}（${item.hash}）`);
    }
    lines.push("");
  }

  lines.push("## 升级操作建议");
  lines.push("- 先执行数据库迁移：`npm run db:migrate`。");
  lines.push("- 再重启服务并验证关键页面（全局搜索、测试追踪、积木报表）。");
  lines.push("- 若需回滚，可按发布目录回退并恢复数据库备份。");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const version = readVersion(args.version);
  const maxCount = Number(args.max || 40);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const headCommit = runGit(["rev-parse", "HEAD"]);
  const state = readState();
  const sinceCommit = args.since || state?.lastCommit;
  const canUseSince = commitExists(sinceCommit);

  const commits = collectCommits({
    maxCount,
    sinceCommit: canUseSince ? sinceCommit : undefined,
  });

  const rangeLabel = canUseSince
    ? `${sinceCommit.slice(0, 7)}..${headCommit.slice(0, 7)}`
    : `最近 ${maxCount} 条（初始化模式）`;

  const markdown = buildMarkdown(version, commits, {
    rangeLabel,
    headCommit: headCommit.slice(0, 7),
  });

  const outputPath = path.join(OUTPUT_DIR, `v${version}.md`);
  fs.writeFileSync(outputPath, `${markdown}\n`, "utf8");

  writeState({
    lastCommit: headCommit,
    lastVersion: version,
    generatedAt: new Date().toISOString(),
  });

  console.log(`[release-notes] generated: ${outputPath}`);
  console.log(`[release-notes] baseline: ${headCommit}`);
}

main();
