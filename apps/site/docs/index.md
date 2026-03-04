---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "NG-MANAGER"
  text: "本地优先的工程管理与自动化控制台"
  tagline: 统一管理项目、任务、依赖、配置、API 调试与桌面工作流，减少在终端、IDE、浏览器之间来回切换。
  image:
    src: /hero-dashboard.png
    alt: NG-MANAGER 产品界面示意图
  actions:
    - theme: brand
      text: 5 分钟开始
      link: /getting-started/
    - theme: alt
      text: 使用指南
      link: /guides/

features:
  - title: 一个入口管理本地工程
    details: 汇聚项目导入、依赖分析、任务编排与配置维护，适合前端、Node 与多仓库协作场景。
  - title: 面向日常开发的控制平面
    details: 将常用的 dev、build、test、lint 等任务集中在统一界面里执行，减少命令记忆成本。
  - title: 支持桌面端与 CLI
    details: 可通过 Electron 桌面壳启动，也可以直接使用 `ngm` 命令拉起本地服务与 Web UI。

---

## 适用场景

- 管理多个前端或 Node 项目时，需要统一入口查看任务、日志和依赖。
- 希望把“启动服务、打开页面、看日志、改配置”整合为一套本地工作台。
- 需要一个可扩展的本地控制平面，后续可接入更多工程自动化能力。

## 文档结构

- [快速开始](/getting-started/)：安装、启动、导入项目、执行第一个任务。
- [使用指南](/guides/)：项目管理、任务执行、日志排障、CLI。
- [下载](/download)：桌面端、CLI 与源码接入方式。

> 当前文档默认使用蓝色系配色。如需切换配色方案，可在浏览器控制台执行以下命令    
> 恢复默认方案执行：  
> `window.__ngmSetPalette('default')`         
> 蓝色系方案则执行：  
> `window.__ngmSetPalette('product')`
