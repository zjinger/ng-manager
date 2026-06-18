// @ts-nocheck
var LOG_FILE_NAME = "ngm-ai-handoff.log";
var UTF8_ENCODING = typeof NSUTF8StringEncoding !== "undefined" ? NSUTF8StringEncoding : 4;

function tryRequire(name) {
  try {
    return require(name);
  } catch (error) {
    return null;
  }
}

var nodeFs = tryRequire("fs");
var nodeOs = tryRequire("os");

function joinPath() {
  var parts = Array.prototype.slice.call(arguments).filter(function (part) {
    return part !== null && part !== undefined && String(part).length > 0;
  });

  return parts
    .map(function (part, index) {
      var value = String(part);
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

function ensureDirRecursive(dir) {
  var fileManager = getFileManager();
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

function fileExists(path) {
  var fileManager = getFileManager();
  if (fileManager) {
    return Boolean(fileManager.fileExistsAtPath(String(path)));
  }
  return nodeFs ? nodeFs.existsSync(String(path)) : false;
}

function removeFile(path) {
  var fileManager = getFileManager();
  if (fileManager) {
    fileManager.removeItemAtPath_error(String(path), null);
    return;
  }
  if (nodeFs && nodeFs.existsSync(String(path))) {
    nodeFs.rmSync(String(path), { force: true });
  }
}

function writeTextFile(path, text) {
  var fileManager = getFileManager();
  if (fileManager && typeof NSString !== "undefined") {
    var value = NSString.stringWithString(String(text));
    return Boolean(value.writeToFile_atomically_encoding_error(String(path), true, UTF8_ENCODING, null));
  }
  if (nodeFs) {
    nodeFs.writeFileSync(String(path), String(text), "utf8");
    return true;
  }
  return false;
}

function appendTextFile(path, text) {
  var fileManager = getFileManager();
  if (fileManager && typeof NSString !== "undefined") {
    if (!fileExists(path)) {
      return writeTextFile(path, text);
    }
    try {
      var handle = NSFileHandle.fileHandleForWritingAtPath(String(path));
      handle.seekToEndOfFile();
      var data = NSString.stringWithString(String(text)).dataUsingEncoding(UTF8_ENCODING);
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

function writeJsonFile(dir, fileName, value) {
  ensureDirRecursive(dir);
  return writeTextFile(joinPath(dir, fileName), JSON.stringify(value, null, 2) + "\n");
}

function isDirectoryWritable(dir) {
  try {
    ensureDirRecursive(dir);
    var probe = joinPath(dir, ".ngm-ai-handoff-write-test");
    if (!writeTextFile(probe, "ok")) {
      return false;
    }
    removeFile(probe);
    return true;
  } catch (error) {
    return false;
  }
}

function resolveLogLocation(outputRoot) {
  var preferredRoot = outputRoot ? joinPath(outputRoot, "logs") : null;
  if (preferredRoot && isDirectoryWritable(preferredRoot)) {
    return {
      logDir: preferredRoot,
      logPath: joinPath(preferredRoot, LOG_FILE_NAME),
      fallback: false,
    };
  }

  var fallbackRoot = joinPath(getHomeDir(), "Desktop", "ngm-ai-handoff", "logs");
  ensureDirRecursive(fallbackRoot);
  return {
    logDir: fallbackRoot,
    logPath: joinPath(fallbackRoot, LOG_FILE_NAME),
    fallback: true,
  };
}

function getFallbackOutputRoot() {
  return joinPath(getHomeDir(), "Desktop", "ngm-ai-handoff");
}

function safeSerialize(value) {
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

function normalizeError(error) {
  if (!error) {
    return null;
  }
  return {
    message: error && error.message ? String(error.message) : String(error),
    stack: error && error.stack ? String(error.stack) : null,
  };
}

function buildLogEntry(options) {
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

function createLogger(options) {
  options = options || {};
  var location = resolveLogLocation(options.outputRoot);
  var currentStage = "初始化";
  var command = options.command || "";

  function write(level, stage, message, data, error) {
    if (stage) {
      currentStage = stage;
    }
    var entry = buildLogEntry({
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
    setStage: function (stage) {
      currentStage = stage || currentStage;
    },
    getStage: function () {
      return currentStage;
    },
    info: function (stage, message, data) {
      return write("info", stage, message, data, null);
    },
    warn: function (stage, message, data) {
      return write("warn", stage, message, data, null);
    },
    error: function (stage, message, error, data) {
      return write("error", stage, message, data, error);
    },
    step: function (stage, message, data) {
      return write("step", stage, message, data, null);
    },
  };
}

module.exports = {
  LOG_FILE_NAME: LOG_FILE_NAME,
  appendTextFile: appendTextFile,
  buildLogEntry: buildLogEntry,
  createLogger: createLogger,
  ensureDirRecursive: ensureDirRecursive,
  fileExists: fileExists,
  getFallbackOutputRoot: getFallbackOutputRoot,
  isDirectoryWritable: isDirectoryWritable,
  joinPath: joinPath,
  resolveLogLocation: resolveLogLocation,
  writeJsonFile: writeJsonFile,
  writeTextFile: writeTextFile,
};
