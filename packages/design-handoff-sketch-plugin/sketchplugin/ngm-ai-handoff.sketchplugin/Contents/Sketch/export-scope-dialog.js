"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var i18n = require("./i18n");
var CHECKBOX_HEIGHT = 22;
var CHECKBOX_WIDTH = 440;
var WINDOW_WIDTH = 520;
var WINDOW_HEIGHT = 520;
var ROW_SPACING = 4;
var PADDING = 12;
function nsRect(x, y, width, height) {
    return NSMakeRect(x, y, width, height);
}
function nsPoint(x, y) {
    return NSMakePoint(x, y);
}
function setAllStates(checkboxFrames, state) {
    checkboxFrames.forEach(function (checkbox) {
        checkbox.setState(state);
    });
}
function showCustomScopeDialog(entries) {
    if (!entries || entries.length === 0) {
        return null;
    }
    var result = [];
    var cancelled = [false];
    var window = NSWindow.alloc().initWithContentRect_styleMask_backing_defer(nsRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT), NSTitledWindowMask | NSClosableWindowMask, NSBackingStoreBuffered, false);
    window.setTitle(i18n.STRINGS.custom.title);
    window.center();
    var content = window.contentView();
    buildPromptLabel(content, entries);
    buildToolButtons(content, window);
    buildScrollView(content, entries, window);
    window.confirmButton = buildBottomButtons(content, window);
    var controller = buildController(window, entries, result, cancelled);
    window.confirmButton.setTarget(controller);
    window.confirmButton.setAction("clicked:");
    window.cancelButton.setTarget(controller);
    window.cancelButton.setAction("clicked:");
    window.selectAllButton.setTarget(controller);
    window.selectAllButton.setAction("clicked:");
    window.deselectAllButton.setTarget(controller);
    window.deselectAllButton.setAction("clicked:");
    window.closeDelegate = buildCloseDelegate(window, result, cancelled);
    window.setDelegate(window.closeDelegate);
    NSApp.runModalForWindow(window);
    cleanupTargets(window);
    if (cancelled[0] || result.length === 0) {
        return null;
    }
    return result;
}
function buildPromptLabel(content, entries) {
    var label = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - PADDING - 24, WINDOW_WIDTH - PADDING * 2, 24));
    label.setStringValue(i18n.t("custom.prompt", { count: entries.length }));
    label.setBezeled(false);
    label.setDrawsBackground(false);
    label.setEditable(false);
    label.setSelectable(false);
    content.addSubview(label);
}
function buildToolButtons(content, window) {
    var buttonY = WINDOW_HEIGHT - PADDING - 24 - 28 - 4;
    var selectAllButton = NSButton.alloc().initWithFrame(nsRect(PADDING, buttonY, 90, 24));
    selectAllButton.setButtonType(NSMomentaryPushInButton);
    selectAllButton.setBezelStyle(NSRoundedBezelStyle);
    selectAllButton.setTitle(i18n.STRINGS.custom.selectAll);
    content.addSubview(selectAllButton);
    window.selectAllButton = selectAllButton;
    var deselectAllButton = NSButton.alloc().initWithFrame(nsRect(PADDING + 96, buttonY, 90, 24));
    deselectAllButton.setButtonType(NSMomentaryPushInButton);
    deselectAllButton.setBezelStyle(NSRoundedBezelStyle);
    deselectAllButton.setTitle(i18n.STRINGS.custom.deselectAll);
    content.addSubview(deselectAllButton);
    window.deselectAllButton = deselectAllButton;
}
function buildScrollView(content, entries, window) {
    var topY = WINDOW_HEIGHT - PADDING - 24 - 28 - 4 + 28;
    var scrollBottom = PADDING + 36 + 8;
    var scrollHeight = topY - scrollBottom;
    var scrollView = NSScrollView.alloc().initWithFrame(nsRect(PADDING, scrollBottom, WINDOW_WIDTH - PADDING * 2, scrollHeight));
    scrollView.setHasVerticalScroller(true);
    scrollView.setAutohidesScrollers(false);
    scrollView.setBorderType(NSBezelBorder);
    var documentHeight = entries.length * (CHECKBOX_HEIGHT + ROW_SPACING);
    var documentView = NSView.alloc().initWithFrame(nsRect(0, 0, WINDOW_WIDTH - PADDING * 2 - 2, documentHeight));
    scrollView.setDocumentView(documentView);
    var checkboxFrames = [];
    entries.forEach(function (entry, index) {
        var y = documentHeight - (index + 1) * (CHECKBOX_HEIGHT + ROW_SPACING) + ROW_SPACING;
        var checkbox = NSButton.alloc().initWithFrame(nsRect(4, y, CHECKBOX_WIDTH, CHECKBOX_HEIGHT));
        checkbox.setButtonType(NSSwitchButton);
        checkbox.setBezelStyle(0);
        checkbox.setState(NSOnState);
        checkbox.setTag(index);
        checkbox.setTitle(i18n.t("custom.rowLabel", {
            pageName: (entry.page && entry.page.name) || "",
            artboardName: (entry.artboard && entry.artboard.name) || "",
        }));
        documentView.addSubview(checkbox);
        checkboxFrames.push(checkbox);
    });
    scrollView.contentView().documentView().scrollPoint(nsPoint(0, 0));
    window.checkboxFrames = checkboxFrames;
    content.addSubview(scrollView);
}
function buildBottomButtons(content, window) {
    var confirmButton = NSButton.alloc().initWithFrame(nsRect(WINDOW_WIDTH - PADDING - 200 - 8 - 80, PADDING, 80, 28));
    confirmButton.setButtonType(NSMomentaryPushInButton);
    confirmButton.setBezelStyle(NSRoundedBezelStyle);
    confirmButton.setTitle(i18n.STRINGS.custom.confirm);
    confirmButton.setKeyEquivalent("\r");
    content.addSubview(confirmButton);
    window.confirmButton = confirmButton;
    var cancelButton = NSButton.alloc().initWithFrame(nsRect(WINDOW_WIDTH - PADDING - 80, PADDING, 80, 28));
    cancelButton.setButtonType(NSMomentaryPushInButton);
    cancelButton.setBezelStyle(NSRoundedBezelStyle);
    cancelButton.setTitle(i18n.STRINGS.custom.cancel);
    cancelButton.setKeyEquivalent("\u001b");
    content.addSubview(cancelButton);
    window.cancelButton = cancelButton;
    return confirmButton;
}
function buildController(window, entries, result, cancelled) {
    var Controller = NSWindowController.extend({
        clicked: function (sender) {
            if (sender === window.selectAllButton) {
                setAllStates(window.checkboxFrames, NSOnState);
                return;
            }
            if (sender === window.deselectAllButton) {
                setAllStates(window.checkboxFrames, NSOffState);
                return;
            }
            if (sender === window.confirmButton) {
                window.checkboxFrames.forEach(function (checkbox, index) {
                    if (checkbox.state() === NSOnState) {
                        var entry = entries[index];
                        result.push({
                            pageId: String((entry.page && entry.page.id) || ""),
                            artboardId: String((entry.artboard && entry.artboard.id) || ""),
                        });
                    }
                });
                window.orderOut(null);
                NSApp.stopModalWithCode(1000);
                return;
            }
            if (sender === window.cancelButton) {
                cancelled[0] = true;
                result.length = 0;
                window.orderOut(null);
                NSApp.stopModalWithCode(0);
            }
        },
    });
    return Controller.new();
}
function cleanupTargets(window) {
    try {
        window.selectAllButton.setTarget(null);
        window.deselectAllButton.setTarget(null);
        window.confirmButton.setTarget(null);
        window.cancelButton.setTarget(null);
        if (window.closeDelegate) {
            window.setDelegate(null);
        }
    }
    catch (error) {
    }
}
function buildCloseDelegate(window, result, cancelled) {
    var Delegate = NSObject.extend({
        windowShouldClose: function (notification) {
            cancelled[0] = true;
            result.length = 0;
            window.orderOut(null);
            NSApp.stopModalWithCode(0);
            return true;
        },
    });
    return Delegate.new();
}
module.exports = {
    showCustomScopeDialog: showCustomScopeDialog,
};
