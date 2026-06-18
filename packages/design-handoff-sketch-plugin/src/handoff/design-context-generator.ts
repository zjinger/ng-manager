function str(value) {
  return value == null ? "" : String(value);
}

function num(value) {
  return value == null ? "" : String(value);
}

function eachEntry(obj, fn) {
  if (!obj) {
    return;
  }
  Object.keys(obj).forEach(function (key) {
    fn(key, obj[key]);
  });
}

function frameSize(node) {
  let f = (node && (node.absoluteFrame || node.frame)) || {};
  return { width: f.width || 0, height: f.height || 0 };
}

function generateDesignContext(meta, layerTree, components, texts, tokens, assetsMap) {
  let lines = [];
  let size = frameSize(layerTree);

  lines.push("# Design Context");
  lines.push("");
  lines.push("> 本文件是 AI 编码的主入口。AI 应优先阅读本文件，再参考 components.json / tokens.json / assets-map.json / screenshot.png。");
  lines.push("");
  lines.push("## 1. 基本信息");
  lines.push("");
  lines.push("- 页面名称：" + str(meta && meta.pageName));
  lines.push("- 画板名称：" + str(meta && meta.artboardName));
  lines.push("- 来源文档：" + str(meta && meta.documentName));
  lines.push("- 导出时间：" + str(meta && meta.exportedAt));
  lines.push("- 插件版本：" + str(meta && meta.pluginVersion));
  if (meta && meta.handoffSpecVersion) {
    lines.push("- Handoff 规范版本：" + str(meta.handoffSpecVersion));
  }
  lines.push("");
  lines.push("## 2. 页面结构摘要");
  lines.push("");
  lines.push("画板尺寸：" + size.width + " x " + size.height + " px。");
  lines.push("顶层结构：");
  if (layerTree && layerTree.children && layerTree.children.length > 0) {
    layerTree.children.forEach(function (child) {
      lines.push("- " + str(child.name) + "（" + str(child.role || child.type) + "）");
    });
  } else {
    lines.push("（无子图层）");
  }
  lines.push("");
  lines.push("## 3. 组件清单");
  lines.push("");
  if (!components || components.length === 0) {
    lines.push("（未识别到组件）");
  } else {
    lines.push("| 组件 | 类型 | 置信度 | 建议实现 |");
    lines.push("|---|---|---|---|");
    components.forEach(function (cmp) {
      let hint = cmp.implementationHint || {};
      lines.push(
        "| " + str(cmp.name) + " | " + str(cmp.inferredType) + " | " + num(cmp.confidence) + " | " + str(hint.angularComponentName) + " |",
      );
    });
  }
  lines.push("");
  lines.push("## 4. 文本摘要");
  lines.push("");
  if (!texts || texts.length === 0) {
    lines.push("（无文本）");
  } else {
    texts.slice(0, 50).forEach(function (t) {
      lines.push("- " + str(t.text));
    });
    if (texts.length > 50) {
      lines.push("（共 " + texts.length + " 条文本，此处仅列前 50 条）");
    }
  }
  lines.push("");
  lines.push("## 5. 设计 Tokens");
  lines.push("");
  lines.push("颜色：");
  eachEntry(tokens && tokens.colors, function (key, value) {
    lines.push("- " + key + ": " + str(value));
  });
  lines.push("");
  lines.push("字号：");
  eachEntry(tokens && tokens.fontSize, function (key, value) {
    lines.push("- " + key + ": " + num(value) + "px");
  });
  lines.push("");
  lines.push("圆角：");
  eachEntry(tokens && tokens.radius, function (key, value) {
    lines.push("- " + key + ": " + num(value) + "px");
  });
  lines.push("");
  lines.push("## 6. 资源说明");
  lines.push("");
  if (assetsMap && assetsMap.screenshot) {
    lines.push("- screenshot：" + str(assetsMap.screenshot));
  }
  if (assetsMap && assetsMap.assets) {
    assetsMap.assets.forEach(function (a) {
      lines.push("- " + str(a.type) + "：" + str(a.name) + " -> " + str(a.path));
    });
  }
  lines.push("");
  lines.push("## 7. Angular 实现建议");
  lines.push("");
  lines.push("- 使用 Angular + NG-ZORRO 组件化实现。");
  lines.push("- 按组件清单拆分 Angular 组件，复用建议的 NG-ZORRO 组件。");
  lines.push("- 颜色 / 字号 / 圆角使用 tokens.json，优先映射为目标项目主题变量。");
  lines.push("- 资源引用 assets-map.json 中的路径。");
  lines.push("");
  lines.push("## 8. AI 实现约束");
  lines.push("");
  lines.push("- 禁止直接复制 preview.html 的 DOM 结构。");
  lines.push("- 禁止使用大规模绝对定位实现业务页面。");
  lines.push("- 必须使用语义化、组件化的 Angular 实现。");
  lines.push("- screenshot.png 仅作为视觉参考，不是实现依据。");
  lines.push("- components.json / tokens.json / assets-map.json 是结构化参考。");
  lines.push("");
  lines.push("## 9. 已知问题");
  lines.push("");
  if (assetsMap && assetsMap.warnings && assetsMap.warnings.length > 0) {
    assetsMap.warnings.forEach(function (w) {
      lines.push("- " + str(w));
    });
  } else {
    lines.push("（暂无）");
  }
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  generateDesignContext: generateDesignContext,
};

export {};
