# 06 Web 端架构设计

## 1. 文档目的

本文档用于冻结 `apps/hub-v2/web` 的前端目标结构，作为后续 UI 落地、目录重构、组件抽象和功能实现的统一基线。

本文档重点回答四个问题：

- 为什么采用当前的 `core / shared / features` 三层结构
- UI 设计稿如何映射成前端目录和组件边界
- 状态、路由、弹层、复用组件应该如何分层
- 从当前 `web` 骨架迁移到目标结构时，实施顺序应如何安排

本文档不覆盖：

- 具体接口字段定义
- 组件像素级样式细节
- 单个页面的交互细节说明

---

## 2. 背景与设计依据

当前 `hub-v2` 的前端已经具备基础路由、鉴权和最小页面骨架，但整体仍处于“可跑通”而非“可长期演进”的状态。

现状问题主要有：

- Shell 结构尚未完整成型，侧边栏、顶栏、面包屑、项目切换等系统级 UI 还未成为稳定布局层
- 复用组件体系尚未建立，页面后续容易重复实现表格、筛选栏、状态标签、详情侧栏等通用块
- Feature 目录虽然已经开始按路由拆分，但 store、service、model 和 page/component 的边界尚未统一
- 当前 UI 设计稿已经明确呈现出“强后台工作台”的信息架构，前端目录结构需要与之对齐

本次前端架构设计以以下输入为基础：

- `hub-v2-index-2.html` 对应的工作台 UI 设计
- 现有 `apps/hub-v2/web` 路由骨架
- 已经落地的 `hub-v2 server` 模块能力

---

## 3. 总体设计原则

### 3.1 分层原则

前端按三层组织：

- `core`
  - 系统级能力
  - 全局布局
  - 鉴权
  - HTTP
  - 全局状态
  - 导航
- `shared`
  - 可跨 feature 复用的 UI、业务选择器、pipe、directive、常量
- `features`
  - 按业务域组织的页面、组件、对话框、store、API service、model

### 3.2 依赖方向

依赖方向固定为：

- `features -> shared -> core`
- `features -> core`
- `shared -> core`

禁止：

- `core -> features`
- `shared -> features`
- feature 之间直接耦合组件或 store

Feature 间如果需要共享能力，应通过：

- `core/state`
- `shared/business`
- 或后端 API + feature service

### 3.3 UI 组织原则

这版 UI 不是“页面堆叠式站点”，而是“壳层驱动的后台工作台”，所以必须先稳定三类结构：

- 壳层组件
  - sidebar
  - topbar
  - breadcrumb
  - project-switcher
- 通用工作台组件
  - page-header
  - page-toolbar
  - stat-card
  - data-table
  - side-detail-layout
- 业务组件
  - issue detail block
  - rd board
  - content tabs
  - project member table

---

## 4. 目标目录结构

目标目录如下：

```text
src/app
├─ app.config.ts
├─ app.routes.ts
├─ app.component.ts
│
├─ core/
│  ├─ auth/
│  ├─ http/
│  ├─ layout/
│  ├─ navigation/
│  ├─ overlays/
│  ├─ state/
│  ├─ utils/
│  └─ types/
│
├─ shared/
│  ├─ ui/
│  ├─ business/
│  ├─ pipes/
│  ├─ directives/
│  └─ constants/
│
├─ features/
│  ├─ dashboard/
│  ├─ issues/
│  ├─ rd/
│  ├─ content/
│  ├─ projects/
│  ├─ users/
│  ├─ shared-config/
│  ├─ notifications/
│  └─ profile/
│
├─ styles/
└─ assets/
```

---

## 5. Core 层设计

### 5.1 `core/auth`

职责：

- 登录、登出、会话恢复
- 当前用户信息
- 鉴权守卫
- 请求附带认证信息

建议文件：

- `auth.service.ts`
  - 对接后端 `/auth/*`
- `auth.store.ts`
  - 保存当前用户、登录态、初始化状态
- `auth.guard.ts`
  - 路由访问控制
- `auth.interceptor.ts`
  - 401 处理、cookie/session 协同
- `auth.types.ts`

约束：

- 业务页面不得直接操作 session 细节
- 登录态唯一来源应为 `auth.store`

### 5.2 `core/http`

职责：

- 统一 API 调用入口
- 统一响应解包
- 统一错误转换
- 注入 base URL

建议文件：

- `api-client.service.ts`
- `api-response.ts`
- `api-error.ts`
- `api-error.interceptor.ts`
- `api-base-url.token.ts`

约束：

- feature 不直接使用裸 `HttpClient`
- 所有接口调用优先走 `ApiClientService`

### 5.3 `core/layout`

职责：

- 提供工作台壳层
- 组织 sidebar / topbar / breadcrumb / project-switcher

建议组件：

- `app-shell`
- `sidebar`
- `topbar`
- `breadcrumb`
- `project-switcher`

约束：

- 壳层只负责布局、导航、全局入口
- 壳层不处理具体业务查询

### 5.4 `core/navigation`

职责：

- 菜单配置
- 面包屑元信息
- 导航模型

建议文件：

- `nav.config.ts`
- `breadcrumb.service.ts`
- `menu.types.ts`

关键要求：

- sidebar 菜单必须由配置驱动
- breadcrumb 不应由页面手写字符串拼接

### 5.5 `core/overlays`

职责：

- 统一 modal、drawer、confirm 的打开方式

建议文件：

- `modal.service.ts`
- `drawer.service.ts`
- `confirm.service.ts`

约束：

- 弹层调用入口统一
- Feature 不直接散落使用底层弹层 API

### 5.6 `core/state`

职责边界必须提前冻结。

建议拆分为：

- `app.store.ts`
  - 应用启动状态
  - 当前会话是否已初始化
  - 全局错误或全局 loading
- `ui.store.ts`
  - sidebar 折叠
  - 全局视图模式偏好
  - 顶层 UI 状态
- `project-context.store.ts`
  - 当前项目
  - 可访问项目列表
  - 项目切换

禁止：

- 将 feature 的列表/详情状态塞入 `core/state`

### 5.7 `core/utils` 与 `core/types`

职责：

- 放全局纯函数
- 放通用类型定义

要求：

- `utils` 必须无状态
- `types` 不应掺杂 feature 业务类型

---

## 6. Shared 层设计

### 6.1 `shared/ui`

用于沉淀高复用界面组件。

建议分三类理解：

- 展示型
  - `stat-card`
  - `empty-state`
  - `loading-state`
  - `user-avatar`
  - `project-avatar`
  - `status-badge`
  - `priority-badge`
- 表单型
  - `search-box`
  - `filter-bar`
  - `markdown-editor`
  - `file-upload`
  - `form-actions`
- 容器型
  - `data-table`
  - `side-detail-layout`
  - `activity-timeline`
  - `page-header`
  - `page-toolbar`

约束：

- `shared/ui` 不感知具体 feature store
- 组件输入输出尽量保持通用

### 6.2 `shared/business`

用于沉淀与业务有关但可跨 feature 复用的选择器和输入块。

例如：

- `project-member-select`
- `project-module-select`
- `project-version-select`
- `project-environment-select`
- `assignee-selector`

适用原则：

- 有明确业务语义
- 会被多个 feature 复用
- 不适合沉到 `shared/ui`

### 6.3 `pipes / directives / constants`

职责明确：

- `pipes`
  - 只做格式转换
- `directives`
  - 只做交互增强
- `constants`
  - 选项集、枚举映射、静态配置

---

## 7. Pages 层设计

### 7.1 内部统一结构

每个 模块 原则上按以下结构组织：

- `features`
  - 路由页面
- `components`
  - feature 内复用组件
- `dialogs`
  - feature 弹层
- `store`
  - feature 状态
- `services`
  - feature API 和业务编排
- `models`
  - DTO / view model / form model
- `routes.ts`
  - feature 路由

### 7.2 页面与组件边界

建议规则：

- `page`
  - 负责路由参数、页面级布局、组合 store 和组件
- `component`
  - 负责局部展示和交互
- `dialog`
  - 负责局部流程输入

禁止：

- page 中堆积大段细碎业务 DOM
- component 里直接发请求且自行管理全局状态

### 7.3 Store 边界

优先将复杂 features 拆成多个 store。

例如 `issues`：

- `issue-list.store.ts`
- `issue-detail.store.ts`

原因：

- 列表态和详情态生命周期不同
- 筛选条件、分页、视图切换不应污染详情页状态

这个规则建议推广到：

- `projects`
- `content`

### 7.4 Services 边界

建议拆成：

- `xxx-api.service.ts`
  - 纯接口访问
- `xxx-form.service.ts`
  - 表单转换和默认值
- `xxx-permission.service.ts`
  - 基于用户和状态的前端权限判断

这样能避免一个 service 同时承担 HTTP、视图模型和权限逻辑。

---

## 8. UI 设计稿到目录的映射

### 8.1 Shell 映射

设计稿中的：

- 左侧 Sidebar
- 顶部 Topbar
- 项目切换器
- 用户入口
- 通知入口

应映射到：

- `core/layout/app-shell`
- `core/layout/sidebar`
- `core/layout/topbar`
- `core/layout/project-switcher`
- `features/notifications` 或 `core/layout` 下通知入口

### 8.2 Dashboard 映射

设计稿中的：

- 统计卡
- 我的待办
- 待验证
- 最新公告

应映射到：

- `features/dashboard/features/dashboard-page`
- `features/dashboard/components/dashboard-stat-grid`
- `features/dashboard/components/my-todos-card`
- `features/dashboard/components/pending-verification-card`
- `features/dashboard/components/latest-announcements-card`

### 8.3 Issues 映射

设计稿中的：

- 列表 / 卡片双视图
- 详情侧栏
- 状态流
- 评论区
- 协作者
- 附件
- 多类操作弹窗

应映射到：

- `issue-list-page`
- `issue-detail-page`
- `issue-filter-bar`
- `issue-list-table`
- `issue-card-grid`
- `issue-detail-header`
- `issue-state-flow`
- `issue-activity-timeline`
- `issue-comment-editor`
- `issue-props-panel`
- `issue-collaborators-panel`
- `issue-attachments-panel`
- `issue-create-dialog`
- `issue-edit-dialog`
- `issue-transition-dialog`
- `issue-assign-dialog`

### 8.4 RD 映射

设计稿中的：

- board / list 双视图
- 列卡片
- filter bar

应映射到：

- `rd-board-page`
- `rd-filter-bar`
- `rd-board`
- `rd-column`
- `rd-card`
- `rd-list-table`

### 8.5 Content 映射

设计稿中的：

- 公告 / 文档 / 发布三类内容共用一个管理入口

建议映射为：

- `features/content/features/content-management-page`
- `content-tabs`
- `announcement-list`
- `document-list`
- `release-list`

但代码层面应保留三类内容各自的 store / service / model。

---

## 9. 关键设计约束

### 9.1 `content` 是聚合入口，不是大杂烩模块

`content` 可以作为统一页面入口，但内部必须分拆：

- `announcement.store.ts`
- `document.store.ts`
- `release.store.ts`

禁止将三类内容揉进一个超大 store 或一个超大 API service。

### 9.2 `notifications` 当前建议先轻实现

如果当前阶段只做：

- bell
- dropdown
- 未读提示

那么它更接近壳层能力。

如果后续要做：

- 通知中心页面
- 分类筛选
- 已读管理
- 订阅偏好

再升级成独立 feature。

### 9.3 Dialog / Drawer / Page 的分工

建议提前固定规则：

- `dialog`
  - create / edit / assign / confirm transition
- `drawer`
  - 较长表单或非主路径侧向查看
- `page`
  - 详情主入口、深链接页面

建议：

- `issue detail` 使用 page
- `create / edit / assign / transition` 使用 dialog

### 9.4 共享组件必须基于设计 token

所有共享组件应优先消费：

- `styles/_variables.less`
- `styles/_theme.less`
- `styles/_zorro-overrides.less`

禁止在 feature 组件中重复定义整套颜色、间距和圆角体系。

---

## 10. 状态管理建议

建议采用“全局小而稳，feature 自治”的策略。

### 10.1 全局状态

- `auth.store`
- `app.store`
- `ui.store`
- `project-context.store`

### 10.2 Feature 状态

适合进入 feature store 的内容：

- 列表数据
- 分页
- 筛选条件
- 当前详情数据
- 当前 feature 的 loading / submitting
- 当前弹层所需上下文

不建议进入 feature store 的内容：

- 纯展示计算
- 可由 route param 直接得到的值
- 临时单个输入框本地值

---

## 11. 路由设计建议

现有 `app.routes.ts` 已经是正确方向，应继续强化：

- `app.routes.ts`
  - 只做顶层壳层和 feature 懒加载
- `features/*/routes.ts`
  - 只定义 feature 内路由

建议每个 feature 都采用独立 `routes.ts`。

对于复杂 feature：

- `issues`
  - `/issues`
  - `/issues/:issueId`
- `rd`
  - `/rd`
  - `/rd/:itemId` 可后续视需要补

---

## 12. 从当前代码到目标结构的迁移建议

当前 `apps/hub-v2/web` 已有基础路由、鉴权和最小配置，不建议推倒重来，建议逐步迁移。

### 阶段 A：先重构 Core

输出：

- `core/auth`
- `core/http`
- `core/layout`
- `core/navigation`
- `core/state`

目标：

- 壳层稳定
- 全局状态稳定
- API 调用方式统一

### 阶段 B：建立 Shared UI 基础库

优先实现：

- `page-header`
- `page-toolbar`
- `stat-card`
- `status-badge`
- `priority-badge`
- `empty-state`
- `loading-state`
- `data-table`
- `side-detail-layout`

目标：

- 避免 feature 开发时重复造轮子

### 阶段 C：先落 Dashboard

原因：

- 依赖壳层最明显
- 组件复用密度高
- 接口简单
- 能最快验证这版 UI 风格是否跑通

### 阶段 D：再落 Issues

原因：

- `issues` 是这套前端结构最复杂、最能暴露架构问题的模块

### 阶段 E：RD / Content / Projects / Users / Shared Config / Profile

后续按依赖和复杂度逐步推进。

---

## 13. 编码前冻结清单

在开始大规模编码前，建议冻结以下事项：

1. `core/state` 的职责边界
2. `content` 的内部拆分方式
3. `dialog / drawer / page` 的使用规范
4. `shared/ui` 的组件分层规则
5. `nav.config.ts` 的菜单元信息结构
6. `project-context.store` 作为项目上下文唯一来源
7. 统一 `api-client` 调用规范

---


