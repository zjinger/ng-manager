# Hub V2 全局错误码规范

## 1. 目标

统一 Hub V2 服务端错误码与前端拦截处理，确保：

- 同类错误在各模块返回一致 `code`
- 服务端响应结构稳定，便于前端集中处理
- 新增错误具备明确登记流程，避免字符串散落

---

## 2. 统一响应格式

服务端错误响应统一为：

```json
{
  "code": "PROJECT_INACTIVE",
  "message": "project is archived and read only",
  "details": {}
}
```

- `code`: 业务错误码（稳定标识）
- `message`: 默认文案或模块覆盖文案
- `details`: 可选扩展信息（校验明细等）

---

## 3. 服务端实现约束

### 3.1 错误码注册表

所有错误码在以下文件集中维护：

- `apps/hub-v2/server/src/shared/errors/error-codes.ts`

每个错误码必须包含：

- `code`
- `statusCode`
- `message`

### 3.2 抛错规范

业务代码统一使用：

```ts
throw new AppError(ERROR_CODES.PROJECT_INACTIVE);
```

允许按需覆盖文案/状态码：

```ts
throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "无权限执行该操作，需要项目管理员权限", 403);
```

禁止直接使用字符串字面量错误码：

```ts
// 禁止
throw new AppError("PROJECT_INACTIVE", "...");
```

### 3.3 全局错误处理

统一由 `error-handler.plugin.ts` 输出错误响应：

- `AppError`：按错误码定义进行归一化响应
- `ZodError`：统一返回 `VALIDATION_ERROR`
- 其他未处理异常：统一返回 `INTERNAL_ERROR`

---

## 4. 前端拦截约束

前端统一在以下位置进行错误码映射：

- `apps/hub-v2/web/src/app/core/http/api-error-messages.ts`
- `apps/hub-v2/web/src/app/core/http/api-error.interceptor.ts`

规则：

- 优先使用错误码映射文案
- 映射缺失时回退到后端 `message`
- `5xx` 统一兜底为服务不可用提示

---

## 5. 新增错误码流程

新增错误码必须按以下步骤执行：

1. 在 `error-codes.ts` 新增 `ERROR_CODES.XXX`
2. 在 `BASE_ERROR_DEFINITIONS` 补齐 `statusCode/message`
3. 业务代码使用 `ERROR_CODES.XXX` 抛错
4. 前端若需更友好提示，在 `api-error-messages.ts` 增加映射
5. 联调验证对应接口返回的 `code/message` 是否符合预期

---

## 6. 当前基线

截至本版本，Hub V2 已完成：

- 服务端 `new AppError("XXX")` 字符串写法收敛为 `ERROR_CODES.XXX`
- 全局错误处理器统一归一化输出
- 前端错误拦截集中映射（含项目归档等关键错误）

后续新增模块必须遵循本规范，不再引入散装错误码。

