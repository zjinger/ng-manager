export function previewWrite(
  scope: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    code: "PREVIEW",
    message: "set confirm=true to execute this write operation",
    data: {
      method,
      path,
      requiredScope: scope,
      body: body ?? {},
    },
  };
}
