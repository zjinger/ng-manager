import * as fs from "node:fs";
import * as path from "node:path";

import { ConfigCodec, ConfigFileReadResult, ConfigFileWriteOptions } from "./config.types";
import { AppError } from "../../common/errors";

export class ConfigDocumentStore {

    /**
     * 读取配置文件
     * @param absPath 绝对路径
     * @param codec 编码格式
     * @returns 读取结果
     */
    read(absPath: string, codec: ConfigCodec): ConfigFileReadResult {
        const raw = fs.readFileSync(absPath, "utf-8");
        const relPath = path.basename(absPath); // 仅用于回显；上层可覆盖为真实 relPath

        if (codec === "json") {
            const data = JSON.parse(raw);
            return { codec, absPath, relPath, raw, data };
        }

        // MVP：jsonc/yaml 先不解析，避免引入依赖；UI 可走 raw editor
        return { codec, absPath, relPath, raw };
    }

    /**
     * 写入配置文件
     * @param absPath 绝对路径
     * @param codec 编码格式
     * @param next 写入内容
     * @param opts ConfigFileWriteOptions 选项
     * @throws AppError
     * @returns void
     */
    write(absPath: string, codec: ConfigCodec, next: unknown, opts: ConfigFileWriteOptions = {}): void {
        const dir = path.dirname(absPath);
        fs.mkdirSync(dir, { recursive: true });

        let content: string;

        if (codec === "json") {
            const format = opts.format ?? "pretty";
            content = format === "pretty" ? JSON.stringify(next, null, 2) + "\n" : JSON.stringify(next);
        } else {
            // raw / jsonc / yaml：上层直接传 string
            if (typeof next !== "string") {
                throw new AppError('CONFIG_WRITE_FAILED', `写入 ${codec} 配置时内容必须为字符串`);
            }
            content = next;
        }

        // 原子写：write tmp + rename
        const tmp = absPath + ".tmp";
        fs.writeFileSync(tmp, content, "utf-8");
        fs.renameSync(tmp, absPath);
    }
}