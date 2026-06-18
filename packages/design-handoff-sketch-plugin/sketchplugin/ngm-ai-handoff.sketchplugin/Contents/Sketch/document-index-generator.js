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
    lines.push("  :root { color-scheme: light; --bg:#f4f6f8; --panel:#fff; --line:#dde3ea; --text:#18202a; --muted:#687385; --link:#2563eb; --ok:#16833d; --fail:#b42318; }");
    lines.push("  * { box-sizing:border-box; }");
    lines.push("  body { margin:0; font-family:-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif; background:var(--bg); color:var(--text); }");
    lines.push("  .ngm-shell { max-width:1280px; margin:0 auto; padding:28px 24px 40px; }");
    lines.push("  .ngm-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:22px; }");
    lines.push("  h1 { font-size:22px; line-height:1.25; margin:0 0 8px; letter-spacing:0; }");
    lines.push("  .ngm-meta { color:var(--muted); font-size:13px; line-height:1.7; overflow-wrap:anywhere; }");
    lines.push("  .ngm-summary { flex:0 0 auto; display:grid; grid-template-columns:repeat(5, minmax(70px, 1fr)); gap:8px; min-width:420px; }");
    lines.push("  .ngm-summary-item { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; }");
    lines.push("  .ngm-summary-value { font-size:18px; font-weight:700; line-height:1.1; }");
    lines.push("  .ngm-summary-label { margin-top:4px; color:var(--muted); font-size:12px; }");
    lines.push("  .ngm-page { margin-bottom:24px; }");
    lines.push("  .ngm-page-title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; font-weight:700; font-size:15px; }");
    lines.push("  .ngm-page-count { color:var(--muted); font-weight:500; font-size:12px; }");
    lines.push("  .ngm-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }");
    lines.push("  .ngm-card { min-width:0; overflow:hidden; background:var(--panel); border:1px solid var(--line); border-radius:8px; }");
    lines.push("  .ngm-thumb { display:flex; align-items:center; justify-content:center; height:180px; background:#edf1f5; border-bottom:1px solid var(--line); }");
    lines.push("  .ngm-thumb img { display:block; max-width:100%; max-height:100%; width:auto; height:auto; }");
    lines.push("  .ngm-thumb-missing { color:var(--muted); font-size:12px; }");
    lines.push("  .ngm-card-body { padding:12px; }");
    lines.push("  .ngm-card-title { display:flex; align-items:flex-start; gap:8px; min-width:0; }");
    lines.push("  .ngm-card-name { flex:1 1 auto; min-width:0; font-size:13px; font-weight:650; line-height:1.45; overflow-wrap:anywhere; }");
    lines.push("  .ngm-tag { flex:0 0 auto; display:inline-flex; align-items:center; height:20px; padding:0 7px; border-radius:999px; font-size:11px; font-weight:650; }");
    lines.push("  .ngm-tag.ok { background:#e8f7ee; color:var(--ok); }");
    lines.push("  .ngm-tag.fail { background:#fdecec; color:var(--fail); }");
    lines.push("  .ngm-links { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }");
    lines.push("  .ngm-link { display:inline-flex; align-items:center; height:28px; padding:0 10px; border:1px solid var(--line); border-radius:6px; color:var(--link); text-decoration:none; font-size:12px; background:#fff; }");
    lines.push("  .ngm-link:hover { border-color:#93b4f6; background:#f7faff; }");
    lines.push("  .ngm-reason { margin-top:10px; color:var(--fail); font-size:12px; line-height:1.5; overflow-wrap:anywhere; }");
    lines.push("  @media (max-width:760px) { .ngm-shell { padding:20px 14px 32px; } .ngm-header { display:block; } .ngm-summary { min-width:0; grid-template-columns:repeat(2, minmax(0,1fr)); margin-top:14px; } }");
    lines.push("</style>");
    lines.push("</head>");
    lines.push("<body>");
    var s = indexObject.summary || {};
    lines.push('<main class="ngm-shell">');
    lines.push('<header class="ngm-header">');
    lines.push("<div>");
    lines.push("<h1>NGM Design Handoff Index</h1>");
    lines.push('<div class="ngm-meta">');
    lines.push("文档：" + escapeHtml(indexObject.documentName) + " · ");
    lines.push("模式：" + escapeHtml(modeLabel || indexObject.mode) + " · ");
    lines.push("导出时间：" + escapeHtml(indexObject.exportedAt));
    lines.push("</div>");
    lines.push("</div>");
    lines.push('<section class="ngm-summary" aria-label="导出汇总">');
    lines.push(summaryItem("页面", s.pageTotal));
    lines.push(summaryItem("画板", s.artboardTotal));
    lines.push(summaryItem("成功", s.successTotal));
    lines.push(summaryItem("失败", s.failedTotal));
    lines.push(summaryItem("警告", s.warningTotal));
    lines.push("</section>");
    lines.push("</header>");
    indexObject.pages.forEach(function (page) {
        lines.push('<section class="ngm-page">');
        lines.push('<div class="ngm-page-title"><span>' + escapeHtml(page.index) + " · " + escapeHtml(page.pageName) + '</span><span class="ngm-page-count">' + page.artboards.length + " 个画板</span></div>");
        lines.push('<div class="ngm-grid">');
        page.artboards.forEach(function (ab) {
            var cls = ab.status === "success" ? "ok" : "fail";
            var preview = ab.previewHtml
                ? '<a class="ngm-link" href="' + escapeHtml(ab.previewHtml) + '">预览</a>'
                : "";
            var screenshotLink = ab.screenshot ? '<a class="ngm-link" href="' + escapeHtml(ab.screenshot) + '">截图</a>' : "";
            var pkg = ab.packageDir ? '<a class="ngm-link" href="' + escapeHtml(ab.packageDir) + '">Handoff 包</a>' : "";
            var thumb = ab.screenshot
                ? '<img src="' + escapeHtml(ab.screenshot) + '" alt="' + escapeHtml(ab.name) + '">'
                : '<span class="ngm-thumb-missing">无截图</span>';
            lines.push('<article class="ngm-card">');
            lines.push('<a class="ngm-thumb" href="' + escapeHtml(ab.previewHtml || ab.screenshot || ab.packageDir || "#") + '">' + thumb + '</a>');
            lines.push('<div class="ngm-card-body">');
            lines.push('<div class="ngm-card-title"><span class="ngm-card-name">' + escapeHtml(ab.index) + " · " + escapeHtml(ab.name) + '</span><span class="ngm-tag ' + cls + '">' + escapeHtml(ab.status) + "</span></div>");
            lines.push('<div class="ngm-links">' + pkg + preview + screenshotLink + "</div>");
            if (ab.reason) {
                lines.push('<div class="ngm-reason">' + escapeHtml(ab.reason) + "</div>");
            }
            lines.push("</div>");
            lines.push("</article>");
        });
        lines.push("</div>");
        lines.push("</section>");
    });
    lines.push("</main>");
    lines.push("</body>");
    lines.push("</html>");
    return lines.join("\n") + "\n";
}
function summaryItem(label, value) {
    return ('<div class="ngm-summary-item"><div class="ngm-summary-value">' +
        escapeHtml(value == null ? 0 : value) +
        '</div><div class="ngm-summary-label">' +
        escapeHtml(label) +
        "</div></div>");
}
module.exports = {
    pad3: pad3,
    buildIndexObject: buildIndexObject,
    generateIndexHtml: generateIndexHtml,
};
