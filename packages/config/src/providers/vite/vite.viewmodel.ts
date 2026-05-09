export interface ViteConfigViewModel {
  filePath: string;
  content: string;
  readonly: true;
  supportedFields: Array<{
    key: string;
    label: string;
    status: "readonly" | "unsupported";
  }>;
}
