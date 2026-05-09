import { dirname } from "node:path";
import { writeFile } from "node:fs/promises";
import { ensureDir } from "./ensure-dir";
import { fileExists } from "./file-exists";
import { readTextFile } from "./read-text-file";

export interface WriteTextFileOptions {
  encoding?: BufferEncoding;
  ensureDir?: boolean;
  newline?: boolean;
}

export interface WriteTextFileResult {
  filePath: string;
  changed: boolean;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeContent(content: string, newline: boolean): string {
  if (!newline) {
    return content;
  }

  return content.endsWith("\n") ? content : `${content}\n`;
}

export async function writeTextFile(
  filePath: string,
  content: string,
  options: WriteTextFileOptions = {}
): Promise<WriteTextFileResult> {
  const { encoding = "utf8", ensureDir: needEnsureDir = false, newline = false } = options;
  const normalizedContent = normalizeContent(content, newline);

  try {
    const exists = await fileExists(filePath);
    const currentContent = await readTextFile(filePath, {
      encoding,
      allowMissing: true,
      defaultValue: ""
    });

    if (exists && currentContent === normalizedContent) {
      return {
        filePath,
        changed: false
      };
    }

    if (needEnsureDir) {
      await ensureDir(dirname(filePath));
    }

    await writeFile(filePath, normalizedContent, { encoding });

    return {
      filePath,
      changed: true
    };
  } catch (error) {
    throw new Error(`Failed to write text file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
