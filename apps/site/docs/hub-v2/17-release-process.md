# hub-v2 发布流程

本文档用于规范 `apps/hub-v2` 的版本发布流程。

## 1. 发布前准备

1. 确认主分支代码已合入，工作区干净。
2. 确认本次发布范围（功能、修复、数据库迁移）。
3. 确认是否需要执行 `db:migrate`。

## 2. 版本号管理

`hub-v2` 使用 SemVer（`主版本.次版本.修订号`）：

- 主版本（Major）：不兼容改动
- 次版本（Minor）：向后兼容功能新增
- 修订号（Patch）：向后兼容问题修复

常用命令（在 `apps/hub-v2` 目录执行）：

```bash
npm run version:show
npm run version:set -- 2.0.1
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
```

版本号会同步到：

- `VERSION`
- `package.json`
- `server/package.json`
- `web/package.json`

## 3. 生成升级说明（自动）

执行：

```bash
npm run release:notes
```

输出文件：

- `release-notes/vX.Y.Z.md`

说明：

- 升级说明由近期提交自动汇总生成。
- 用于发布通知初稿、上线说明、测试回归参考。

## 4. Changelog 维护策略（手工）

当前策略为“手工精简维护”：

1. 以 `release-notes/vX.Y.Z.md` 为输入。
2. 将对外可见、对业务有影响的改动整理到 `CHANGELOG.md`。
3. 避免直接粘贴全部提交记录，保持可读性。

建议每个版本保留：

- 主要升级（3~8条）
- 质量修复（2~6条）
- 迁移/兼容提示（如有）

## 5. 构建与打包

在 `apps/hub-v2` 目录执行：

```bash
npm run build
npm run package
```

产物：

- `ngm-hub-v2.tar.gz`

## 6. 部署与迁移

部署到目标环境后：

1. 解压并替换运行目录
2. 安装依赖（如需要）
3. 执行数据库迁移
4. 重启服务

迁移命令（按你的部署方式执行）：

```bash
npm run db:migrate
```

## 7. 发布后验证清单

至少验证以下模块：

1. 登录与项目切换
2. 全局搜索（关键字命中、权限可见范围）
3. 测试追踪（筛选、批量操作、详情编辑）
4. AI 推荐（类型/优先级/指派建议）
5. AI 积木报表（SQL 执行、图表渲染、模板保存）

## 8. 回滚策略

若线上异常：

1. 回滚到上一版本发布目录
2. 恢复数据库备份（如迁移导致结构/数据变更）
3. 记录回滚原因并补充修复计划

## 9. 推荐发布节奏

1. 日常修复：`patch`
2. 功能迭代：`minor`
3. 架构或不兼容调整：`major`

