import { generateAgentPrompt } from "../prompt";
import { HandoffAgentContext, HandoffPackage } from "../schema";

export function generateAgentContext(handoff: HandoffPackage): HandoffAgentContext {
  return {
    source: "ngm-ai-handoff",
    generatedAt: new Date().toISOString(),
    packageDir: handoff.packageDir,
    summary: {
      documentName: handoff.meta.documentName,
      pageName: handoff.meta.pageName,
      artboardName: handoff.meta.artboardName,
      textCount: handoff.texts.length,
      componentCount: handoff.components.length,
    },
    files: {
      meta: "meta.json",
      layerTree: "layer-tree.json",
      texts: "texts.json",
      styles: "styles.json",
      tokens: "tokens.json",
      components: "components.json",
      assetsMap: "assets-map.json",
      screenshot: handoff.assetsMap.screenshot,
      prompt: "agent-prompt.md",
    },
    prompt: handoff.agentPrompt || generateAgentPrompt(handoff),
    handoff,
  };
}
