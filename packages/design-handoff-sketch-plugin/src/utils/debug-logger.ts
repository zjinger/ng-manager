export const LOG_FILE_NAME = "ngm-ai-handoff.log";
const UTF8_ENCODING = typeof NSUTF8StringEncoding !== "undefined" ? NSUTF8StringEncoding : 4;

function tryRequire(name: string): any {
  try {
    return require(name);
  } catch (error) {
    return null;
  }
}

const nodeFs: any = tryRequire("fs");
const nodeOs: any = tryRequire("os");

export function joinPath(..._parts: unknown[]): string {
  const parts = Array.prototype.slice.call(arguments).filter(function (part) {
    return part !== null && part !== undefined && String(part).length > 0;
  });

  return parts
    .map(function (part, index) {
      const value = String(part);
      if (index === 0) {
        return value.replace(/\/+$/g, "");
      }
      return value.replace(/^\/+|\/+$/g, "");
    })
    .join("/");
}

function getHomeDir() {
  if (typeof NSHomeDirectory !== "undefined") {
    return String(NSHomeDirectory());
  }
  if (nodeOs && typeof nodeOs.homedir === "function") {
    return nodeOs.homedir();
  }
  return ".";
}

function getFileManager() {
  if (typeof NSFileManager !== "undefined") {
    return NSFileManager.defaultManager();
  }
  return null;
}

export function ensureDirRecursive(dir: string): boolean {
  const fileManager = getFileManager();
  if (fileManager) {
    return Boolean(
      fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(
        String(dir),
        true,
        null,
        null,
      ),
    );
  }
  if (nodeFs) {
    nodeFs.mkdirSync(String(dir), { recursive: true });
    return true;
  }
  return false;
}

export function fileExists(path: string): boolean {
  const fileManager = getFileManager();
  if (fileManager) {
    return Boolean(fileManager.fileExistsAtPath(String(path)));
  }
  return nodeFs ? nodeFs.existsSync(String(path)) : false;
}

function removeFile(path: string): void {
  const fileManager = getFileManager();
  if (fileManager) {
    fileManager.removeItemAtPath_error(String(path), null);
    return;
  }
  if (nodeFs && nodeFs.existsSync(String(path))) {
    nodeFs.rmSync(String(path), { force: true });
  }
}

export function writeTextFile(path: string, text: string): boolean {
  const fileManager = getFileManager();
  if (fileManager && typeof NSString !== "undefined") {
    const value = NSString.stringWithString(String(text));
    return Boolean(value.writeToFile_atomically_encoding_error(String(path), true, UTF8_ENCODING, null));
  }
  if (nodeFs) {
    nodeFs.writeFileSync(String(path), String(text), "utf8");
    return true;
  }
  return false;
}

export function appendTextFile(path: string, text: string): boolean {
  const fileManager = getFileManager();
  if (fileManager && typeof NSString !== "undefined") {
    if (!fileExists(path)) {
      return writeTextFile(path, text);
    }
    try {
      const handle = NSFileHandle.fileHandleForWritingAtPath(String(path));
      handle.seekToEndOfFile();
      const data = NSString.stringWithString(String(text)).dataUsingEncoding(UTF8_ENCODING);
      handle.writeData(data);
      handle.closeFile();
      return true;
    } catch (error) {
      return false;
    }
  }
  if (nodeFs) {
    nodeFs.appendFileSync(String(path), String(text), "utf8");
    return true;
  }
  return false;
}

export function writeJsonFile(dir: string, fileName: string, value: unknown): boolean {
  ensureDirRecursive(dir);
  return writeTextFile(joinPath(dir, fileName), JSON.stringify(value, null, 2) + "\n");
}

export function isDirectoryWritable(dir: string): boolean {
  try {
    ensureDirRecursive(dir);
    const probe = joinPath(dir, ".ngm-ai-handoff-write-test");
    if (!writeTextFile(probe, "ok")) {
      return false;
    }
    removeFile(probe);
    return true;
  } catch (error) {
    return false;
  }
}

export function resolveLogLocation(outputRoot: string | undefined | null): { logDir: string; logPath: string; fallback: boolean } {
  const preferredRoot = outputRoot ? joinPath(outputRoot, "logs") : null;
  if (preferredRoot && isDirectoryWritable(preferredRoot)) {
    return {
      logDir: preferredRoot,
      logPath: joinPath(preferredRoot, LOG_FILE_NAME),
      fallback: false,
    };
  }

  const fallbackRoot = joinPath(getHomeDir(), "Desktop", "ngm-ai-handoff", "logs");
  ensureDirRecursive(fallbackRoot);
  return {
    logDir: fallbackRoot,
    logPath: joinPath(fallbackRoot, LOG_FILE_NAME),
    fallback: true,
  };
}

export function getFallbackOutputRoot(): string {
  return joinPath(getHomeDir(), "Desktop", "ngm-ai-handoff");
}

function safeSerialize(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  try {
    JSON.stringify(value);
    return value;
  } catch (error) {
    return String(value);
  }
}

function normalizeError(error: unknown): { message: string; stack: string | null } | null {
  if (!error) {
    return null;
  }
  let errorObject = typeof error === "object" ? error as { message?: unknown; stack?: unknown } : null;
  return {
    message: errorObject && errorObject.message ? String(errorObject.message) : String(error),
    stack: errorObject && errorObject.stack ? String(errorObject.stack) : null,
  };
}

export function buildLogEntry(options: {
  time?: string;
  level: string;
  command?: string;
  stage?: string;
  message?: string;
  data?: unknown;
  error?: unknown;
}) {
  return {
    time: options.time || new Date().toISOString(),
    level: options.level,
    command: options.command || "",
    stage: options.stage || "",
    message: options.message || "",
    data: safeSerialize(options.data),
    error: normalizeError(options.error),
  };
}

export function createLogger(options?: {
  outputRoot?: string;
  command?: string;
}) {
  options = options || {};
  const location = resolveLogLocation(options.outputRoot);
  let currentStage = "初始化";
  const command = options.command || "";

  function write(level: string, stage: string | undefined, message: string, data: unknown, error: unknown) {
    if (stage) {
      currentStage = stage;
    }
    const entry = buildLogEntry({
      level: level,
      command: command,
      stage: stage || currentStage,
      message: message,
      data: data || null,
      error: error || null,
    });
    appendTextFile(location.logPath, JSON.stringify(entry) + "\n");
    return entry;
  }

  return {
    command: command,
    logDir: location.logDir,
    logPath: location.logPath,
    fallback: location.fallback,
    setStage: function (stage: string) {
      currentStage = stage || currentStage;
    },
    getStage: function (): string {
      return currentStage;
    },
    info: function (stage: string, message: string, data?: unknown) {
      return write("info", stage, message, data, null);
    },
    warn: function (stage: string, message: string, data?: unknown) {
      return write("warn", stage, message, data, null);
    },
    error: function (stage: string, message: string, error: unknown, data?: unknown) {
      return write("error", stage, message, data, error);
    },
    step: function (stage: string, message: string, data?: unknown) {
      return write("step", stage, message, data, null);
    },
  };
}
