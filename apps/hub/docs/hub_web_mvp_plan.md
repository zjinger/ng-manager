# hub-web MVP 方案

## 1. 定位

`hub-web` 是 `ngm-hub-server` 的管理端与公共内容承载前端。

当前阶段只做两类页面：

### 1.1 管理端页面
- 登录页
- Dashboard 首页
- 公告管理页
- 文档管理页
- 配置管理页
- 反馈列表页
- 首次登录改密页 / 强制弹窗

### 1.2 公共页面（可选，先预留）
- 公告列表页
- 文档列表页
- 文档详情页

MVP 阶段建议 **优先完成管理端**，公共展示页可以晚一点再补。

---

## 2. 技术路线建议

## 推荐结论

继续使用：

- Angular 20
- Standalone Components
- Angular Router
- HttpClient
- Signals 管理页面本地状态
- NG-ZORRO 作为基础 UI

## 不建议当前阶段引入

- NgRx
- 微前端
- SSR
- 复杂主题系统
- 富文本编辑器

### 原因

`hub-web` 当前目标是尽快接通 `ngm-hub-server` 的管理能力，不是做复杂门户站点。以 Angular Standalone + Signal 为主就够了。

---

## 3. 建议目录结构

```text
apps/hub-web/
  src/
    app/
      app.component.ts
      app.config.ts
      app.routes.ts

      core/
        constants/
          enums.ts
        guards/
          auth.guard.ts
          must-change-password.guard.ts
        http/
          api-client.ts
          http-error.interceptor.ts
        layout/
          admin-layout.component.ts
          auth-layout.component.ts
        services/
          auth.store.ts
          app-session.service.ts
          page-title.service.ts
        models/
          api-response.model.ts
          auth.model.ts
          feedback.model.ts
          announcement.model.ts
          document.model.ts
          shared-config.model.ts

      shared/
        ui/
          page-header.component.ts
          status-tag.component.ts
          empty-state.component.ts
          markdown-preview.component.ts
        utils/
          date.util.ts
          query.util.ts

      features/
        auth/
          pages/
            login-page.component.ts
            change-password-page.component.ts
          services/
            auth.api.ts

        dashboard/
          pages/
            dashboard-page.component.ts

        feedback/
          pages/
            feedback-list-page.component.ts
            feedback-detail-drawer.component.ts
          services/
            feedback.api.ts

        announcement/
          pages/
            announcement-list-page.component.ts
            announcement-edit-page.component.ts
          services/
            announcement.api.ts

        document/
          pages/
            document-list-page.component.ts
            document-edit-page.component.ts
          services/
            document.api.ts

        config/
          pages/
            config-list-page.component.ts
            config-edit-drawer.component.ts
          services/
            shared-config.api.ts

      public-pages/
        announcements/
        documents/

    assets/
    styles.less
```

---

## 4. 页面路由设计

## 4.1 路由建议

```text
/auth/login
/auth/change-password

/admin
/admin/dashboard
/admin/feedbacks
/admin/announcements
/admin/announcements/new
/admin/announcements/:id/edit
/admin/documents
/admin/documents/new
/admin/documents/:id/edit
/admin/configs
```

---

## 4.2 app.routes.ts 建议

```ts
export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/pages/login-page.component').then(m => m.LoginPageComponent) },
      { path: 'change-password', loadComponent: () => import('./features/auth/pages/change-password-page.component').then(m => m.ChangePasswordPageComponent) }
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard, mustChangePasswordGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/pages/dashboard-page.component').then(m => m.DashboardPageComponent) },
      { path: 'feedbacks', loadComponent: () => import('./features/feedback/pages/feedback-list-page.component').then(m => m.FeedbackListPageComponent) },
      { path: 'announcements', loadComponent: () => import('./features/announcement/pages/announcement-list-page.component').then(m => m.AnnouncementListPageComponent) },
      { path: 'announcements/new', loadComponent: () => import('./features/announcement/pages/announcement-edit-page.component').then(m => m.AnnouncementEditPageComponent) },
      { path: 'announcements/:id/edit', loadComponent: () => import('./features/announcement/pages/announcement-edit-page.component').then(m => m.AnnouncementEditPageComponent) },
      { path: 'documents', loadComponent: () => import('./features/document/pages/document-list-page.component').then(m => m.DocumentListPageComponent) },
      { path: 'documents/new', loadComponent: () => import('./features/document/pages/document-edit-page.component').then(m => m.DocumentEditPageComponent) },
      { path: 'documents/:id/edit', loadComponent: () => import('./features/document/pages/document-edit-page.component').then(m => m.DocumentEditPageComponent) },
      { path: 'configs', loadComponent: () => import('./features/config/pages/config-list-page.component').then(m => m.ConfigListPageComponent) }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: 'admin' }
];
```

---

## 5. 页面职责拆解

## 5.1 登录页

职责：
- 输入用户名密码
- 调用 `/api/admin/auth/login`
- 保存当前登录状态
- 若 `mustChangePassword=true`，跳转 `/auth/change-password`
- 否则进入 `/admin/dashboard`

字段：
- username
- password

---

## 5.2 改密页

职责：
- 首次登录强制修改密码
- 调用 `/api/admin/auth/change-password`
- 改密成功后刷新 `/api/admin/auth/me`
- 再跳转 `/admin/dashboard`

字段：
- oldPassword
- newPassword
- confirmPassword

---

## 5.3 Dashboard 首页

当前阶段只做轻量概览：

展示：
- 未处理反馈数量
- draft 公告数量
- published 公告数量
- draft 文档数量
- public 配置数量
- 当前登录管理员信息

MVP 阶段可以通过多个列表接口临时聚合，不急着先做专门 dashboard API。

---

## 5.4 反馈列表页

字段展示：
- 标题
- 来源 source
- 分类 category
- 状态 status
- 客户端版本
- 联系方式
- 创建时间

功能：
- 按状态筛选
- 按分类筛选
- 关键字搜索
- 查看详情 Drawer
- 修改状态为 processing/resolved/closed

---

## 5.5 公告管理页

列表字段：
- 标题
- scope
- pinned
- status
- publishAt
- expireAt
- updatedAt

功能：
- 筛选 draft/published/archived
- 新建公告
- 编辑公告
- 发布公告
- 归档公告

编辑页字段：
- title
- summary
- contentMd
- scope
- pinned
- publishAt
- expireAt

当前阶段 `contentMd` 先用普通 `textarea`，不要急着接 Markdown 编辑器。

---

## 5.6 文档管理页

列表字段：
- title
- slug
- category
- status
- version
- updatedAt

功能：
- 新建文档
- 编辑文档
- 发布文档
- 归档文档
- 删除文档

编辑页字段：
- slug
- title
- category
- summary
- contentMd
- version

同样先使用 `textarea` 编辑 markdown。

---

## 5.7 配置管理页

列表字段：
- configKey
- valueType
- scope
- description
- updatedAt

功能：
- 新建配置
- 编辑配置
- 删除配置
- 按 scope 过滤
- 按关键字搜索

编辑字段：
- configKey（新建时可编辑，编辑时建议只读）
- configValue
- valueType
- scope
- description

---

## 6. API 对接约定

## 6.1 响应模型

建议统一模型：

```ts
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

---

## 6.2 Auth Store 设计

建议用一个轻量 signal store：

```ts
interface AuthState {
  profile: AdminUserProfile | null;
  loaded: boolean;
}
```

核心方法：
- `loadMe()`
- `login(payload)`
- `logout()`
- `changePassword(payload)`
- `isLoggedIn()`
- `mustChangePassword()`

### 关键约束

- 登录态以服务端 Cookie 为准
- 前端不自己存 token
- 页面刷新后，调用 `/api/admin/auth/me` 恢复会话

---

## 6.3 HTTP 封装建议

封一个极薄的 API Client：

```ts
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(url: string, params?: Record<string, any>) {
    return this.http.get<ApiResponse<T>>(url, {
      params,
      withCredentials: true
    });
  }

  post<T>(url: string, body?: unknown) {
    return this.http.post<ApiResponse<T>>(url, body ?? {}, {
      withCredentials: true
    });
  }

  put<T>(url: string, body?: unknown) {
    return this.http.put<ApiResponse<T>>(url, body ?? {}, {
      withCredentials: true
    });
  }

  delete<T>(url: string) {
    return this.http.delete<ApiResponse<T>>(url, {
      withCredentials: true
    });
  }
}
```

---

## 7. 管理端 UI 布局建议

## 7.1 AdminLayout

采用典型后台布局：

- 左侧菜单
- 顶部用户区
- 主内容区

左侧菜单：
- Dashboard
- 反馈管理
- 公告管理
- 文档管理
- 配置管理

顶部区：
- 当前管理员昵称 / 用户名
- 修改密码
- 退出登录

---

## 7.2 风格建议

MVP 阶段遵循：

- 以信息密度和可维护性优先
- 少动画
- 少装饰
- 表单和表格优先
- 统一使用 NG-ZORRO 的 Layout / Menu / Table / Form / Drawer / Modal

不要现在就做：
- 多主题
- 品牌官网化视觉
- 卡片化大屏风格

---

## 8. 推荐开发顺序

### 第一阶段
- 初始化 Angular 工程
- 接入 NG-ZORRO
- 搭建 app routes
- 搭建 auth store
- 完成 login / me / logout / change-password
- 完成 admin layout

### 第二阶段
- 完成 feedback 列表页
- 完成 announcement 列表页与编辑页

### 第三阶段
- 完成 document 列表页与编辑页
- 完成 shared-config 列表页与编辑 drawer

### 第四阶段
- 补 dashboard 统计页
- 补公共内容展示页（可选）

---

## 9. 我给出的推荐起步方式

建议不要一开始就把所有页面一起铺开，而是按下面顺序启动：

1. `auth + layout`
2. `feedback list`
3. `announcement list + edit`
4. `document list + edit`
5. `config list + edit`

这样最稳，因为：
- 能尽快验证鉴权闭环
- 能尽快把主线内容模型接通
- 不会一开始就陷入公共页或复杂 UI 细节

---

## 10. 下一步可直接进入的内容

下一步最适合直接产出的是：

### 方案 A
生成 `hub-web` 的 **Angular 20 最小工程骨架代码**，包括：
- `app.routes.ts`
- `app.config.ts`
- `auth.store.ts`
- `api-client.ts`
- `auth guard`
- `admin layout`
- `login page`
- `change-password page`

### 方案 B
先给出 `hub-web` 的页面原型与交互说明。

当前项目阶段更推荐 **方案 A**。

