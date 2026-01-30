import * as yaml from "js-yaml";
import {
    applyEdits,
    FormattingOptions,
    modify,
    parse as parseJsonc, printParseErrorCode
} from "jsonc-parser";
import * as fs from "node:fs";
import * as path from "node:path";

import { AppError } from "../../common/errors";
import { ConfigFileReadResult, ConfigFileWriteOptions } from "./config.types";
import { type ConfigCodec } from "./domains";

type PatchOp = { path: (string | number)[]; value: any };

/**
 * 将 {a:{b:1}, c:[...]} 打平成：
 *  - path: ["a","b"] value: 1
 *  - path: ["c"] value: [...]
 *
 * 注意：这里采用“叶子写入”，避免整块覆盖带来额外字段落盘
 */
function flattenPatchToOps(patch: any): PatchOp[] {
    const ops: PatchOp[] = [];
    const walk = (node: any, p: (string | number)[]) => {
        if (node === undefined) return;

        // 数组/原始类型：作为叶子整体写入
        const isObj = node != null && typeof node === "object" && !Array.isArray(node);
        if (!isObj) {
            ops.push({ path: p, value: node });
            return;
        }

        const keys = Object.keys(node);
        // 空对象也要写（例如要创建中间节点时）
        if (keys.length === 0) {
            ops.push({ path: p, value: {} });
            return;
        }

        for (const k of keys) walk(node[k], [...p, k]);
    };

    walk(patch, []);
    // 重要：父路径先于子路径/或反过来都可，但这里按生成顺序即可
    return ops;
}

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

    /**
     * 对 json/jsonc 做增量写回：尽量保留原文件格式（注释/缩进/数组折行等）
     * patch 是“对象形式”的补丁（仅包含要写入的叶子字段/子树）
     */
    patchJsonLike(
        absPath: string,
        codec: ConfigCodec,
        patch: any,
        opts?: { formatting?: FormattingOptions }
    ): void {
        if (codec !== "json" && codec !== "jsonc") {
            throw new AppError("CONFIG_WRITE_FAILED", `patchJsonLike only supports json/jsonc, got: ${codec}`);
        }

        const dir = path.dirname(absPath);
        fs.mkdirSync(dir, { recursive: true });

        const raw = fs.existsSync(absPath) ? fs.readFileSync(absPath, "utf-8") : "{}\n";
        const formatting: FormattingOptions = opts?.formatting ?? {
            insertSpaces: true,
            tabSize: 2,
            eol: "\n",
        };

        // 将 patch 对象打平成 “jsonc-parser modify” edits
        const ops = flattenPatchToOps(patch);

        let nextRaw = raw;
        for (const op of ops) {
            const edits = modify(nextRaw, op.path, op.value, {
                formattingOptions: formatting,
                getInsertionIndex: undefined,
            });
            nextRaw = applyEdits(nextRaw, edits);
        }

        // 原子写
        const tmp = absPath + ".tmp";
        fs.writeFileSync(tmp, nextRaw, "utf-8");
        fs.renameSync(tmp, absPath);
    }
}