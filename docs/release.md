# 发布流程

## 发布前检查

```bash
npm run release:preflight
```

该命令会依次执行：

1. `clean:githead` — 清除所有 packages/*/package.json 中的 gitHead 字段
2. `clean` — 清除 lib/dist/tsbuildinfo 产物
3. `build` — 全量构建
4. `pack:all` — 打包所有非 private 包到 `.artifacts/npm`

## Lerna 管理版本并发布

```bash
npm run release:preflight
npm run release:version
npm run release:publish:git
```

适用场景：使用 Lerna 统一管理版本号、生成 tag 和 changelog。

## 从 package.json 发布

```bash
npm run release:preflight
npm run release:publish:pkg
```

适用场景：package.json 版本已手动调整，不需要 Lerna version 再次修改。

## 仅本地打包演练

```bash
npm run pack:all
```

输出目录：`.artifacts/npm`

## 发布前检查清单

- [ ] `npm run clean:githead` 通过
- [ ] `npm run build` 通过
- [ ] `npm run pack:all` 通过
- [ ] `.artifacts/npm` 中包含所有应发布包
- [ ] 各包 package.json 的 exports/types/main/files 正确
- [ ] `npm whoami` 状态正常
- [ ] Git 工作区干净
- [ ] Lerna version 生成的 tag 符合预期
