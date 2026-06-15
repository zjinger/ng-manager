const API_ERROR_MESSAGES: Record<string, string> = {
  AUTH_UNAUTHORIZED: '登录状态已失效，请重新登录',
  AUTH_FORBIDDEN: '当前账号没有访问权限',
  VALIDATION_ERROR: '请求参数校验失败',
  PROJECT_INACTIVE: '项目已归档，仅支持查看',
  PROJECT_ACCESS_DENIED: '无权限执行该操作',
  PROJECT_MEMBER_NOT_FOUND: '当前用户不是项目成员，无法执行该操作',
  PROJECT_DISPLAY_CODE_CONFLICT: '项目标识已存在，请更换后重试',
  PROJECT_OWNER_IMMUTABLE: '创建者不可修改或移除',
  PROJECT_MEMBER_EXISTS: '该成员已在项目中',
  PROJECT_NOT_FOUND: '项目不存在或已删除',
  USER_ALREADY_EXISTS: '登录名已存在，请更换',
  USER_NOT_FOUND: '用户不存在或已删除',
  ISSUE_NOT_FOUND: '测试单不存在或已删除',
  ISSUE_EDIT_FORBIDDEN: '仅提报人可编辑该测试单',
  ISSUE_ASSIGN_FORBIDDEN: '当前状态不允许指派负责人',
  ISSUE_CLAIM_FORBIDDEN: '当前测试单不可认领',
  ISSUE_PARTICIPANT_FORBIDDEN: '当前用户无权管理协作人',
  ISSUE_INVALID_TRANSITION: '当前状态不可执行该操作',
  RD_ITEM_NOT_FOUND: '研发项不存在或已删除',
  RD_EDIT_FORBIDDEN: '当前用户无权编辑研发项',
  RD_STAGE_FORBIDDEN: '当前用户无权变更研发阶段',
  RD_PROGRESS_FORBIDDEN: '当前用户无权调整进度',
  RD_BLOCK_FORBIDDEN: '当前用户无权设置阻塞',
  RD_STAGE_TASK_PLAN_RANGE_REQUIRED: '请先选择研发项计划开始和计划结束，再填写阶段任务计划时间',
  RD_STAGE_TASK_PLAN_START_OUT_OF_RANGE: '阶段任务计划开始需在研发项计划周期内',
  RD_STAGE_TASK_PLAN_END_OUT_OF_RANGE: '阶段任务计划结束需在研发项计划周期内',
  RD_STAGE_TASK_PLAN_ORDER_INVALID: '阶段任务计划开始不能晚于计划结束',
  RD_STAGE_TASKS_INCOMPLETE: '请先完成当前阶段任务，再完成研发项',
  TOKEN_SCOPE_FORBIDDEN: 'Token 权限不足，无法执行该操作',
  TOKEN_PROJECT_FORBIDDEN: 'Token 无权访问该项目',
  TOKEN_NOT_FOUND: 'Token 不存在或已失效',
  TOKEN_LIMIT_EXCEEDED: '最多创建 5 个 Token，请删除已撤销记录后再创建',
  MOBILE_APP_DOWNLOAD_NOT_CONFIGURED: '该项目暂未配置移动端 APP 下载页',
  MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND: '移动端 APP 安装包不存在或已失效',
  MOBILE_APP_VERSION_NOT_FOUND: '移动端 APP 版本不存在或已删除',
  MOBILE_APP_VERSION_CONFLICT: '该平台下相同版本号和构建号已存在',
  MOBILE_APP_VERSION_PACKAGE_REQUIRED: '请先上传安装包再创建版本',
  MOBILE_APP_VERSION_PACKAGE_INVALID: '安装包无效，请上传匹配平台的 APK 或 IPA 文件',
  MOBILE_APP_VERSION_PUBLISH_FAILED: '版本发布失败，请稍后重试',
  MOBILE_APP_PORTAL_SETTINGS_INVALID: '移动端 APP 门户配置格式有误',
  INTERNAL_ERROR: '服务暂时不可用，请稍后重试'
};

export function resolveApiErrorMessage(code: string | undefined, fallback: string): string {
  if (!code) {
    return fallback;
  }
  return API_ERROR_MESSAGES[code] || fallback;
}
