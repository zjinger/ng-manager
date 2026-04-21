import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "NG-MANAGER",
  description: "Local-first 工程管理与自动化平台（Local Control Plane）",
  base: "/", // IP:PORT 访问就是根路径
  srcDir: "docs", // 文档文件夹
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }]
  ],
  appearance: true,

  themeConfig: {
    logo: "/logo.png",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: "起步", link: "/getting-started/" },
      { text: "指南", link: "/guides/" },
      { text: 'hub-v2', link: "/hub-v2/" },
      { text: "下载", link: "/download/" }
    ],
    sidebar: {
      "/getting-started/": [
        {
          text: "快速开始",
          items: [
            { text: "5 分钟上手", link: "/getting-started/" }
          ]
        }
      ],
      "/guides/": [
        {
          text: "基础流程",
          items: [
            { text: "总览", link: "/guides/" },
            { text: "项目管理", link: "/guides/projects" },
            { text: "任务执行", link: "/guides/tasks" },
            { text: "日志与排障", link: "/guides/logs" },
            { text: "CLI", link: "/guides/cli" }
          ]
        },
        {
          text: "功能页面",
          items: [
            { text: "仪表盘", link: "/guides/dashboard" },
            { text: "依赖管理", link: "/guides/dependencies" },
            { text: "配置编辑", link: "/guides/configuration" },
            { text: "API 调试", link: "/guides/api-client" },
            { text: "雪碧图", link: "/guides/sprite" }
          ]
        }
      ],
      "/hub-v2/": [
        {
          text: "方案与实施文档",
          items: [
            { text: "使用指南", link: "/hub-v2/" },
            { text: "设计方案", link: "/hub-v2/01-hub-redesign-implementation-plan" },
            { text: "架构设计", link: "/hub-v2/02-architecture-design" },
            { text: "数据库设计", link: "/hub-v2/03-database-design" },
            { text: "API 设计", link: "/hub-v2/04-api-design" },
            { text: "实施路线图", link: "/hub-v2/05-implementation-roadmap" },
            { text: "Web 端架构设计", link: "/hub-v2/06-web-architecture" },
            { text: "通知机制", link: "/hub-v2/18-notification-mechanism" }
          ]
        }
      ],
      "/": [
        {
          text: "文档",
          items: [
            { text: "起步", link: "/getting-started/" },
            { text: "指南", link: "/guides/" },
            { text: "hub-v2 方案与实施文档", link: "/hub-v2" },
            { text: "下载", link: "/download" }
          ]
        }
      ]
    },
    search: {
      provider: "local"
    },
    socialLinks: [
      { icon: 'github', link: 'http://192.168.1.10:7777/summary/~zhangj%2Fng-manager.git' }
    ],
    footer: {
      message: "ng-manager — Local-first 工程管理与自动化平台",
      copyright: "Copyright ©2026 NG-MANAGER Team"
    }
  }
})
