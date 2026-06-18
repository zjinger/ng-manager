// 自定义导出勾选对话框。
// 使用 NSAlert accessoryView 构建 checkbox 列表，避免依赖 NSWindowController.extend。

var i18n = require("../i18n/i18n");

var CHECKBOX_HEIGHT = 22;
var CHECKBOX_WIDTH = 440;
var DIALOG_WIDTH = 520;
var DIALOG_HEIGHT = 420;
var ROW_SPACING = 4;
var PADDING = 12;

function nsRect(x, y, width, height) {
  return NSMakeRect(x, y, width, height);
}

function nsPoint(x, y) {
  return NSMakePoint(x, y);
}

// entries: [{ page, artboard }]
// returns: [{ pageId, artboardId }] 或 null(取消)
function showCustomScopeDialog(entries) {
  if (!entries || entries.length === 0) {
    return null;
  }

  var checkboxFrames = [];
  var alert = NSAlert.alloc().init();
  alert.setMessageText(i18n.STRINGS.custom.title);
  alert.setInformativeText(i18n.t("custom.prompt", { count: entries.length }));
  alert.addButtonWithTitle(i18n.STRINGS.custom.confirm);
  alert.addButtonWithTitle(i18n.STRINGS.custom.cancel);
  alert.setAccessoryView(buildAccessoryView(entries, checkboxFrames));

  var response = alert.runModal();
  var firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
  if (response !== firstButton) {
    return null;
  }

  var result = [];
  checkboxFrames.forEach(function (checkbox, index) {
    if (checkbox.state() === NSOnState) {
      var entry = entries[index];
      result.push({
        pageId: String((entry.page && entry.page.id) || ""),
        artboardId: String((entry.artboard && entry.artboard.id) || ""),
      });
    }
  });

  return result.length > 0 ? result : null;
}

function buildAccessoryView(entries, checkboxFrames) {
  var scrollView = NSScrollView.alloc().initWithFrame(
    nsRect(0, 0, DIALOG_WIDTH, DIALOG_HEIGHT),
  );
  scrollView.setHasVerticalScroller(true);
  scrollView.setAutohidesScrollers(false);
  scrollView.setBorderType(NSBezelBorder);

  var documentHeight = Math.max(DIALOG_HEIGHT, entries.length * (CHECKBOX_HEIGHT + ROW_SPACING) + PADDING);
  var documentView = NSView.alloc().initWithFrame(
    nsRect(0, 0, DIALOG_WIDTH - 2, documentHeight),
  );
  scrollView.setDocumentView(documentView);

  entries.forEach(function (entry, index) {
    var y = documentHeight - PADDING - (index + 1) * (CHECKBOX_HEIGHT + ROW_SPACING);
    var checkbox = NSButton.alloc().initWithFrame(nsRect(PADDING, y, CHECKBOX_WIDTH, CHECKBOX_HEIGHT));
    checkbox.setButtonType(NSSwitchButton);
    checkbox.setBezelStyle(0);
    checkbox.setState(NSOnState);
    checkbox.setTitle(
      i18n.t("custom.rowLabel", {
        pageName: (entry.page && entry.page.name) || "",
        artboardName: (entry.artboard && entry.artboard.name) || "",
      }),
    );
    documentView.addSubview(checkbox);
    checkboxFrames.push(checkbox);
  });

  scrollView.contentView().documentView().scrollPoint(nsPoint(0, 0));
  return scrollView;
}

module.exports = {
  showCustomScopeDialog: showCustomScopeDialog,
};

export {};
