// 自定义导出勾选对话框。
// 使用 NSAlert accessoryView 构建 checkbox 列表，避免依赖 NSWindowController.extend。

const i18n = require("../i18n/i18n");

const CHECKBOX_HEIGHT = 22;
const CHECKBOX_WIDTH = 440;
const DIALOG_WIDTH = 520;
const DIALOG_HEIGHT = 420;
const ROW_SPACING = 4;
const PADDING = 12;

import type { FlatArtboardEntry, ScopeSelectionDto } from "../export/export-types";

function nsRect(x: number, y: number, width: number, height: number) {
  return NSMakeRect(x, y, width, height);
}

function nsPoint(x: number, y: number) {
  return NSMakePoint(x, y);
}

// entries: [{ page, artboard }]
// returns: [{ pageId, artboardId }] 或 null(取消)
export function showCustomScopeDialog(entries: FlatArtboardEntry[]): ScopeSelectionDto[] | null {
  if (!entries || entries.length === 0) {
    return null;
  }

  const checkboxFrames: any[] = [];
  const alert = NSAlert.alloc().init();
  alert.setMessageText(i18n.STRINGS.custom.title);
  alert.setInformativeText(i18n.t("custom.prompt", { count: entries.length }));
  alert.addButtonWithTitle(i18n.STRINGS.custom.confirm);
  alert.addButtonWithTitle(i18n.STRINGS.custom.cancel);
  alert.setAccessoryView(buildAccessoryView(entries, checkboxFrames));

  const response = alert.runModal();
  const firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
  if (response !== firstButton) {
    return null;
  }

  const result: ScopeSelectionDto[] = [];
  checkboxFrames.forEach(function (checkbox, index) {
    if (checkbox.state() === NSOnState) {
      const entry = entries[index];
      result.push({
        pageId: String((entry.page && entry.page.id) || ""),
        artboardId: String((entry.artboard && entry.artboard.id) || ""),
      });
    }
  });

  return result.length > 0 ? result : null;
}

function buildAccessoryView(entries: FlatArtboardEntry[], checkboxFrames: any[]) {
  const scrollView = NSScrollView.alloc().initWithFrame(
    nsRect(0, 0, DIALOG_WIDTH, DIALOG_HEIGHT),
  );
  scrollView.setHasVerticalScroller(true);
  scrollView.setAutohidesScrollers(false);
  scrollView.setBorderType(NSBezelBorder);

  const documentHeight = Math.max(DIALOG_HEIGHT, entries.length * (CHECKBOX_HEIGHT + ROW_SPACING) + PADDING);
  const documentView = NSView.alloc().initWithFrame(
    nsRect(0, 0, DIALOG_WIDTH - 2, documentHeight),
  );
  scrollView.setDocumentView(documentView);

  entries.forEach(function (entry: FlatArtboardEntry, index: number) {
    const y = documentHeight - PADDING - (index + 1) * (CHECKBOX_HEIGHT + ROW_SPACING);
    const checkbox = NSButton.alloc().initWithFrame(nsRect(PADDING, y, CHECKBOX_WIDTH, CHECKBOX_HEIGHT));
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
