import { showMessage } from "./sketch-ui";

export function revealInFinder(path: string, failureMessage: string): void {
  const targetPath = String(path || "");
  try {
    const url = NSURL.fileURLWithPath(targetPath);
    NSWorkspace.sharedWorkspace().activateFileViewerSelectingURLs(NSArray.arrayWithObject(url));
    return;
  } catch (error) {
    try {
      NSWorkspace.sharedWorkspace().openURL(NSURL.fileURLWithPath(targetPath));
      return;
    } catch (innerError) {
      showMessage(failureMessage);
    }
  }
}
