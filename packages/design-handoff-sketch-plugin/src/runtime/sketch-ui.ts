const UI = require("sketch/ui");

export function showMessage(text: string): void {
  UI.message(text);
}

export function showAlert(title: string, informativeText?: string): void {
  UI.alert(title, informativeText);
}
