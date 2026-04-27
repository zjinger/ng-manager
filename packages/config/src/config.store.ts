import * as yaml from "js-yaml";
import {
    applyEdits,
    FormattingOptions,
    modify,
    parse as parseJsonc, printParseErrorCode
} from "jsonc-parser";
import * as fs from "node:fs";
import * as path from "node:path";

import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { ConfigFileReadResult, ConfigFileWriteOptions } from "./config.types";
import { type ConfigCodec } from "./domains";

type PatchOp = { path: (string | number)[]; value: any };

function flattenPatchToOps(patch: any): PatchOp[] {
    const ops: PatchOp[] = [];
    const walk = (node: any, p: (string | number)[]) => {
        if (node === undefined) return;

        const isObj = node != null && typeof node === "object" && !Array.isArray(node);
        if (!isObj) {
            ops.push({ path: p, value: node });
            return;
        }

        const keys = Object.keys(node);
        if (keys.length === 0) {
            ops.push({ path: p, value: {} });
            return;
        }

        for (const k of keys) walk(node[k], [...p, k]);
    };

    walk(patch, []);
    return ops;
}

export class ConfigDocumentStore {
    read(absPath: string, codec: ConfigCodec): ConfigFileReadResult {
        const raw = fs.readFileSync(absPath, "utf-8");
        const relPath = path.basename(absPath);

        switch (codec) {
            case "json": {
                const data = JSON.parse(raw);
                return { codec, absPath, relPath, raw, data };
            }
            case "jsonc": {
                const errors: any[] = [];
                const data = parseJsonc(raw, errors, { allowTrailingComma: true });
                if (errors.length > 0) {
                    const first = errors[0];
                    const code = printParseErrorCode(first.error);
                    throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `读取 JSONC 配置失败：${code} at offset ${first.offset}`, { absPath, error: first });
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

    write(absPath: string, codec: ConfigCodec, next: unknown, opts: ConfigFileWriteOptions = {}): void {
        const dir = path.dirname(absPath);
        fs.mkdirSync(dir, { recursive: true });
        let content: string;

        if (codec === "json" || codec === "jsonc") {
            const pretty = opts.format === "pretty";
            const obj = typeof next === "string" ? JSON.parse(next) : next;
            content = pretty ? JSON.stringify(obj, null, 2) + "\n" : JSON.stringify(next);
        }
        else if (codec === "yaml") {
            const obj = typeof next === "string" ? yaml.load(next) : next;
            content = yaml.dump(obj, {
                indent: 2,
                lineWidth: 120,
                noRefs: true,
            });
        }
        else {
            if (typeof next !== "string") {
                throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `写入 ${codec} 配置时内容必须为字符串`);
            }
            content = next;
        }

        const tmp = absPath + ".tmp";
        fs.writeFileSync(tmp, content, "utf-8");
        fs.renameSync(tmp, absPath);
    }

    patchJsonLike(
        absPath: string,
        codec: ConfigCodec,
        patch: any,
        opts?: { formatting?: FormattingOptions }
    ): void {
        if (codec !== "json" && codec !== "jsonc") {
            throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `patchJsonLike only supports json/jsonc, got: ${codec}`);
        }

        const dir = path.dirname(absPath);
        fs.mkdirSync(dir, { recursive: true });

        const raw = fs.existsSync(absPath) ? fs.readFileSync(absPath, "utf-8") : "{}\n";
        const formatting: FormattingOptions = opts?.formatting ?? {
            insertSpaces: true,
            tabSize: 2,
            eol: "\n",
        };

        const ops = flattenPatchToOps(patch);

        let nextRaw = raw;
        for (const op of ops) {
            const edits = modify(nextRaw, op.path, op.value, {
                formattingOptions: formatting,
                getInsertionIndex: undefined,
            });
            nextRaw = applyEdits(nextRaw, edits);
        }

        const tmp = absPath + ".tmp";
        fs.writeFileSync(tmp, nextRaw, "utf-8");
        fs.renameSync(tmp, absPath);
    }
}
