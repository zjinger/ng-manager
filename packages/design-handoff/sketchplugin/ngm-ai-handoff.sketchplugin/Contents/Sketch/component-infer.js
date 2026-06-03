var RULES = [
  { type: "button", confidence: 0.88, patterns: [/button/i, /\bbtn\b/i, /按钮/] },
  { type: "input", confidence: 0.84, patterns: [/input/i, /search/i, /输入框/] },
  { type: "table", confidence: 0.86, patterns: [/table/i, /表格/] },
  { type: "card", confidence: 0.82, patterns: [/card/i, /卡片/] },
  { type: "modal", confidence: 0.84, patterns: [/dialog/i, /modal/i, /弹窗/] },
  { type: "drawer", confidence: 0.84, patterns: [/drawer/i, /抽屉/] },
];

function inferComponent(node) {
  var target = [node.name || "", node.text || ""].join(" ");

  for (var i = 0; i < RULES.length; i += 1) {
    var rule = RULES[i];
    for (var j = 0; j < rule.patterns.length; j += 1) {
      if (rule.patterns[j].test(target)) {
        return {
          type: rule.type,
          confidence: rule.confidence,
        };
      }
    }
  }

  return null;
}

function collectNodeText(node) {
  if (node.text) {
    return node.text;
  }

  for (var i = 0; i < node.children.length; i += 1) {
    var text = collectNodeText(node.children[i]);
    if (text) {
      return text;
    }
  }

  return null;
}

function inferComponents(layerTree) {
  var components = [];
  var count = 0;

  function visit(node) {
    var inferred = inferComponent(node);
    if (inferred) {
      count += 1;
      components.push({
        id: "cmp_" + String(count).padStart(3, "0"),
        name: node.name,
        inferredType: inferred.type,
        confidence: inferred.confidence,
        frame: node.frame,
        text: collectNodeText(node),
      });
    }

    node.children.forEach(visit);
  }

  visit(layerTree);
  return components;
}

module.exports = {
  inferComponent: inferComponent,
  inferComponents: inferComponents,
};
