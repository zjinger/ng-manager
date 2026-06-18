export interface NativeAlertOptions {
  title: string;
  message: string;
  buttons?: string[];
}

export function showNativeAlert(options: NativeAlertOptions): number {
  const alert = NSAlert.alloc().init();
  alert.setMessageText(options.title);
  alert.setInformativeText(options.message);
  const buttons = options.buttons && options.buttons.length > 0 ? options.buttons : ["确定"];
  buttons.forEach(function (buttonTitle: string) {
    alert.addButtonWithTitle(buttonTitle);
  });
  return Number(alert.runModal());
}

export function isFirstButtonResponse(response: number): boolean {
  const firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
  return response === firstButton;
}
