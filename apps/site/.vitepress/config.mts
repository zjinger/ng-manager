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
          text: "总览",
          items: [
            { text: "使用指南", link: "/hub-v2/" },
            { text: "当前实现总览", link: "/hub-v2/22-current-implementation-overview" },
            { text: "架构设计", link: "/hub-v2/02-architecture-design" },
            { text: "数据库设计", link: "/hub-v2/03-database-design" },
            { text: "API 设计", link: "/hub-v2/04-api-design" },
            { text: "Web 端架构", link: "/hub-v2/06-web-architecture" },
            { text: "设计方案", link: "/hub-v2/01-hub-redesign-implementation-plan" }
          ]
        },
        {
          text: "协作域",
          items: [
            { text: "Issue 权限矩阵", link: "/hub-v2/11-issue-permission-matrix" },
            { text: "RD 权限矩阵", link: "/hub-v2/10-rd-permission-matrix" },
            { text: "RD 产品需求", link: "/hub-v2/11-rd-product-requirements" },
            { text: "Issue 与 RD 关联", link: "/hub-v2/24-issue-rd-link" },
            { text: "RD UI 设计", link: "/hub-v2/30-rd-ui-specification" },
            { text: "RD 回归清单", link: "/hub-v2/31-rd-closure-regression-checklist" },
            { text: "项目模块 Phase 2", link: "/hub-v2/29-project-module-phase2-design" },
            { text: "通知机制", link: "/hub-v2/18-notification-mechanism" },
            { text: "WS 实时通知", link: "/hub-v2/14-ws-realtime-notification" },
            { text: "上传生命周期", link: "/hub-v2/19-upload-lifecycle-and-cleanup" }
          ]
        },
        {
          text: "项目与组织治理",
          items: [
            { text: "项目规则与流转", link: "/hub-v2/15-project-governance-rules" },
            { text: "项目治理 RBAC", link: "/hub-v2/16-project-governance-rbac-design" },
            { text: "用户状态与登录", link: "/hub-v2/21-user-status-and-login-semantics" },
            { text: "RBAC 收口清单", link: "/hub-v2/20-rbac-convergence-checklist" },
            { text: "错误码治理", link: "/hub-v2/16-error-code-governance" }
          ]
        },
        {
          text: "财务与审批",
          items: [
            { text: "财务与审批总览", link: "/hub-v2/23-finance-approval-overview" },
            { text: "授权底座", link: "/hub-v2/25-authorization-foundation-design" },
            { text: "报销 API 契约", link: "/hub-v2/26-reimbursement-api-contract" },
            { text: "报销 API 示例", link: "/hub-v2/27-reimbursement-api-examples" },
            { text: "单工作台融合", link: "/hub-v2/28-unified-dashboard-design" }
          ]
        },
        {
          text: "集成与公开能力",
          items: [
            { text: "Token 接入", link: "/hub-v2/13-api-token-integration" },
            { text: "API 设计", link: "/hub-v2/04-api-design" }
          ]
        },
        {
          text: "迁移与运维",
          items: [
            { text: "实施路线图", link: "/hub-v2/05-implementation-roadmap" },
            { text: "数据迁移映射", link: "/hub-v2/08-migration-mapping" },
            { text: "迁移执行 Runbook", link: "/hub-v2/09-migration-runbook" },
            { text: "内网部署与迁移", link: "/hub-v2/12-deploy-intranet" },
            { text: "发布流程", link: "/hub-v2/17-release-process" }
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
