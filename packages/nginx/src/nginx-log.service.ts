import { EventEmitter } from 'events';
import { createReadStream, FSWatcher, watch } from 'fs';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { NginxService } from './nginx.service';

export type NginxLogType = 'error' | 'access';

export interface NginxLogEntry {
    type: NginxLogType;
    line: string;
    timestamp: number;
}

/**
 * Nginx 日志服务
 * 负责读取和监听 Nginx 日志文件
 */
export class NginxLogService extends EventEmitter {
    private watchers: Map<NginxLogType, FSWatcher> = new Map();
    private filePositions: Map<NginxLogType, number> = new Map();

    constructor(private nginxService: NginxService) {
        super();
    }

    /**
     * 获取日志文件路径
     */
    getLogFilePath(type: NginxLogType): string | null {
        const instance = this.nginxService.getInstance();
        if (!instance) return null;

        // 默认日志路径，可通过设置覆盖
        const logDir = join(instance.prefixPath, 'logs');
        return join(logDir, `${type}.log`);
    }

    /**
     * 读取日志尾部
     */
    async readLogTail(type: NginxLogType, lines: number = 100): Promise<string[]> {
        const filePath = this.getLogFilePath(type);
        if (!filePath) return [];

        try {
            const content = await readFile(filePath, 'utf-8');
            const allLines = content.split(/\r?\n/).filter(line => line.trim());
            return allLines.slice(-lines);
        } catch {
            return [];
        }
    }

    /**
     * 开始监听日志文件
     */
    startWatching(type: NginxLogType): void {
        if (this.watchers.has(type)) return;

        const filePath = this.getLogFilePath(type);
        if (!filePath) return;

        // 记录当前文件位置
        this.recordPosition(type, filePath);

        try {
            const watcher = watch(filePath, async (eventType) => {
                if (eventType === 'change') {
                    await this.handleFileChange(type, filePath);
                }
            });

            watcher.on('error', (err) => {
                this.emit('error', { type, error: err });
            });

            this.watchers.set(type, watcher);
        } catch (err) {
            this.emit('error', { type, error: err });
        }
    }

    /**
     * 停止监听日志文件
     */
    stopWatching(type: NginxLogType): void {
        const watcher = this.watchers.get(type);
        if (watcher) {
            watcher.close();
            this.watchers.delete(type);
            this.filePositions.delete(type);
        }
    }

    /**
     * 停止所有监听
     */
    stopAll(): void {
        for (const type of this.watchers.keys()) {
            this.stopWatching(type);
        }
    }

    private async recordPosition(type: NginxLogType, filePath: string): Promise<void> {
        try {
            const stats = await stat(filePath);
            this.filePositions.set(type, stats.size);
        } catch {
            this.filePositions.set(type, 0);
        }
    }

    private async handleFileChange(type: NginxLogType, filePath: string): Promise<void> {
        try {
            const stats = await stat(filePath);
            const lastPos = this.filePositions.get(type) ?? 0;
            const currentSize = stats.size;

            if (currentSize <= lastPos) {
                // 文件被截断或轮转，重新从头开始
                this.filePositions.set(type, 0);
                return;
            }

            // 读取新增内容
            const stream = createReadStream(filePath, {
                start: lastPos,
                encoding: 'utf-8'
            });

            let buffer = '';
            stream.on('data', (chunk: string) => {
                buffer += chunk;
            });

            stream.on('end', () => {
                const newLines = buffer.split(/\r?\n/).filter(line => line.trim());
                for (const line of newLines) {
                    this.emit('log', {
                        type,
                        line,
                        timestamp: Date.now()
                    } as NginxLogEntry);
                }
                this.filePositions.set(type, currentSize);
            });

            stream.on('error', (err) => {
                this.emit('error', { type, error: err });
            });
        } catch (err) {
            this.emit('error', { type, error: err });
        }
    }
}
