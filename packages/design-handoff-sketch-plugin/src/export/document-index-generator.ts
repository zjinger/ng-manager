// @ts-nocheck
// 文档级索引生成器。
// 输出 handoff-index.json 与可选 index.html，记录文档/页面/画板导出结果。
// 路径信息均为相对 outputRoot 的路径，便于跨平台迁移。

function pad3(value) {
  var n = Number(value) || 0;
  var s = String(n);
  while (s.length < 3) {
    s = "0" + s;
  }
  return s;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// records: 由导出器产出的扁平画板结果
// [{ pageIndex, pageName, artboardIndex, shortId, artboardName, packageDir,
//    screenshotPath, previewHtmlPath, status, reason }]
function buildIndexObject(options) {
  var records = options.records || [];
  var pagesMap = {};
  var orderedPageKeys = [];
  var artboards = [];

  records.forEach(function (record) {
    var pageKey = "page-" + pad3(record.pageIndex + 1) + "__" + record.pageId;
    if (!pagesMap[pageKey]) {
      pagesMap[pageKey] = {
        index: pad3(record.pageIndex + 1),
        pageId: record.pageId,
        pageName: record.pageName,
        artboards: [],
      };
      orderedPageKeys.push(pageKey);
    }

    var abEntry = {
      index: pad3(record.artboardIndex + 1),
      shortId: record.shortId,
      name: record.artboardName,
      packageDir: record.packageDir,
      screenshot: record.screenshotPath,
      previewHtml: record.previewHtmlPath,
      status: record.status,
      reason: record.reason || null,
    };

    pagesMap[pageKey].artboards.push(abEntry);
    artboards.push(abEntry);
  });

  var pages = orderedPageKeys.map(function (key) {
    return pagesMap[key];
  });

  return {
    specVersion: "1.0",
    documentName: options.documentName,
    exportedAt: options.exportedAt,
    mode: options.mode,
    outputRoot: options.outputRoot,
    pages: pages,
    artboards: artboards,
    summary: {
      pageTotal: pages.length,
      artboardTotal: artboards.length,
      successTotal: artboards.filter(function (ab) { return ab.status === "success"; }).length,
      failedTotal: artboards.filter(function (ab) { return ab.status === "failed"; }).length,
      warningTotal: (options.warnings || []).length,
    },
    warnings: options.warnings || [],
    errors: options.errors || [],
  };
}

function generateIndexHtml(indexObject, modeLabel) {
  var lines = [];
  lines.push("<!DOCTYPE html>");
  lines.push('<html lang="zh">');
  lines.push("<head>");
  lines.push('<meta charset="utf-8">');
  lines.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  lines.push("<title>NGM Handoff Index · " + escapeHtml(indexObject.documentName) + "</title>");
  lines.push("<style>");
  lines.push("  body { margin:0; padding:24px; font-family: -apple-system, 'PingFang SC', sans-serif; background:#fafafa; color:#222; }");
  lines.push("  h1 { font-size:18px; margin:0 0 4px; }");
  lines.push("  .ngm-meta { color:#888; font-size:12px; margin-bottom:18px; }");
  lines.push("  .ngm-page { margin-bottom:18px; background:#fff; border:1px solid #eee; border-radius:6px; padding:12px 16px; }");
  lines.push("  .ngm-page-title { font-weight:600; font-size:14px; margin-bottom:8px; }");
  lines.push("  ul { list-style:none; padding:0; margin:0; }");
  lines.push("  li { padding:6px 0; border-top:1px dashed #eee; font-size:13px; }");
  lines.push("  li:first-child { border-top:none; }");
  lines.push("  a { color:#3b82f6; text-decoration:none; }");
  lines.push("  a:hover { text-decoration:underline; }");
  lines.push("  .ngm-tag { display:inline-block; padding:0 6px; border-radius:3px; font-size:11px; margin-left:6px; }");
  lines.push("  .ngm-tag.ok { background:#e6f7ec; color:#1f883d; }");
  lines.push("  .ngm-tag.fail { background:#fde7e7; color:#b42318; }");
  lines.push("  .ngm-summary { margin-top:18px; color:#666; font-size:12px; }");
  lines.push("</style>");
  lines.push("</head>");
  lines.push("<body>");
  lines.push("<h1>NGM Design Handoff Index</h1>");
  lines.push('<div class="ngm-meta">');
  lines.push("文档：" + escapeHtml(indexObject.documentName) + " · ");
  lines.push("模式：" + escapeHtml(modeLabel || indexObject.mode) + " · ");
  lines.push("导出时间：" + escapeHtml(indexObject.exportedAt));
  lines.push("</div>");

  indexObject.pages.forEach(function (page) {
    lines.push('<section class="ngm-page">');
    lines.push('<div class="ngm-page-title">' + escapeHtml(page.index) + " · " + escapeHtml(page.pageName) + "（" + page.artboards.length + " 个画板）</div>");
    lines.push("<ul>");
    page.artboards.forEach(function (ab) {
      var cls = ab.status === "success" ? "ok" : "fail";
      var preview = ab.previewHtml
        ? '<a href="' + escapeHtml(ab.previewHtml) + '">预览</a>'
        : "预览（缺失）";
      var screenshot = ab.screenshot ? ' · <a href="' + escapeHtml(ab.screenshot) + '">截图</a>' : "";
      var pkg = ab.packageDir ? '<a href="' + escapeHtml(ab.packageDir) + '">Handoff 包</a>' : "Handoff 包（缺失）";
      lines.push("<li>" + escapeHtml(ab.index) + " · " + escapeHtml(ab.name) + ' <span class="ngm-tag ' + cls + '">' + escapeHtml(ab.status) + "</span> · " + pkg + " · " + preview + screenshot + "</li>");
    });
    lines.push("</ul>");
    lines.push("</section>");
  });

  var s = indexObject.summary || {};
  lines.push('<div class="ngm-summary">');
  lines.push("共 " + s.pageTotal + " 个页面 · " + s.artboardTotal + " 个画板 · 成功 " + s.successTotal + " · 失败 " + s.failedTotal + " · 警告 " + s.warningTotal);
  lines.push("</div>");

  lines.push("</body>");
  lines.push("</html>");

  return lines.join("\n") + "\n";
}

module.exports = {
  pad3: pad3,
  buildIndexObject: buildIndexObject,
  generateIndexHtml: generateIndexHtml,
};

