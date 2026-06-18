declare function require(id: string): any;

declare const module: {
  exports: any;
};

declare const Buffer: any;

declare const process: {
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
};

