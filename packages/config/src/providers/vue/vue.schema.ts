import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildVueSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "overview",
        title: "项目概览",
        fields: [
          { key: "projectName", label: "项目名称", type: "readonly", path: "/projectName", readonly: true },
          { key: "isVueProject", label: "Vue 项目", type: "readonly", path: "/isVueProject", readonly: true },
          { key: "isVite", label: "Vite 项目", type: "readonly", path: "/isVite", readonly: true },
          { key: "isVue3", label: "Vue3", type: "readonly", path: "/isVue3", readonly: true }
        ]
      },
      {
        key: "versions",
        title: "依赖版本",
        fields: [
          { key: "vueVersion", label: "vue", type: "readonly", path: "/vueVersion", readonly: true },
          { key: "viteVersion", label: "vite", type: "readonly", path: "/viteVersion", readonly: true },
          {
            key: "vueRouterVersion",
            label: "vue-router",
            type: "readonly",
            path: "/vueRouterVersion",
            readonly: true
          },
          { key: "piniaVersion", label: "pinia", type: "readonly", path: "/piniaVersion", readonly: true },
          {
            key: "antDesignVueVersion",
            label: "ant-design-vue",
            type: "readonly",
            path: "/antDesignVueVersion",
            readonly: true
          }
        ]
      },
      {
        key: "files",
        title: "入口与配置文件",
        fields: [
          { key: "entryFiles", label: "入口文件", type: "json", path: "/entryFiles", readonly: true },
          { key: "configFiles", label: "配置文件", type: "json", path: "/configFiles", readonly: true },
          { key: "scripts", label: "scripts", type: "json", path: "/scripts", readonly: true }
        ]
      }
    ]
  });
}
