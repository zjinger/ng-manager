// Sketch Measure 式预览脚本：screenshot 作为视觉事实，图层矩形作为透明可点击热区。
function generatePreviewJs() {
  return `(function () {
  let DATA = window.__NGM_PREVIEW_DATA__ || {};
  let nodesByHandoffId = {};
  let assetsByLayerId = {};
  let selectedHandoffId = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cssEsc(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(String(value || ''));
    }
    return String(value || '').replace(/["\\\\]/g, '\\\\$&');
  }

  function px(value) {
    let number = Number(value);
    return isFinite(number) ? number + 'px' : '0px';
  }

  function unit(value) {
    let number = Number(value);
    return isFinite(number) ? Math.round(number * 100) / 100 : 0;
  }

  function getFrame(node) {
    return node && (node.absoluteFrame || node.frame) ? node.absoluteFrame || node.frame : { x: 0, y: 0, width: 0, height: 0 };
  }

  function dataAttrs(node) {
    let frame = getFrame(node);
    return ' data-handoff-id="' + esc(node.handoffId) + '"' +
      ' data-layer-id="' + esc(node.layerId || node.id) + '"' +
      ' data-artboard-id="' + esc(node.artboardId || '') + '"' +
      ' data-handoff-type="' + esc(node.role || node.type || 'layer') + '"' +
      ' data-handoff-name="' + esc(node.name || '') + '"' +
      ' data-width-label="' + esc(unit(frame.width) + 'px') + '"' +
      ' data-height-label="' + esc(unit(frame.height) + 'px') + '"';
  }

  function walk(nodes, parentId, depth) {
    (nodes || []).forEach(function (node) {
      node.parentId = node.parentId || parentId || null;
      node.depth = depth || 0;
      nodesByHandoffId[node.handoffId] = node;
      walk(node.children || [], node.handoffId, (depth || 0) + 1);
    });
  }

  function isSelectable(node) {
    if (!node || node.visible === false || node.renderStrategy === 'ignore') return false;
    let frame = getFrame(node);
    if (frame.width <= 0 || frame.height <= 0) return false;
    return true;
  }

  function flattenSelectable(nodes, out) {
    (nodes || []).forEach(function (node) {
      if (isSelectable(node)) out.push(node);
      flattenSelectable(node.children || [], out);
    });
    return out;
  }

  function renderStage() {
    let stage = DATA.artboard || {};
    let wrapper = document.querySelector('.ngm-stage-wrapper');
    let content = document.querySelector('.ngm-stage-content');
    let hotspots = document.querySelector('.ngm-hotspot-layer');
    if (!wrapper || !content || !hotspots) return;

    wrapper.style.width = px(stage.width);
    wrapper.style.height = px(stage.height);
    content.style.width = px(stage.width);
    content.style.height = px(stage.height);

    let html = [];
    flattenSelectable(DATA.nodes || [], []).forEach(function (node, index) {
      let frame = getFrame(node);
      html.push('<div class="ngm-hotspot"' + dataAttrs(node) +
        ' style="left:' + px(frame.x) +
        ';top:' + px(frame.y) +
        ';width:' + px(frame.width) +
        ';height:' + px(frame.height) +
        ';z-index:' + (10 + index) + '"></div>');
    });
    hotspots.innerHTML = html.join('\\n');
    fitStage();
  }

  function fitStage() {
    let panel = document.querySelector('.ngm-stage-panel');
    let wrapper = document.querySelector('.ngm-stage-wrapper');
    let stage = DATA.artboard || {};
    if (!panel || !wrapper || !stage.width || !stage.height) return;
    let availableWidth = Math.max(320, panel.clientWidth - 64);
    let availableHeight = Math.max(240, panel.clientHeight - 64);
    let scale = Math.min(1, availableWidth / stage.width, availableHeight / stage.height);
    wrapper.style.transform = 'scale(' + scale + ')';
    wrapper.style.marginBottom = Math.max(32, stage.height * scale * 0.08) + 'px';
  }

  function renderLayerTree() {
    let root = document.querySelector('.ngm-layer-tree .ngm-panel-content');
    if (!root) return;
    root.innerHTML = buildTreeNodes(DATA.nodes || []);
  }

  function buildTreeNodes(nodes) {
    let out = ['<ul>'];
    (nodes || []).forEach(function (node) {
      let hasChildren = node.children && node.children.length;
      out.push('<li>');
      out.push('<div class="ngm-layer-tree-node" data-handoff-id="' + esc(node.handoffId) + '">');
      out.push('<span class="toggle">' + (hasChildren ? '▾' : '') + '</span>');
      out.push('<span class="icon">' + iconFor(node) + '</span>');
      out.push('<span class="name">' + esc(node.name || node.type || 'Layer') + '</span>');
      out.push('</div>');
      if (hasChildren) {
        out.push('<div class="ngm-layer-tree-children">');
        out.push(buildTreeNodes(node.children));
        out.push('</div>');
      }
      out.push('</li>');
    });
    out.push('</ul>');
    return out.join('');
  }

  function iconFor(node) {
    if (node.assetRef) return '▣';
    if (node.type === 'Text') return 'T';
    if (node.type === 'Group' || node.type === 'SymbolInstance') return '▦';
    if (node.type === 'Shape' || node.type === 'ShapePath') return '▭';
    return '•';
  }

  function renderInspect(node) {
    let panel = document.querySelector('.ngm-inspect-panel .ngm-panel-content');
    if (!panel) return;
    if (!node) {
      panel.innerHTML = '<div class="ngm-empty-state">点击图层查看详情</div>';
      return;
    }
    let inspect = node.inspect || {};
    let frame = getFrame(node);
    let html = '';
    html += infoGroup('基础信息', [
      infoRow('名称', node.name || '-'),
      infoRow('类型', (node.type || '-') + (node.role ? ' / ' + node.role : '')),
      infoRow('handoffId', node.handoffId || '-')
    ]);
    html += infoGroup('位置尺寸', [
      infoRow('X', unit(frame.x) + 'px'),
      infoRow('Y', unit(frame.y) + 'px'),
      infoRow('W', unit(frame.width) + 'px'),
      infoRow('H', unit(frame.height) + 'px')
    ]);
    if (node.text) html += infoGroup('文本内容', [infoText(node.text)]);
    html += styleGroup(inspect);
    html += fontGroup(inspect);
    html += cssGroup(inspect);
    if (inspect.assetPath) html += infoGroup('资源', [infoRow('路径', inspect.assetPath), infoRow('类型', (inspect.assetType || '-') + (inspect.assetFormat ? ' / ' + inspect.assetFormat : ''))]);
    panel.innerHTML = html || '<div class="ngm-empty-state">无可用信息</div>';
  }

  function formatFill(fill) {
    if (!fill) return '-';
    if (fill.gradient && fill.gradient.stops && fill.gradient.stops.length) return '渐变';
    return fill.color || '-';
  }

  function formatBorder(border) {
    if (!border) return '-';
    return (border.thickness || 1) + 'px ' + (border.position || '') + ' ' + (border.color || '');
  }

  function formatShadow(shadow) {
    if (!shadow) return '-';
    let inset = shadow.type === 'inner' ? 'inset ' : '';
    return inset + shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.spread + 'px ' + (shadow.color || '');
  }

  function styleGroup(inspect) {
    let rows = [];
    if (inspect.opacity != null) rows.push(infoRow('不透明度', inspect.opacity));
    if (inspect.rotation != null) rows.push(infoRow('旋转', inspect.rotation + '°'));
    if (inspect.radius != null) rows.push(infoRow('圆角', inspect.radius + 'px'));
    if (inspect.fills && inspect.fills.length) {
      inspect.fills.forEach(function (fill, index) {
        rows.push(infoRow('填充' + (inspect.fills.length > 1 ? ' ' + (index + 1) : ''), formatFill(fill), fill && fill.color));
      });
    }
    if (inspect.borders && inspect.borders.length) {
      inspect.borders.forEach(function (border, index) {
        rows.push(infoRow('边框' + (inspect.borders.length > 1 ? ' ' + (index + 1) : ''), formatBorder(border), border && border.color));
      });
    }
    if (inspect.shadows && inspect.shadows.length) {
      inspect.shadows.forEach(function (shadow, index) {
        rows.push(infoRow('阴影' + (inspect.shadows.length > 1 ? ' ' + (index + 1) : ''), formatShadow(shadow)));
      });
    }
    return rows.length ? infoGroup('样式', rows) : '';
  }

  function fontGroup(inspect) {
    let rows = [];
    if (inspect.textColor) rows.push(infoRow('文字颜色', inspect.textColor, true));
    if (inspect.fontFamily) rows.push(infoRow('字体', inspect.fontFamily));
    if (inspect.fontSize) rows.push(infoRow('字号', inspect.fontSize + 'px'));
    if (inspect.fontWeight) rows.push(infoRow('字重', inspect.fontWeight));
    if (inspect.textAlign) rows.push(infoRow('对齐', inspect.textAlign));
    if (inspect.letterSpacing != null) rows.push(infoRow('字距', inspect.letterSpacing + 'px'));
    if (inspect.lineHeight != null) rows.push(infoRow('行高', inspect.lineHeight));
    return rows.length ? infoGroup('文本', rows) : '';
  }

  function cssGroup(inspect) {
    if (!inspect.cssSnippet || !inspect.cssSnippet.length) return '';
    let code = '<pre class="ngm-code-block">' + esc(inspect.cssSnippet.join('\\n')) + '</pre>';
    return infoGroup('CSS 片段', [code]);
  }

  function infoGroup(title, rows) {
    return '<div class="ngm-info-group"><div class="ngm-info-label">' + esc(title) + '</div>' + rows.join('') + '</div>';
  }

  function infoRow(label, value, swatch) {
    let color = swatch ? '<span class="ngm-color-swatch" style="background:' + esc(value) + '"></span>' : '';
    return '<div class="ngm-info-row"><span>' + esc(label) + '</span><span>' + color + esc(value == null ? '-' : value) + '</span></div>';
  }

  function infoText(value) {
    return '<div class="ngm-info-value">' + esc(value) + '</div>';
  }

  function renderAssets() {
    let panel = document.querySelector('.ngm-assets-panel .ngm-panel-content');
    if (!panel) return;
    let assets = DATA.assets || [];
    if (!assets.length) {
      panel.innerHTML = '<div class="ngm-empty-state">无导出资源</div>';
      return;
    }
    assets.forEach(function (asset) {
      if (asset && asset.layerId) assetsByLayerId[String(asset.layerId)] = asset;
    });
    panel.innerHTML = assets.map(function (asset) {
      return '<div class="ngm-asset-item" data-layer-id="' + esc(asset.layerId || '') + '" data-asset-id="' + esc(asset.id || '') + '">' +
        '<div class="ngm-asset-thumb">' + (asset.path ? '<img src="' + esc(asset.path) + '" alt="">' : '?') + '</div>' +
        '<div class="ngm-asset-meta"><div class="ngm-asset-name">' + esc(asset.name || asset.id || 'asset') + '</div><div class="ngm-asset-type">' + esc(asset.type || 'asset') + (asset.format ? ' / ' + esc(asset.format) : '') + '</div></div>' +
        '</div>';
    }).join('');
  }

  function clearSelection() {
    document.querySelectorAll('[data-ngm-handoff-selected="true"]').forEach(function (el) {
      el.removeAttribute('data-ngm-handoff-selected');
    });
    document.querySelectorAll('.ngm-layer-tree-node.selected').forEach(function (el) {
      el.classList.remove('selected');
    });
    document.querySelectorAll('.ngm-asset-item.selected').forEach(function (el) {
      el.classList.remove('selected');
    });
  }

  function selectByHandoffId(handoffId, notifyParent) {
    let node = nodesByHandoffId[handoffId];
    selectedHandoffId = handoffId;
    clearSelection();
    if (!node) {
      renderInspect(null);
      return;
    }

    let selector = '[data-handoff-id="' + cssEsc(handoffId) + '"]';
    let stageEl = document.querySelector('.ngm-hotspot-layer ' + selector);
    if (stageEl) {
      stageEl.setAttribute('data-ngm-handoff-selected', 'true');
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    let treeEl = document.querySelector('.ngm-layer-tree-node' + selector);
    if (treeEl) treeEl.classList.add('selected');

    let asset = assetsByLayerId[String(node.layerId || node.id || '')];
    if (asset && asset.id) {
      let assetEl = document.querySelector('.ngm-asset-item[data-asset-id="' + cssEsc(asset.id) + '"]');
      if (assetEl) assetEl.classList.add('selected');
    }

    renderInspect(node);

    if (notifyParent !== false) {
      try {
        window.parent.postMessage({
          type: 'ngm-handoff:select',
          handoffId: handoffId,
          handoffType: node.role || node.type || 'layer',
          layerId: node.layerId || node.id || '',
          artboardId: node.artboardId || '',
          source: 'ngm-preview'
        }, '*');
      } catch (e) {}
    }
  }

  function bindEvents() {
    document.querySelector('.ngm-hotspot-layer').addEventListener('click', function (event) {
      let el = event.target.closest('.ngm-hotspot');
      if (!el) return;
      selectByHandoffId(el.getAttribute('data-handoff-id'), true);
      event.preventDefault();
      event.stopPropagation();
    });

    document.querySelector('.ngm-layer-tree').addEventListener('click', function (event) {
      let nodeEl = event.target.closest('.ngm-layer-tree-node');
      if (!nodeEl) return;
      selectByHandoffId(nodeEl.getAttribute('data-handoff-id'), true);
    });

    document.querySelector('.ngm-assets-panel').addEventListener('click', function (event) {
      let item = event.target.closest('.ngm-asset-item');
      if (!item) return;
      let layerId = item.getAttribute('data-layer-id');
      let node = null;
      Object.keys(nodesByHandoffId).some(function (handoffId) {
        let candidate = nodesByHandoffId[handoffId];
        if (String(candidate.layerId || candidate.id || '') === String(layerId || '')) {
          node = candidate;
          return true;
        }
        return false;
      });
      if (node) selectByHandoffId(node.handoffId, true);
    });

    document.getElementById('ngm-toggle-screenshot').addEventListener('click', function () {
      let screenshot = document.querySelector('.ngm-screenshot-layer');
      if (screenshot) {
        screenshot.classList.toggle('hidden');
        this.classList.toggle('active');
      }
    });

    document.getElementById('ngm-toggle-hotspots').addEventListener('click', function () {
      let layer = document.querySelector('.ngm-hotspot-layer');
      layer.classList.toggle('hidden');
      this.classList.toggle('active');
    });

    document.getElementById('ngm-reset-zoom').addEventListener('click', fitStage);
    window.addEventListener('resize', fitStage);

    window.addEventListener('message', function (event) {
      let data = event.data || {};
      if (data.type === 'ngm-handoff:highlight' && data.handoffId) {
        selectByHandoffId(data.handoffId, false);
      }
    });
  }

  function init() {
    walk(DATA.nodes || [], null, 0);
    renderStage();
    renderLayerTree();
    renderAssets();
    renderInspect(null);
    bindEvents();
    try {
      window.parent.postMessage({ type: 'ngm-handoff:ready', source: 'ngm-preview' }, '*');
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}

module.exports = { generatePreviewJs: generatePreviewJs };

export {};
