import { HandoffPackage } from "../schema";

export interface AngularNgZorroContext {
  framework: "angular";
  uiLibrary: "ng-zorro";
  artboardName: string;
  tokensFile: "tokens.json";
  componentsFile: "components.json";
  layerTreeFile: "layer-tree.json";
}

export function createAngularNgZorroContext(
  handoff: HandoffPackage,
): AngularNgZorroContext {
  return {
    framework: "angular",
    uiLibrary: "ng-zorro",
    artboardName: handoff.meta.artboardName,
    tokensFile: "tokens.json",
    componentsFile: "components.json",
    layerTreeFile: "layer-tree.json",
  };
}
