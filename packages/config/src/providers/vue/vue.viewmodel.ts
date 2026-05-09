export interface VueProjectViewModel {
  isVueProject: boolean;
  isVue3: boolean;
  isVite: boolean;
  vueVersion?: string;
  viteVersion?: string;
  entryFiles: string[];
  configFiles: string[];
  scripts: Record<string, string>;
}
