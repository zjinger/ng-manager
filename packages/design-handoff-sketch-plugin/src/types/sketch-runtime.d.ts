// Sketch runtime 最小类型声明。
// 只声明当前项目实际用到的 API，不追求完整 Sketch API。

export {};

declare global {
  interface SketchFrameLike {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  interface SketchTextStyleLike {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    alignment?: string;
    kerning?: number;
    lineHeight?: number;
    color?: string | unknown;
  }

  interface SketchStyleLike {
    opacity?: number;
    fills?: unknown[];
    borders?: unknown[];
    shadows?: unknown[];
    textStyle?: SketchTextStyleLike;
  }

  interface SketchExportFormatLike {
    format?: string;
    size?: string;
  }

  interface SketchLayerLike {
    id?: string;
    type?: string;
    name?: string;
    hidden?: boolean;
    locked?: boolean;
    frame?: SketchFrameLike;
    layers?: SketchLayerLike[];
    exportFormats?: SketchExportFormatLike[];
    style?: SketchStyleLike;
    styleRef?: string;
    points?: unknown[];
    cornerRadius?: number;
    master?: SketchLayerLike;
    CSSAttributes?: string[];
    transform?: { rotation?: number };
    text?: string;
    isEmpty?: boolean;
    [key: string]: unknown;
  }

  interface SketchPageLike {
    id?: string;
    name?: string;
    layers?: SketchLayerLike[];
    selectedPage?: SketchPageLike;
  }

  interface SketchDocumentLike {
    id?: string;
    pages?: SketchPageLike[];
    selectedPage?: SketchPageLike;
    page?: SketchPageLike;
  }

  interface SketchUiModule {
    message(text: string): void;
    alert(title: string, informativeText?: string): void;
    getInputFromUser(title: string, options?: unknown, callback?: (err?: Error, value?: string) => void): void;
    savePanel?(...args: unknown[]): unknown;
  }

  interface SketchRuntimeModule {
    getSelectedDocument(): SketchDocumentLike | undefined;
    find?(...args: unknown[]): unknown;
    export?(...args: unknown[]): unknown;
    getStringFromPasteboard?(): string;
    setStringForPasteboard?(value: string): void;
    version?: string;
    identifier?: string;
  }
}
