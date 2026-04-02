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
  TOKEN_SCOPE_FORBIDDEN: 'Token 权限不足，无法执行该操作',
  TOKEN_PROJECT_FORBIDDEN: 'Token 无权访问该项目',
  TOKEN_NOT_FOUND: 'Token 不存在或已失效',
  INTERNAL_ERROR: '服务暂时不可用，请稍后重试'
};

export function resolveApiErrorMessage(code: string | undefined, fallback: string): string {
  if (!code) {
    return fallback;
  }
  return API_ERROR_MESSAGES[code] || fallback;
}
