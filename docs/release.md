# 发布流程

## 查看将被打包的包

```bash
npm run pack:list
```

只列出所有非 private 包，不执行打包，不清空 `.artifacts/npm`。

## 发布前检查

```bash
npm run release:preflight
```

该命令会依次执行：

1. `check:githead` — 检查 Git 工作区是否干净，是否有未提交的更改
2. `clean` — 清除 lib/dist/tsbuildinfo 产物
3. `build` — 全量构建
4. `prepare:server-www` — 准备服务器端静态资源
5. `pack:all` — 打包所有非 private 包到 `.artifacts/npm`

## 推荐流程：Lerna 管理版本并发布

```bash
npm run release:preflight
npm run release:version
npm run release:publish:git
```

适用场景：使用 Lerna 统一管理版本号、生成 tag 和 changelog。

**优先使用此路径。**

## 手动版本流程：从 package.json 发布

```bash
npm run release:preflight
npm run release:publish:pkg
```

适用场景：package.json 版本已手动调整，不需要 Lerna version 再次修改。

**仅在 package.json 版本已经手动调整时使用，推荐优先使用 Lerna 流程。**

## 仅本地打包演练

```bash
npm run pack:all
```

输出目录：`.artifacts/npm`

## 发布后验证

```bash
npm view @yinuo-ngm/cli version
npm view @yinuo-ngm/core version
```

首次发布或新增包时，确认 npm 页面能查到对应包。

## 发布前检查清单

- [ ] `npm run clean:githead` 通过
- [ ] `npm run build` 通过
- [ ] `npm run pack:all` 通过
- [ ] `.artifacts/npm` 中包含所有应发布包
- [ ] 各包 package.json 的 exports/types/main/files 正确
- [ ] 已完成 `npm login`（`npm whoami` 状态正常）
- [ ] 如账号开启 2FA，确认可以完成 OTP 验证
- [ ] Git 工作区干净
- [ ] Lerna version 生成的 tag 符合预期
