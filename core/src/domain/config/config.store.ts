import { parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

import { AppError } from "../../common/errors";
import { ConfigFileReadResult, ConfigFileWriteOptions } from "./config.types";
import { type ConfigCodec } from "./domains";

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

        switch (codec) {
            case "json": {
                const data = JSON.parse(raw);
                return { codec, absPath, relPath, raw, data };
            }
            case "jsonc": {
                const errors: any[] = [];
                const data = parseJsonc(raw, errors, { allowTrailingComma: true });
                if (errors.length > 0) {
                    // 把错误变成可读 message
                    const first = errors[0];
                    const code = printParseErrorCode(first.error);
                    throw new AppError('CONFIG_READ_FAILED', `读取 JSONC 配置失败：${code} at offset ${first.offset}`, { absPath, error: first });
                }
                return { codec, raw, data, relPath, absPath };
            }

            case "yaml": {
                const data = yaml.load(raw);
                return { codec, raw, data, relPath, absPath };
            }
            default:
                return { codec, absPath, relPath, raw };
        }
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

        if (codec === "json" || codec === "jsonc") {
            // JSONC 写入时不保留注释和格式
            const pretty = opts.format === "pretty";
            const obj = typeof next === "string" ? JSON.parse(next) : next;
            content = pretty ? JSON.stringify(obj, null, 2) + "\n" : JSON.stringify(next);
        }
        // YAML 写入
        else if (codec === "yaml") {
            const obj = typeof next === "string" ? yaml.load(next) : next;
            content = yaml.dump(obj, {
                indent: 2,
                lineWidth: 120,
                noRefs: true,
            });
        }
        // Raw 写入
        else {
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