import { readTextFile } from "@yinuo-ngm/shared";
import type { ViteConfigViewModel } from "./vite.viewmodel";
import { resolveProjectFile } from "../../utils/config-path";

export async function readViteConfig(input: {
  projectRoot: string;
  filePath: string;
}): Promise<{ content: string; viewModel: ViteConfigViewModel }> {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const content = await readTextFile(absPath);

  return {
    content,
    viewModel: {
      filePath: input.filePath,
      content,
      readonly: true,
      supportedFields: [
        { key: "base", label: "base", status: "readonly" },
        { key: "server.host", label: "server.host", status: "readonly" },
        { key: "server.port", label: "server.port", status: "readonly" },
        { key: "server.proxy", label: "server.proxy", status: "readonly" },
        { key: "resolve.alias", label: "resolve.alias", status: "readonly" },
        { key: "build.outDir", label: "build.outDir", status: "readonly" }
      ]
    }
  };
}
