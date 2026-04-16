# 研发管理模块产品需求文档（PRD）

> 版本：v1.0  
> 日期：2026-04-16  
> 作者：AI Agent  
> 状态：草案

---

## 一、背景与目标

### 1.1 背景

当前研发管理模块存在以下问题：

1. **角色单一**：执行人仅支持单人，无法满足多人协作的开发任务场景
2. **角色命名不准确**："确认人"语义模糊，实际承担的是验收职责
3. **时间管理缺失**：仅有计划时间，无实际时间统计，无法进行效能分析
4. **进度管理粗放**：单人进度无法体现多人协作的贡献

### 1.2 目标

1. 支持多人协作的研发项管理
2. 明确角色职责边界，提升协作效率
3. 建立完整的时间跟踪体系，支持效能分析
4. 保持向后兼容，最小化数据库变更

### 1.3 成功指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 多人协作任务占比 | 0% | ≥30% |
| 实际时间记录覆盖率 | 0% | 100%（新任务） |
| 按时完成率统计 | 不可用 | 可用 |

---

## 二、用户角色定义

### 2.1 核心角色

| 角色 | 英文标识 | 数据库字段 | 职责 |
|------|----------|------------|------|
| 创建人 | Creator | `creator_id` | 创建研发项、编辑基本信息、删除 |
| 团队成员 | Members | `member_ids` (全员) | 更新个人进度、参与讨论 |
| 验证人 | Verifier | `verifier_id` (重命名) | 验收任务、确认完成质量 |
| 项目管理员 | Admin | `project_members.role_code` | 项目级管理权限 |

> **设计说明**：初期采用扁平化设计，所有成员平等。后续如需"主负责人"概念，可通过在成员中指定"负责人"字段实现。

### 2.2 角色关系图

```
┌─────────────┐
│   创建人    │ ──创建──> ┌─────────────┐
└─────────────┘           │   研发项    │
                          └─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │     团队成员（全员）    │
                    │  ┌─────┬─────┬─────┐  │
                    │  │张三 │李四 │王五 │  │
                    │  └─────┴─────┴─────┘  │
                    │  平等：都可更新进度     │
                    │  协作：讨论、评论       │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │       验证人           │
                    │    负责验收确认        │
                    └───────────────────────┘
```

---

## 三、功能需求

### 3.1 扁平化团队成员模式

#### 3.1.1 设计理念

**核心理念**：所有成员平等，无主从之分

| 特点 | 说明 |
|------|------|
| 平等协作 | 所有人都有更新进度的权利 |
| 集体负责 | 完成需要全员进度达标或共识 |
| 责任分散 | 无"唯一负责人"的压力 |
| 便于协作 | 减少等待和依赖 |

> **后续扩展**：如需"主负责人"概念，可在团队成员中指定，后续版本添加 `leaderId` 字段即可。

#### 3.1.2 数据库设计

**方案A：JSON 字段（轻量，推荐 MVP）**

```sql
-- 在 rd_items 表增加 JSON 字段
ALTER TABLE rd_items ADD COLUMN member_ids JSON COMMENT '团队成员ID数组';
```

**方案B：关联表（扩展性强，v2.0）**

```sql
CREATE TABLE rd_item_members (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE,
  UNIQUE KEY uk_item_user (item_id, user_id)
);
```

#### 3.1.3 前端交互

**创建/编辑表单：**

```
┌─────────────────────────────────────────────┐
│ 团队成员 *（至少1人）                        │
│ ┌───────────────────────────────────────┐   │
│ │ [头像] 张三  [×]   [头像] 李四  [×]   │   │
│ │ [头像] 王五  [×]                       │   │
│ │ [+ 添加成员]                           │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ 验证人                                       │
│ ┌───────────────────────────────────────┐   │
│ │ [头像] 赵六                           │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**详情页展示：**

```
┌─────────────────────────────────────────────┐
│ 团队成员    [张三头像] [李四头像] [王五头像]  │
│ 验证人      [赵六头像]                        │
└─────────────────────────────────────────────┘
```

#### 3.1.4 完成规则

| 场景 | 规则 |
|------|------|
| 正常完成 | 所有成员进度 ≥ 80%，任意成员可申请完成 |
| 快速完成 | 所有人进度 100%，自动提示可完成 |
| 强制完成 | PM 可在未达标时强制完成（需填写原因） |
| 取消完成 | PM 可将已完成状态驳回，要求继续 |

**权限矩阵更新（扁平化设计）：**

| 操作 | 团队成员 | 验证人 | 项目管理员 |
|------|----------|--------|------------|
| 开始 | ✓ | ✗ | ✗ |
| 阻塞 | ✓（需填写原因） | ✗ | ✓ |
| 继续 | ✓ | ✗ | ✓ |
| 完成 | ✓（需全员进度≥80%） | ✗ | ✓（可强制） |
| 更新自己的进度 | ✓ | ✗ | ✓（可更新他人） |
| 编辑基本信息 | ✓（创建人） | ✗ | ✓ |
| 删除 | ✗ | ✗ | ✓（或创建人） |
| 评论 | ✓ | ✓ | ✓ |
| 查看详情 | ✓ | ✓ | ✓ |

#### 3.1.2 数据库变更

```sql
-- 新增参与人关联表（推荐方案）
CREATE TABLE rd_item_coordinators (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE,
  UNIQUE KEY uk_item_user (item_id, user_id)
);

-- 或在 rd_items 表增加 JSON 字段（轻量方案）
ALTER TABLE rd_items ADD COLUMN coordinator_ids JSON COMMENT '参与人ID数组';
```

**推荐方案**：新增关联表，便于后续扩展参与人权限和统计

#### 3.1.3 前端交互

**创建/编辑表单：**

```
┌─────────────────────────────────────────────┐
│ 主执行人 *                                   │
│ ┌───────────────────────────────────────┐   │
│ │ [头像] 张三                     [×]   │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ 参与人                                       │
│ ┌───────────────────────────────────────┐   │
│ │ [头像] 李四  [×]   [头像] 王五  [×]   │   │
│ │ [+ 添加参与人]                         │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**详情页展示：**

```
┌─────────────────────────────────────────────┐
│ 主执行人    [头像] 张三                      │
│ 参与人      [头像] 李四  [头像] 王五          │
│ 验证人      [头像] 赵六                      │
└─────────────────────────────────────────────┘
```

---

### 3.2 验证人角色重命名

#### 3.2.1 变更范围

| 变更项 | 原值 | 新值 |
|--------|------|------|
| 数据库字段 | `reviewer_id` | `verifier_id` |
| 数据库字段 | `reviewer_name` | `verifier_name` |
| 后端接口字段 | `reviewerId` | `verifierId` |
| 后端接口字段 | `reviewerName` | `verifierName` |
| 前端文案 | 确认人 | 验证人 |
| 前端表单字段 | `reviewerId` | `verifierId` |

#### 3.2.2 迁移脚本

```sql
-- 重命名字段
ALTER TABLE rd_items 
  CHANGE COLUMN reviewer_id verifier_id VARCHAR(36) COMMENT '验证人ID',
  CHANGE COLUMN reviewer_name verifier_name VARCHAR(100) COMMENT '验证人姓名';
```

#### 3.2.3 验证人职责

| 状态 | 验证人可操作 |
|------|--------------|
| todo/doing/blocked | 查看详情、评论 |
| done | 验收通过/驳回（可选功能，v2.0） |

**当前阶段**：验证人仅作为标识，无操作权限

---

### 3.3 实际时间统计

#### 3.3.1 数据模型（已有，需展示）

| 字段 | 类型 | 记录时机 |
|------|------|----------|
| `actual_start_at` | DATETIME | 首次点击"开始"时自动记录 |
| `actual_end_at` | DATETIME | 点击"完成"时自动记录 |

#### 3.3.2 展示位置

**详情页属性面板：**

```
┌─────────────────────────────────────────────┐
│ 时间信息                                     │
│ ─────────────────────────────────────────── │
│ 计划开始    2026-04-10                       │
│ 计划结束    2026-04-20                       │
│ 计划工期    10 天                            │
│                                             │
│ 实际开始    2026-04-11                       │
│ 实际结束    2026-04-18                       │
│ 实际工期    7 天                            │
│ 状态        提前 2 天完成 ✓                  │
└─────────────────────────────────────────────┘
```

**列表页新增列：**

| 列名 | 显示内容 | 排序 |
|------|----------|------|
| 实际开始 | 日期或"-" | ✓ |
| 实际结束 | 日期或"-" | ✓ |
| 工期 | 天数或"-" | ✓ |
| 状态标签 | 提前/按时/延期 | - |

#### 3.3.3 时间状态计算

```typescript
function calculateTimeStatus(item: RdItemEntity): 'ahead' | 'on_time' | 'delayed' | 'in_progress' | 'not_started' {
  if (!item.actualStartAt) return 'not_started';
  if (item.status !== 'done' && item.status !== 'accepted' && item.status !== 'closed') return 'in_progress';
  if (!item.actualEndAt || !item.planEndAt) return 'on_time';
  
  const diffDays = differenceInDays(parseISO(item.planEndAt), parseISO(item.actualEndAt));
  if (diffDays > 0) return 'ahead';      // 提前完成
  if (diffDays === 0) return 'on_time';  // 按时完成
  return 'delayed';                       // 延期完成
}
```

#### 3.3.4 统计面板（可选，v2.0）

```
┌─────────────────────────────────────────────┐
│ 本月研发效能                                 │
│ ─────────────────────────────────────────── │
│ 新建研发项    12 个                          │
│ 已完成        8 个                          │
│ 按时完成率    75%                           │
│ 平均工期      5.2 天                        │
│ 当前延期      1 个                          │
└─────────────────────────────────────────────┘
```

---

### 3.4 进度管理优化（个人进度 + 自动合并）

#### 3.4.1 设计理念

**核心思路**：每个人都更新自己的进度，系统自动合并计算主进度

**优势**：
- 责任清晰：每个人对自己的进度负责
- 实时同步：无需协调，进度自动汇总
- 透明可控：可追溯每个人的贡献

#### 3.4.2 数据模型设计

**新增：个人进度表**

```sql
CREATE TABLE rd_item_progress (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL COMMENT '研发项ID',
  user_id VARCHAR(36) NOT NULL COMMENT '成员ID',
  progress INT NOT NULL DEFAULT 0 COMMENT '个人进度 0-100',
  note TEXT COMMENT '进度说明（可选）',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE,
  UNIQUE KEY uk_item_user (item_id, user_id)
);
```

**主进度计算规则：**

```typescript
// 主进度 = 所有人进度的平均值
function calculateMainProgress(itemProgressList: RdItemProgress[]): number {
  if (itemProgressList.length === 0) return 0;
  const sum = itemProgressList.reduce((acc, p) => acc + p.progress, 0);
  return Math.round(sum / itemProgressList.length);
}

// 或加权平均（主执行人权重更高）
function calculateWeightedProgress(itemProgressList: RdItemProgress[], assigneeId: string): number {
  if (itemProgressList.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const p of itemProgressList) {
    const weight = p.user_id === assigneeId ? 2 : 1; // 主执行人权重 2，参与人权重 1
    weightedSum += p.progress * weight;
    totalWeight += weight;
  }
  
  return Math.round(weightedSum / totalWeight);
}
```

#### 3.4.3 交互设计

**进度展示区域：**

```
┌─────────────────────────────────────────────────────────┐
│ 整体进度                                    75%         │
│ ████████████████████████████████░░░░░░░░░░░░            │
├─────────────────────────────────────────────────────────┤
│ 成员进度                                                 │
│                                                         │
│ [头像] 张三（主执行人）     80%  ████████████░░░        │
│                              最后更新：2026-04-16 14:30 │
│                                                         │
│ [头像] 李四（参与人）       70%  ██████████░░░░░        │
│                              最后更新：2026-04-16 12:15 │
│                                                         │
│ [头像] 王五（参与人）       75%  ███████████░░░░        │
│                              最后更新：2026-04-16 10:00 │
└─────────────────────────────────────────────────────────┘
```

**进度更新交互：**

```
┌─────────────────────────────────────────────────────────┐
│ 更新我的进度                                             │
│                                                         │
│ 进度值    [====●========] 65%                           │
│                                                         │
│ 进度说明（可选）                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 完成了核心模块开发，待联调测试...                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [取消]  [保存进度]         │
└─────────────────────────────────────────────────────────┘
```

**快捷更新（列表页）：**

在列表页成员头像旁显示个人进度，点击可快速更新：

```
┌─────────────────────────────────────────────────────────┐
│ RD-001  实现用户认证模块                                 │
│ [张三 80%] [李四 70%] [王五 75%]      整体: 75%  进行中  │
└─────────────────────────────────────────────────────────┘
```

#### 3.4.4 权限规则

| 操作 | 主执行人 | 参与人 | 验证人 | 项目管理员 |
|------|----------|--------|--------|------------|
| 更新自己的进度 | ✓ | ✓ | ✗ | ✗ |
| 更新他人进度 | ✗ | ✗ | ✗ | ✓ |
| 查看所有进度 | ✓ | ✓ | ✓ | ✓ |
| 完成（状态变更） | ✓ | ✗ | ✗ | ✗ |

#### 3.4.5 自动完成规则

**方案A：所有人 100% 才算完成（严格）**

```typescript
function canAutoComplete(itemProgressList: RdItemProgress[]): boolean {
  return itemProgressList.every(p => p.progress === 100);
}
```

**方案B：主执行人决定完成（灵活）**

```typescript
// 主执行人点击"完成"时，检查是否所有人都提交了进度
// 或允许主执行人在其他人未 100% 时也可完成（需确认）
```

**推荐方案A**：避免遗漏，确保全员完成

#### 3.4.6 进度历史与提醒

**进度历史记录：**

```sql
CREATE TABLE rd_progress_history (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  old_progress INT,
  new_progress INT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);
```

**进度提醒规则：**

| 场景 | 提醒对象 | 提醒内容 |
|------|----------|----------|
| 有人更新进度 | 主执行人、参与人 | "张三更新了进度：65%" |
| 整体进度达到 100% | 主执行人 | "所有成员已完成，可以提交完成" |
| 长时间未更新 | 未更新成员 | "您在 RD-001 的进度已 3 天未更新" |

#### 3.4.7 数据迁移

**历史数据处理：**

```sql
-- 将现有进度迁移为主执行人的个人进度
INSERT INTO rd_item_progress (id, item_id, user_id, progress, updated_at)
SELECT 
  UUID() as id,
  id as item_id,
  assignee_id as user_id,
  progress,
  updated_at
FROM rd_items 
WHERE assignee_id IS NOT NULL AND progress > 0;
```

---

## 四、技术方案

### 4.1 数据库变更清单

| 优先级 | 变更 | DDL |
|--------|------|-----|
| P1 | 字段重命名 | `ALTER TABLE rd_items CHANGE reviewer_id verifier_id ...` |
| P1 | 字段重命名 | `ALTER TABLE rd_items CHANGE reviewer_name verifier_name ...` |
| P1 | 删除字段 | `ALTER TABLE rd_items DROP COLUMN assignee_id` |
| P1 | 新增字段 | `ALTER TABLE rd_items ADD COLUMN member_ids JSON` |
| P2 | 新增个人进度表 | `CREATE TABLE rd_item_progress ...` |
| P2 | 新增进度历史表 | `CREATE TABLE rd_progress_history ...` |

### 4.2 后端接口变更

| 接口 | 变更 |
|------|------|
| `POST /api/rd/items` | `assigneeId` → `memberIds[]`，新增 `verifierId` |
| `PUT /api/rd/items/:id` | `assigneeId` → `memberIds[]`，新增 `verifierId` |
| `GET /api/rd/items/:id` | 返回 `memberIds`、`memberNames`、`progressList` |
| `POST /api/rd/items/:id/progress` | **新增** 更新个人进度接口 |
| `GET /api/rd/items/:id/progress` | **新增** 获取所有成员进度 |
| `GET /api/rd/items/:id/progress/history` | **新增** 获取进度历史 |
| 所有涉及 reviewer 的接口 | 字段重命名为 verifier |

### 4.3 前端变更清单

| 文件 | 变更 |
|------|------|
| `rd.model.ts` | 新增 `memberIds[]`、`verifierId`、`RdItemProgress` 字段；移除 `assigneeId`、`assigneeName` |
| `rd-create-dialog.component.ts` | 团队成员多选（替代单选 assigneeId）、验证人重命名 |
| `rd-detail-content.component.ts` | 展示团队成员、实际时间、**成员进度区域** |
| `rd-props-panel.component.ts` | 新增实际时间展示区域、团队成员列表 |
| `rd-list.component.ts` | 新增实际时间列、**成员进度预览** |
| `rd-permission.service.ts` | 扁平化权限判断（成员 vs PM） |
| **新增** `rd-progress-panel.component.ts` | 成员进度展示 + 更新交互 |
| **新增** `rd-progress-update-dialog.component.ts` | 个人进度更新弹窗 |

---

## 五、实施计划

### 5.1 分阶段实施

#### 第一阶段（MVP，预计 3 天）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 验证人字段重命名（前后端） | 0.5 天 | P1 |
| 实际时间展示（详情页） | 0.5 天 | P1 |
| 实际时间展示（列表页） | 0.5 天 | P1 |
| 文案统一（确认人→验证人） | 0.5 天 | P1 |
| 测试验证 | 1 天 | P1 |

#### 第二阶段（扁平化多人协作，预计 7 天）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 数据库变更（移除 assigneeId + 新增 memberIds + 进度表） | 1 天 | P1 |
| 后端接口改造（成员管理 + 进度接口） | 2 天 | P2 |
| 前端表单改造（成员多选） | 1.5 天 | P2 |
| 前端进度面板开发 | 1.5 天 | P2 |
| 权限逻辑重构（扁平化） | 0.5 天 | P2 |
| 测试验证 | 0.5 天 | P2 |

#### 第三阶段（统计面板，预计 3 天）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 统计接口开发 | 1 天 | P3 |
| 前端统计面板 | 1.5 天 | P3 |
| 测试验证 | 0.5 天 | P3 |

### 5.2 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 字段重命名导致旧版本不兼容 | 中 | 版本号升级，前端同步发布 |
| 移除 assigneeId 需数据迁移 | 高 | 保留字段 + 新增字段，逐步迁移 |
| 多人协作权限边界模糊 | 中 | 明确文档定义，PM 确认 |
| 扁平化模式下有人"搭便车" | 中 | 进度可视化 + 提醒机制 |

---

## 六、测试要点

### 6.1 功能测试

- [ ] 验证人字段重命名后，创建/编辑/查看均正常
- [ ] 参与人可添加/移除，多人显示正常
- [ ] 参与人无状态操作权限，有评论权限
- [ ] 实际时间在点击"开始"/"完成"时自动记录
- [ ] 实际时间展示正确，状态计算正确
- [ ] **个人进度可独立更新，主进度自动计算**
- [ ] **进度历史可追溯，记录每次变更**
- [ ] **所有人 100% 时提示可完成**
- [ ] **进度提醒正常触发**

### 6.2 权限测试

| 操作 | 团队成员 | 验证人 | 项目管理员 | 陌生人 |
|------|----------|--------|------------|--------|
| 开始 | ✓ | ✗ | ✗ | ✗ |
| 完成（进度达标） | ✓ | ✗ | ✓ | ✗ |
| 完成（强制） | ✗ | ✗ | ✓ | ✗ |
| 阻塞 | ✓（需原因） | ✗ | ✓ | ✗ |
| 更新自己的进度 | ✓ | ✗ | ✓ | ✗ |
| 更新他人进度 | ✗ | ✗ | ✓ | ✗ |
| 编辑基本信息 | ✓（创建人） | ✗ | ✓ | ✗ |
| 删除 | ✗ | ✗ | ✓ | ✗ |
| 评论 | ✓ | ✓ | ✓ | ✗ |

### 6.3 兼容性测试

- [ ] 旧版本前端访问新版本接口无报错
- [ ] 历史数据 `reviewer_id` 迁移后正常显示

---

## 七、附录

### 7.1 术语表

| 术语 | 定义 |
|------|------|
| 团队成员 | 扁平化角色，所有成员平等，都可更新自己的进度 |
| 验证人 | 负责验收研发项质量的角色 |
| 个人进度 | 每个成员对自己工作进度的评估（0-100） |
| 主进度 | 所有成员进度的自动合并值（平均值或加权平均） |
| 实际工期 | 从实际开始到实际结束的天数 |
| 按时完成率 | 按时完成的研发项占已完成总数的比例 |
| 按时完成率 | 按时完成的研发项占已完成总数的比例 |

### 7.2 参考资料

- [RD 权限矩阵（冻结版）](./10-rd-permission-matrix.md)
- 现有数据模型：`web/src/app/features/rd/models/rd.model.ts`

---

**文档结束**
