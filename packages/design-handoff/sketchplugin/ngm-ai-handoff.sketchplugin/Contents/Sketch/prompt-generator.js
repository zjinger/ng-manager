function generatePrompt(meta, assetsMap) {
  var screenshotLine = assetsMap && assetsMap.screenshot
    ? "- screenshot.png"
    : "- screenshot.png (optional; export failed or was not available)";

  return [
    "你是 ng-manager2.0 前端开发 Agent。",
    "",
    "请根据当前 ai-handoff 包实现页面。",
    "",
    "页面：" + meta.artboardName,
    "来源文档：" + meta.documentName,
    "",
    "要求：",
    "",
    "1. 不允许复制 Sketch 导出的 DOM",
    "2. 使用 Angular + NG-ZORRO 实现",
    "3. 优先还原页面结构",
    "4. 保持组件语义化",
    "5. 使用 screenshot.png 作为视觉参考",
    "6. 使用 components.json 作为组件参考",
    "7. 使用 tokens.json 作为设计规范",
    "",
    "输入文件：",
    "",
    "- layer-tree.json",
    "- texts.json",
    "- styles.json",
    "- tokens.json",
    "- components.json",
    screenshotLine,
    "",
  ].join("\n");
}

module.exports = {
  generatePrompt: generatePrompt,
};
