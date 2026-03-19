## 状态
```plaintext
open
in_progress
resolved
verified
closed
reopened
```

含义：

| 状态          | 含义          |
| ----------- | ----------- |
| open        | 待处理         |
| in_progress | 处理中         |
| resolved    | 已处理（开发认为修复） |
| verified    | 已验证通过       |
| closed      | 已关闭         |
| reopened    | 重新打开        |


## 状态流转
- 正常流程：
```plaintext
open
 ↓
in_progress
 ↓
resolved
 ↓
verified
 ↓
closed
```

- 验证失败：
```plaintext
resolved
 ↓
reopened
 ↓
in_progress
```

- 关闭后再次发现问题：
```plaintext
closed
 ↓
reopened
 ↓
in_progress
```

## 权限矩阵

| 动作       | 权限人                                        | 状态                          |
| -------- | ------------------------------------------ | --------------------------- |
| 创建 | 任何成员                                       | -                           |
| 编辑 | reporter / admin | open, reopened |
| 指派负责人    | reporter / admin                           | open, reopened              |
| 认领 | 任何成员                                       | open, reopened              |
| 放弃认领 | assignee | open, reopened |
| 转派负责人    | assignee / admin                           | open, in_progress, reopened |
| 添加参与人    | assignee / admin                           | open, in_progress, reopened |
| 开始处理     | assignee / admin                           | open, reopened              |
| 标记已处理    | assignee / admin                           | in_progress                 |
| 重新处理 | assignee/ admin | resolved |
| 验证通过     | verifier / reporter / admin                | resolved                    |
| 验证不通过    | verifier / reporter / admin                | resolved                    |
| 关闭 Issue | reporter / admin                           | 全状态                  |
| 重新打开     | reporter / admin                           | resolved, verified, closed  |
| 评论       | 任何成员                                       | 全状态                         |
| 上传附件     | 任何成员                                       | 全状态                         |
| 删除附件     | uploader / assignee / admin                | 非 closed                    |

## 角色说明

| 角色           | 含义        |
| ------------ | --------- |
| reporter     | Issue 提出人 |
| assignee     | Issue 负责人 |
| participants | 参与协作人员    |
| admin        | 项目管理员     |

验证人规则：verifier = reporter（默认）


## 操作

### open 状态
**含义：** Issue 刚创建，还没人处理。

**reporter 可以：**
- 编辑 Issue
- 指派负责人
- 关闭 Issue
- 添加附件
- 评论

**assignee（如果已经被指派）可以：**
- 开始处理
- 放弃认领
- 转派负责人
- 添加参与人
- 评论
- 上传附件

**其他成员可以：**
- 认领（如果没有被指派）
- 评论
- 上传附件

### in_progress 状态

**含义：** 负责人已经开始处理。

**assignee 可以:**

- 标记已处理（resolve）
- 转派负责人
- 添加参与人
- 评论
- 上传附件

**其他成员可以：**

- 评论
- 上传附件

### resolved 状态

**reporter / verifier可以：**

- 验证通过
- 验证不通过
- 评论
- 上传附件

**assignee可以：**

- 标记为处理中
- 评论
- 上传附件

**其他成员可以：**

- 评论
- 上传附件

### verified 状态

**含义：**验证通过，等待关闭

**reporter可以：**
- 关闭 Issue
- 重新打开
- 评论

**其他成员可以：**

- 评论

### closed 状态
**含义：** 生命周期结束。

**reporter可以：**
- 重新打开
- 评论

**其他成员可以：**
- 评论

### reopened 状态

**含义：** 验证失败或重新发现问题。行为基本等同`open`。

## 派生状态
### 我的待办 todo
#### 场景
dashboard 点击“待我处理” 跳转到issue 列表，查询我的待办，包含所有的项目的待办事项

#### 请求url
GET /api/admin/issues/todo

#### 说明

todo: 包含 open、reopened、in_progreass 状态

同时支持分页和筛选，支持的 query 参数有：
projectId、priority、type、keyword、page、pageSize

行为是：
不传 projectId 时，查当前用户所属的所有项目
传了 projectId 时，只查该项目；如果当前用户不属于该项目，返回空列表
结果只返回“指派给当前用户”的待办 issue

