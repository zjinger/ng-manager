function generatePrompt(meta, assetsMap) {
  var screenshotLine = assetsMap && assetsMap.screenshot
    ? "- screenshot.png：视觉参考（仅对照，不可作为实现依据）"
    : "- screenshot.png：（本次未导出）";

  return [
    "你是 ng-manager2.0 前端开发 Agent。",
    "",
    "请基于当前 ai-handoff 包实现页面。",
    "",
    "页面：" + (meta ? meta.artboardName : ""),
    "来源文档：" + (meta ? meta.documentName : ""),
    "",
    "## 优先输入",
    "",
    "- design-context.md：编码主入口，优先阅读",
    "- components.json：组件识别与实现建议",
    "- tokens.json：设计 Token",
    "- assets-map.json：资源映射",
    screenshotLine,
    "",
    "## 实现要求",
    "",
    "1. 禁止直接复制 preview.html 的 DOM 结构",
    "2. 禁止使用大规模绝对定位实现业务页面",
    "3. 使用 Angular + NG-ZORRO 组件化实现",
    "4. 优先还原页面结构与语义，而非像素级还原",
    "5. screenshot.png 仅作视觉参考，不作为实现依据",
    "6. components.json / tokens.json / assets-map.json 是结构化参考",
    "7. preview.html 仅供人在 iframe 中查看，不要复制其 DOM",
    "",
    "## 参考结构化文件",
    "",
    "- layer-tree.json：图层树（含 handoffId / absoluteFrame）",
    "- texts.json：可见文本",
    "- styles.json：样式详情",
    "- handoff-map.json：DOM 与 Handoff 节点映射",
    "",
  ].join("\n");
}

module.exports = {
  generatePrompt: generatePrompt,
};
