function isArtboard(layer) {
    return layer && layer.type === "Artboard";
}
function findParentArtboard(layer) {
    var current = layer;
    while (current) {
        if (isArtboard(current)) {
            return current;
        }
        current = current.parent;
    }
    return null;
}
function findOwningArtboard(layer, document) {
    var direct = findParentArtboard(layer);
    if (direct) {
        return direct;
    }
    if (!document || !document.pages) {
        return null;
    }
    var layerId = String(layer && layer.id ? layer.id : "");
    if (!layerId) {
        return null;
    }
    for (var i = 0; i < document.pages.length; i += 1) {
        var page = document.pages[i];
        var owned = findArtboardContainingLayerId(page, layerId);
        if (owned) {
            return owned.artboard;
        }
    }
    return null;
}
function findArtboardContainingLayerId(page, layerId) {
    if (!page || !page.layers) {
        return null;
    }
    for (var i = 0; i < page.layers.length; i += 1) {
        var layer = page.layers[i];
        if (!isArtboard(layer)) {
            continue;
        }
        if (containsLayerId(layer, layerId)) {
            return { page: page, artboard: layer };
        }
    }
    return null;
}
function containsLayerId(root, layerId) {
    if (!root) {
        return false;
    }
    if (String(root.id || "") === layerId) {
        return true;
    }
    if (root.layers && root.layers.length > 0) {
        for (var i = 0; i < root.layers.length; i += 1) {
            if (containsLayerId(root.layers[i], layerId)) {
                return true;
            }
        }
    }
    return false;
}
function getArtboardsFromSelection(document) {
    var selection = document && document.selectedLayers ? document.selectedLayers.layers : [];
    var result = [];
    var seenIds = {};
    selection.forEach(function (layer) {
        var artboard;
        if (isArtboard(layer)) {
            artboard = layer;
        }
        else {
            artboard = findOwningArtboard(layer, document);
        }
        if (!artboard) {
            return;
        }
        var id = String(artboard.id || "");
        if (!id) {
            result.push(artboard);
            return;
        }
        if (seenIds[id]) {
            return;
        }
        seenIds[id] = true;
        result.push(artboard);
    });
    return result;
}
function collectVisibleArtboards(page) {
    if (!page || !page.layers) {
        return [];
    }
    return page.layers.filter(function (layer) {
        return isArtboard(layer) && !layer.hidden;
    });
}
function getAllPages(document) {
    if (!document || !document.pages) {
        return [];
    }
    return document.pages.slice();
}
function getDocumentArtboardGroups(document) {
    var pages = getAllPages(document);
    var groups = [];
    pages.forEach(function (page) {
        var artboards = collectVisibleArtboards(page);
        if (artboards.length > 0) {
            groups.push({ page: page, artboards: artboards });
        }
    });
    return groups;
}
function flattenGroups(groups) {
    var flat = [];
    (groups || []).forEach(function (group) {
        (group.artboards || []).forEach(function (artboard) {
            flat.push({ page: group.page, artboard: artboard });
        });
    });
    return flat;
}
function filterGroupsBySelection(groups, selection) {
    if (!selection || selection.length === 0) {
        return [];
    }
    var lookup = {};
    selection.forEach(function (item) {
        var key = String(item.pageId) + "|" + String(item.artboardId);
        lookup[key] = true;
    });
    var result = [];
    groups.forEach(function (group) {
        var pageId = String((group.page && group.page.id) || "");
        var matched = (group.artboards || []).filter(function (artboard) {
            var key = pageId + "|" + String(artboard.id || "");
            return Boolean(lookup[key]);
        });
        if (matched.length > 0) {
            result.push({ page: group.page, artboards: matched });
        }
    });
    return result;
}
module.exports = {
    isArtboard: isArtboard,
    findParentArtboard: findParentArtboard,
    findOwningArtboard: findOwningArtboard,
    getArtboardsFromSelection: getArtboardsFromSelection,
    collectVisibleArtboards: collectVisibleArtboards,
    getAllPages: getAllPages,
    getDocumentArtboardGroups: getDocumentArtboardGroups,
    flattenGroups: flattenGroups,
    filterGroupsBySelection: filterGroupsBySelection,
};
