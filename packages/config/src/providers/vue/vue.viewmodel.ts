export interface VueProjectViewModel {
  projectName?: string;
  isVueProject: boolean;
  isVue3: boolean;
  isVite: boolean;
  vueVersion?: string;
  viteVersion?: string;
  vueRouterVersion?: string;
  piniaVersion?: string;
  antDesignVueVersion?: string;
  entryFiles: string[];
  configFiles: string[];
  scripts: Record<string, string>;
}
