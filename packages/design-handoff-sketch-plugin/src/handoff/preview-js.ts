// @ts-nocheck
// Pure HTML Preview v2 的客户端脚本。
function generatePreviewJs() {
  return `(function () {
  var DATA = window.__NGM_PREVIEW_DATA__ || {};
  var nodesById = {};
  var nodesByHandoffId = {};

  function walk(nodes, parentId) {
    (nodes || []).forEach(function (node) {
      nodesById[node.id] = node;
      nodesByHandoffId[node.handoffId] = node;
      node.parentId = node.parentId || parentId;
      walk(node.children, node.handoffId);
    });
  }

  function findHandoffElement(target) {
    if (!target || !target.closest) return null;
    return target.closest('[data-handoff-id]');
  }

  function px(value) { return value == null ? '0' : String(value) + 'px'; }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function cssDeclarations(values) { return values.filter(Boolean).join(';'); }
  function first(values) { return values && values.length ? values[values.length - 1] : null; }

  function baseStyle(node) {
    var f = node.absoluteFrame || node.frame || {};
    return [
      'position:absolute',
      'left:' + px(f.x),
      'top:' + px(f.y),
      'width:' + px(f.width),
      'height:' + px(f.height),
      'box-sizing:border-box',
      'overflow:hidden'
    ];
  }

  function visualStyle(node) {
    var declarations = baseStyle(node);
    var style = node.style;
    if (style) {
      if (style.opacity != null && style.opacity !== 1) declarations.push('opacity:' + style.opacity);
      if (style.radius != null) declarations.push('border-radius:' + px(style.radius));
      var fill = first(style.fills); if (fill) declarations.push('background:' + fill);
      var border = first(style.borders); if (border) declarations.push('border:1px solid ' + border);
      if (style.shadows && style.shadows.length) {
        var shadow = style.shadows.map(function (s) {
          return px(s.x) + ' ' + px(s.y) + ' ' + px(s.blur) + ' ' + px(s.spread) + ' ' + (s.color || 'rgba(0,0,0,0.2)');
        }).join(', ');
        declarations.push('box-shadow:' + shadow);
      }
    }
    return declarations;
  }

  function textStyle(node) {
    var declarations = visualStyle(node);
    var style = node.style;
    declarations.push('white-space:pre-wrap');
    declarations.push('line-height:1.25');
    declarations.push('display:flex');
    declarations.push('align-items:flex-start');
    declarations.push('color:#17202a');
    if (style) {
      if (style.fontFamily) declarations.push('font-family:' + JSON.stringify(style.fontFamily) + ', -apple-system, sans-serif');
      if (style.fontSize) declarations.push('font-size:' + px(style.fontSize));
      if (style.fontWeight) declarations.push('font-weight:' + style.fontWeight);
    }
    return declarations;
  }

  function dataAttrs(node, kind) {
    return ' data-handoff-id="' + esc(node.handoffId) + '"' +
      ' data-layer-id="' + esc(node.layerId) + '"' +
      ' data-artboard-id="' + esc(node.artboardId || '') + '"' +
      ' data-handoff-type="' + esc(kind || node.type || 'layer') + '"' +
      ' data-handoff-name="' + esc(node.name || '') + '"';
  }

  function renderNode(node, output) {
    if (!node || node.hidden) return;
    var asset = node.assetRef;
    if (asset && asset.path) {
      output.push('<img class="ngm-layer ngm-image"' + dataAttrs(node, asset.type || 'image') + ' src="' + esc(asset.path) + '" alt="' + esc(node.name) + '" data-asset-type="' + esc(asset.type || '') + '" data-asset-format="' + esc(asset.format || '') + '" style="' + cssDeclarations(baseStyle(node)) + '">');
    } else if (node.type === 'Text') {
      output.push('<div class="ngm-layer ngm-text"' + dataAttrs(node, 'text') + ' style="' + cssDeclarations(textStyle(node)) + '">' + esc(node.text || node.name || '') + '</div>');
    } else if (node.renderStrategy === 'shape' || node.style && (node.style.fills || node.style.borders)) {
      output.push('<div class="ngm-layer ngm-shape"' + dataAttrs(node, node.role || 'shape') + ' style="' + cssDeclarations(visualStyle(node)) + '"></div>');
    }
    (node.children || []).forEach(function (child) { renderNode(child, output); });
  }

  function renderStage() {
    var stage = DATA.artboard || {};
    var wrapper = document.querySelector('.ngm-stage-wrapper');
    var content = document.querySelector('.ngm-stage-content');
    if (!wrapper || !content) return;
    wrapper.style.width = px(stage.width);
    wrapper.style.height = px(stage.height);
    content.style.width = px(stage.width);
    content.style.height = px(stage.height);
    var html = [];
    (DATA.nodes || []).forEach(function (node) { renderNode(node, html); });
    content.innerHTML = html.join('\\n');
  }

  function renderLayerTree() {
    var root = document.querySelector('.ngm-layer-tree .ngm-panel-content > ul');
    if (!root) return;
    root.innerHTML = buildTreeNodes(DATA.nodes || []).join('');
  }

  function buildTreeNodes(nodes) {
    var out = ['<ul>'];
    (nodes || []).forEach(function (node) {
      var hasChildren = node.children && node.children.length;
      out.push('<li>');
      out.push('<div class="ngm-layer-tree-node" data-handoff-id="' + esc(node.handoffId) + '">');
      out.push('<span class="toggle">' + (hasChildren ? '▾' : '') + '</span>');
      out.push('<span class="icon">' + iconFor(node) + '</span>');
      out.push('<span class="name">' + esc(node.name || node.type) + '</span>');
      out.push('</div>');
      if (hasChildren) {
        out.push('<div class="ngm-layer-tree-children">');
        out.push(buildTreeNodes(node.children).join(''));
        out.push('</div>');
      }
      out.push('</li>');
    });
    out.push('</ul>');
    return out;
  }

  function iconFor(node) {
    if (node.assetRef) return '▣';
    if (node.type === 'Text') return 'T';
    if (node.type === 'Group' || node.type === 'SymbolInstance') return '▦';
    if (node.type === 'Shape' || node.type === 'ShapePath') return '▭';
    return '•';
  }

  function renderInspect(node) {
    var panel = document.querySelector('.ngm-inspect-panel .ngm-panel-content');
    if (!panel) return;
    if (!node) { panel.innerHTML = '<div class="ngm-empty-state">点击图层查看详情</div>'; return; }
    var inspect = node.inspect || {};
    var html = '';
    html += infoRow('名称', node.name || '-');
    html += infoRow('类型', node.type + (node.role ? ' / ' + node.role : ''));
    html += infoRow('handoffId', node.handoffId);
    html += infoRow('尺寸', (node.absoluteFrame.width || 0) + ' × ' + (node.absoluteFrame.height || 0));
    html += infoRow('位置', 'x: ' + (node.absoluteFrame.x || 0) + ', y: ' + (node.absoluteFrame.y || 0));
    if (node.text) html += infoRow('文本', node.text);
    if (inspect.opacity != null) html += infoRow('不透明度', inspect.opacity);
    if (inspect.fontFamily) html += infoRow('字体', inspect.fontFamily);
    if (inspect.fontSize) html += infoRow('字号', inspect.fontSize + 'px');
    if (inspect.fontWeight) html += infoRow('字重', inspect.fontWeight);
    if (inspect.fills && inspect.fills.length) html += infoRow('填充', inspect.fills[inspect.fills.length - 1]);
    if (inspect.borders && inspect.borders.length) html += infoRow('边框', inspect.borders[inspect.borders.length - 1]);
    if (inspect.radius != null) html += infoRow('圆角', inspect.radius + 'px');
    if (inspect.assetPath) html += infoRow('资源', inspect.assetPath);
    panel.innerHTML = html || '<div class="ngm-empty-state">无可用信息</div>';
  }

  function infoRow(label, value) {
    return '<div class="ngm-info-group"><div class="ngm-info-label">' + esc(label) + '</div><div class="ngm-info-value">' + esc(value) + '</div></div>';
  }

  function renderAssets() {
    var panel = document.querySelector('.ngm-assets-panel .ngm-panel-content');
    if (!panel) return;
    var assets = DATA.assets || [];
    if (!assets.length) { panel.innerHTML = '<div class="ngm-empty-state">无导出资源</div>'; return; }
    var html = assets.map(function (asset) {
      return '<div class="ngm-asset-item" data-asset-id="' + esc(asset.id) + '">' +
        '<div class="ngm-asset-thumb">' + (asset.path ? '<img src="' + esc(asset.path) + '">' : '?') + '</div>' +
        '<div class="ngm-asset-meta"><div class="ngm-asset-name">' + esc(asset.name || asset.id) + '</div><div class="ngm-asset-type">' + esc(asset.type) + (asset.format ? ' / ' + esc(asset.format) : '') + '</div></div>' +
        '</div>';
    }).join('');
    panel.innerHTML = html;
  }

  function clearSelection() {
    document.querySelectorAll('[data-ngm-handoff-selected="true"]').forEach(function (el) { el.removeAttribute('data-ngm-handoff-selected'); });
    document.querySelectorAll('.ngm-layer-tree-node.selected').forEach(function (el) { el.classList.remove('selected'); });
    document.querySelectorAll('.ngm-asset-item.selected').forEach(function (el) { el.classList.remove('selected'); });
  }

  function selectByHandoffId(handoffId) {
    clearSelection();
    var node = nodesByHandoffId[handoffId];
    if (!node) { renderInspect(null); return; }

    var stageEl = document.querySelector('[data-handoff-id="' + handoffId + '"]');
    if (stageEl) {
      stageEl.setAttribute('data-ngm-handoff-selected', 'true');
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    var treeEl = document.querySelector('.ngm-layer-tree-node[data-handoff-id="' + handoffId + '"]');
    if (treeEl) treeEl.classList.add('selected');

    renderInspect(node);

    try {
      window.parent.postMessage({ type: 'ngm-handoff:select', handoffId: handoffId, handoffType: node.type, layerId: node.layerId, artboardId: node.artboardId, source: 'ngm-preview' }, '*');
    } catch (e) { /* ignore */ }
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      var el = findHandoffElement(event.target);
      if (!el) return;
      var handoffId = el.getAttribute('data-handoff-id');
      if (handoffId) selectByHandoffId(handoffId);
      event.preventDefault();
      event.stopPropagation();
    }, true);

    document.querySelector('.ngm-layer-tree').addEventListener('click', function (event) {
      var nodeEl = event.target.closest('.ngm-layer-tree-node');
      if (!nodeEl) return;
      var handoffId = nodeEl.getAttribute('data-handoff-id');
      if (handoffId) selectByHandoffId(handoffId);
    });

    document.querySelector('.ngm-assets-panel').addEventListener('click', function (event) {
      var item = event.target.closest('.ngm-asset-item');
      if (!item) return;
      clearSelection();
      item.classList.add('selected');
    });

    document.getElementById('ngm-toggle-screenshot').addEventListener('click', function () {
      var layer = document.querySelector('.ngm-screenshot-layer');
      if (!layer) return;
      layer.classList.toggle('visible');
      document.getElementById('ngm-toggle-screenshot').classList.toggle('active');
    });

    window.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.type === 'ngm-handoff:highlight') {
        clearSelection();
        var el = document.querySelector('[data-handoff-id="' + data.handoffId + '"]');
        if (el) {
          el.setAttribute('data-ngm-handoff-selected', 'true');
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    });
  }

  function init() {
    walk(DATA.nodes);
    renderStage();
    renderLayerTree();
    renderAssets();
    bindEvents();
    try {
      window.parent.postMessage({ type: 'ngm-handoff:ready', source: 'ngm-preview' }, '*');
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}
module.exports = { generatePreviewJs: generatePreviewJs };
