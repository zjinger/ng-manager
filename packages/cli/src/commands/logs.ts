import fs from "fs";
import path from "path";
import { getLocalServerDataDir } from "@yinuo-ngm/runtime";
import { readLock } from "./lock";

type LogsOptions = {
    err?: boolean;
    follow?: boolean;
    lines?: number;
    dataDir?: string;
};

type LogsDeps = {
    readLock: typeof readLock;
    getLocalServerDataDir: typeof getLocalServerDataDir;
    log: (line: string) => void;
};

export function createLogsCmd(deps: LogsDeps = defaultLogsDeps) {
    return async function logsCmd(opts: LogsOptions): Promise<void> {
        // 优先从 lock 获取 logDir，fallback 到默认 dataDir
        const lock = deps.readLock();
        let logDir: string;
        
        if (lock?.logDir) {
            logDir = lock.logDir;
        } else {
            const dataDir = opts.dataDir || deps.getLocalServerDataDir();
            logDir = path.join(dataDir, 'logs');
        }

        const logFile = opts.err
            ? path.join(logDir, 'server.err.log')
            : path.join(logDir, 'server.out.log');

        // 检查文件是否存在
        try {
            await fs.promises.access(logFile);
        } catch {
            deps.log(`Log file not found: ${logFile}`);
            deps.log('Server may not have been started yet.');
            return;
        }

        if (opts.follow) {
            await followLogs(logFile, deps.log);
        } else {
            await showLastLines(logFile, opts.lines || 100, deps.log);
        }
    };
}

async function showLastLines(file: string, lines: number, log: (line: string) => void): Promise<void> {
    const text = await fs.promises.readFile(file, 'utf8');
    const allLines = text.split(/\r?\n/);
    const lastLines = allLines.slice(-lines);
    log(lastLines.join('\n'));
}

async function followLogs(file: string, log: (line: string) => void): Promise<void> {
    // 先显示最后 10 行
    await showLastLines(file, 10, log);
    
    log('\n--- Following logs (Ctrl+C to exit) ---\n');

    // 使用 fs.watch 监听文件变化
    let position = (await fs.promises.stat(file)).size;

    const watcher = fs.watch(file, async (eventType) => {
        if (eventType === 'change') {
            try {
                const stats = await fs.promises.stat(file);
                if (stats.size > position) {
                    const stream = fs.createReadStream(file, {
                        start: position,
                        encoding: 'utf8',
                    });
                    
                    let buffer = '';
                    stream.on('data', (chunk) => {
                        buffer += chunk;
                    });
                    
                    stream.on('end', () => {
                        if (buffer) {
                            log(buffer.replace(/\n$/, ''));
                        }
                        position = stats.size;
                    });
                } else if (stats.size < position) {
                    // 文件被截断或轮转
                    position = 0;
                    log('\n--- Log file rotated ---\n');
                }
            } catch (err) {
                // 忽略读取错误
            }
        }
    });

    // 处理 Ctrl+C
    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });

    // 保持进程运行
    await new Promise(() => {});
}

const defaultLogsDeps: LogsDeps = {
    readLock,
    getLocalServerDataDir,
    log: (line) => console.log(line),
};

export const logsCmd = createLogsCmd();
