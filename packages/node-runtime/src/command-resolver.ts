import type { ResolvedNodeRuntime, ResolvedRuntimeCommand, ResolveRuntimeCommandOptions } from "./types";

interface ParsedCommandLine {
  tokens: string[];
  hadQuote: boolean;
}

export function parseCommandLine(input: string): ParsedCommandLine {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let hadQuote = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      if (char === "\\" && quote === '"' && i + 1 < input.length) {
        current += input[++i]!;
        continue;
      }
      current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      hadQuote = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    if (char === "\\" && i + 1 < input.length) {
      current += input[++i]!;
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return { tokens, hadQuote };
}

function fallbackCommand(
  commandLine: string,
  runtime: ResolvedNodeRuntime,
  options: ResolveRuntimeCommandOptions = {}
): ResolvedRuntimeCommand {
  return {
    command: commandLine,
    args: [],
    cwd: options.cwd,
    env: { ...runtime.env, ...(options.env || {}) },
    shell: true,
    displayCommand: commandLine,
  };
}

function directCommand(
  command: string,
  args: string[],
  runtime: ResolvedNodeRuntime,
  commandLine: string,
  options: ResolveRuntimeCommandOptions = {}
): ResolvedRuntimeCommand {
  return {
    command,
    args,
    cwd: options.cwd,
    env: { ...runtime.env, ...(options.env || {}) },
    shell: false,
    displayCommand: commandLine,
  };
}

export function resolveRuntimeCommand(
  commandLine: string,
  runtime: ResolvedNodeRuntime,
  options: ResolveRuntimeCommandOptions = {}
): ResolvedRuntimeCommand {
  const trimmed = commandLine.trim();
  if (!trimmed) return fallbackCommand(commandLine, runtime, options);

  const { tokens } = parseCommandLine(trimmed);
  if (tokens.length === 0) return fallbackCommand(commandLine, runtime, options);

  const executable = tokens[0]!.toLowerCase();
  const args = tokens.slice(1);

  if (executable === "node" || executable === "node.exe") {
    return directCommand(runtime.nodePath, args, runtime, trimmed, options);
  }

  if (executable === "npm" || executable === "npm.cmd") {
    if (runtime.npmCliPath) {
      return directCommand(runtime.nodePath, [runtime.npmCliPath, ...args], runtime, trimmed, options);
    }
    if (runtime.npmPath) {
      return directCommand(runtime.npmPath, args, runtime, trimmed, options);
    }
    return fallbackCommand(trimmed, runtime, options);
  }

  if (executable === "npx" || executable === "npx.cmd") {
    if (runtime.npxCliPath) {
      return directCommand(runtime.nodePath, [runtime.npxCliPath, ...args], runtime, trimmed, options);
    }
    if (runtime.npxPath) {
      return directCommand(runtime.npxPath, args, runtime, trimmed, options);
    }
    return fallbackCommand(trimmed, runtime, options);
  }

  if (executable === "pnpm" || executable === "pnpm.cmd") {
    if (runtime.pnpmPath) {
      return directCommand(runtime.pnpmPath, args, runtime, trimmed, options);
    }
    return fallbackCommand(trimmed, runtime, options);
  }

  if (executable === "yarn" || executable === "yarn.cmd") {
    if (runtime.yarnPath) {
      return directCommand(runtime.yarnPath, args, runtime, trimmed, options);
    }
    return fallbackCommand(trimmed, runtime, options);
  }

  return fallbackCommand(trimmed, runtime, options);
}
