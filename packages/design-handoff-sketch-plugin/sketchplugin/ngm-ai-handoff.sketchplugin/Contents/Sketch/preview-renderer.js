var HIT_LAYER_ROLES = {
    navigation: 1,
    sidebar: 1,
    toolbar: 1,
    menu: 1,
    button: 1,
    input: 1,
    select: 1,
    form: 1,
    table: 1,
    list: 1,
    card: 1,
    modal: 1,
    drawer: 1,
    tabs: 1,
    breadcrumb: 1,
    chart: 1,
    text: 1,
};
function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function num(value) {
    var n = Number(value);
    return isFinite(n) ? String(n) : "0";
}
function buildHitBox(handoffId, layerId, artboardId, type, name, frame) {
    var f = frame || {};
    return ('<div class="ngm-handoff-hit"' +
        ' data-handoff-id="' + escapeHtml(handoffId) + '"' +
        ' data-layer-id="' + escapeHtml(layerId) + '"' +
        ' data-artboard-id="' + escapeHtml(artboardId || "") + '"' +
        ' data-handoff-type="' + escapeHtml(type) + '"' +
        ' data-handoff-name="' + escapeHtml(name) + '"' +
        ' style="left:' + num(f.x) + 'px;top:' + num(f.y) + 'px;width:' + num(f.width) + 'px;height:' + num(f.height) + 'px"' +
        "></div>");
}
function generatePreviewHtml(meta, layerTree, components, screenshot) {
    var stage = (layerTree && (layerTree.absoluteFrame || layerTree.frame)) || { width: 0, height: 0 };
    var width = num(stage.width);
    var height = num(stage.height);
    var boxes = [];
    function visit(node) {
        if (!node) {
            return;
        }
        if (node.role && HIT_LAYER_ROLES[node.role]) {
            boxes.push(buildHitBox(node.handoffId || node.id, node.id, node.artboardId, "layer", node.name, node.absoluteFrame || node.frame));
        }
        if (node.children && node.children.length > 0) {
            node.children.forEach(visit);
        }
    }
    visit(layerTree);
    (components || []).forEach(function (cmp) {
        boxes.push(buildHitBox(cmp.handoffId, cmp.layerId, cmp.artboardId, "component", cmp.name, cmp.absoluteFrame || cmp.frame));
    });
    var imgTag = screenshot
        ? '<img src="screenshot.png" alt="' + escapeHtml(meta && meta.artboardName) + '" width="' + width + '" height="' + height + '">'
        : '<div style="width:' + width + 'px;height:' + height + 'px;background:#fafafa;border:1px dashed #ccc;"></div>';
    var title = "NGM Handoff Preview - " + (meta && meta.artboardName ? meta.artboardName : "Artboard");
    return [
        "<!DOCTYPE html>",
        '<html lang="zh">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>" + escapeHtml(title) + "</title>",
        "<style>",
        '  body { margin:0; background:#f5f5f5; font-family: -apple-system, "PingFang SC", sans-serif; }',
        "  .ngm-preview-tip { padding:8px 12px; color:#666; font-size:12px; background:#fff; border-bottom:1px solid #eee; }",
        "  .ngm-preview-stage { position: relative; margin: 0 auto; }",
        "  .ngm-preview-stage img { display:block; }",
        "  .ngm-handoff-hit { position:absolute; cursor:pointer; box-sizing:border-box; }",
        "  .ngm-handoff-hit:hover { outline:1px dashed rgba(59,130,246,0.6); outline-offset:-1px; }",
        '  [data-ngm-handoff-selected="true"] { outline:2px solid #3b82f6 !important; outline-offset:2px !important; box-shadow:0 0 0 4px rgba(59,130,246,0.2) !important; }',
        "</style>",
        "</head>",
        "<body>",
        '<div class="ngm-preview-tip">NGM Design Handoff Preview · 点击节点联动 Handoff 面板</div>',
        '<div class="ngm-preview-stage" style="width:' + width + 'px;height:' + height + 'px;">',
        "  " + imgTag,
        "  " + boxes.join("\n  "),
        "</div>",
        '<script src="interaction-bridge.js"></script>',
        "</body>",
        "</html>",
        "",
    ].join("\n");
}
module.exports = {
    generatePreviewHtml: generatePreviewHtml,
};
