// CommonJS runtime 最小类型声明。
// 当前允许 require 返回 unknown，后续随模块 ESM 化逐步收窄。

export {};

declare const require: (id: string) => unknown;

declare const module: {
  exports: unknown;
};
