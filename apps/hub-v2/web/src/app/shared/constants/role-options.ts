export const ROLE_OPTIONS = [
    { label: '成员', value: 'member' },
    { label: '产品', value: 'product' },
    { label: 'UI', value: 'ui' },
    { label: '前端开发', value: 'frontend_dev' },
    { label: '后端开发', value: 'backend_dev' },
    { label: '测试', value: 'qa' },
    { label: '运维', value: 'ops' },
    { label: '项目管理员', value: 'project_admin' },
]

export const ROLE_LABELS: Record<string, string> = {
    member: '成员',
    product: '产品',
    ui: 'UI',
    frontend_dev: '前端开发',
    backend_dev: '后端开发',
    qa: '测试',
    ops: '运维',
    project_admin: '项目管理员',
}