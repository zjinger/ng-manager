export interface ViteConfigViewModel {
  filePath: string;
  content: string;
  readonly: true;
  base?: string;
  envDir?: string;
  plugins: string[];
  alias: Array<{
    key: string;
    replacement?: string;
  }>;
  server: {
    host?: string;
    port?: number;
    strictPort?: boolean;
    proxyTargets: Array<{
      context: string;
      target?: string;
      ws?: boolean;
      changeOrigin?: boolean;
    }>;
  };
  build: {
    outDir?: string;
    hasLibMode: boolean;
  };
  effective: {
    values: {
      base: string;
      envDir: string;
      server: {
        host: string;
        port: number;
        strictPort: boolean;
      };
      build: {
        outDir: string;
      };
    };
    sources: Record<string, string>;
  };
}
