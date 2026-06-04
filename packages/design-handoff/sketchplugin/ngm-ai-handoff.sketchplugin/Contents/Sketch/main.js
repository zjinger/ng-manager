var sketch = require("sketch");
var UI = require("sketch/ui");
var exporter = require("./exporter");
var pluginSettings = require("./settings");

var PLUGIN_VERSION = "0.1.0";

function getDocument() {
  return sketch.getSelectedDocument();
}

function isArtboard(layer) {
  return layer && layer.type === "Artboard";
}

function getArtboardsFromSelection(document) {
  var selection = document.selectedLayers ? document.selectedLayers.layers : [];
  var artboards = [];

  selection.forEach(function (layer) {
    if (isArtboard(layer)) {
      artboards.push(layer);
    }
  });

  return artboards;
}

function getArtboardsFromCurrentPage(document) {
  var page = document.selectedPage;
  if (!page || !page.layers) {
    return [];
  }

  return page.layers.filter(function (layer) {
    return isArtboard(layer) && !layer.hidden;
  });
}

function exportArtboards(document, artboards) {
  var exported = [];
  var settings = pluginSettings.getSettings();

  artboards.forEach(function (artboard) {
    exported.push(
      exporter.exportArtboard(document, artboard, {
        pluginVersion: PLUGIN_VERSION,
        settings: settings,
      }),
    );
  });

  return exported;
}

function onExportSelectedArtboard() {
  var document = getDocument();
  if (!document) {
    UI.message("NGM AI Handoff: no Sketch document is open.");
    return;
  }

  var artboards = getArtboardsFromSelection(document);
  if (artboards.length === 0) {
    UI.message("NGM AI Handoff: select one or more artboards first.");
    return;
  }

  try {
    var exported = exportArtboards(document, artboards);
    UI.message("NGM AI Handoff: exported " + exported.length + " artboard(s).");
  } catch (error) {
    UI.alert("NGM AI Handoff export failed", error && error.message ? error.message : String(error));
  }
}

function onExportCurrentPage() {
  var document = getDocument();
  if (!document) {
    UI.message("NGM AI Handoff: no Sketch document is open.");
    return;
  }

  var artboards = getArtboardsFromCurrentPage(document);
  if (artboards.length === 0) {
    UI.message("NGM AI Handoff: current page has no visible artboards.");
    return;
  }

  try {
    var exported = exportArtboards(document, artboards);
    UI.message("NGM AI Handoff: exported " + exported.length + " artboard(s).");
  } catch (error) {
    UI.alert("NGM AI Handoff export failed", error && error.message ? error.message : String(error));
  }
}

function onOpenSettings() {
  try {
    pluginSettings.configureSettings();
  } catch (error) {
    UI.alert("NGM AI Handoff settings failed", error && error.message ? error.message : String(error));
  }
}

module.exports = {
  onExportSelectedArtboard: onExportSelectedArtboard,
  onExportCurrentPage: onExportCurrentPage,
  onOpenSettings: onOpenSettings,
};
