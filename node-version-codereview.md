# `packages/node-version` Code Review

## 总体评价

本次更新后的 `packages/node-version` 已经明显优于之前版本。主要结构性问题已经得到改善：

- `NodeVersionServiceImpl` 已经从原来的“大类”中拆出 manager driver 与 project requirement detector。
- 已新增 `VoltaDriver`、`NvmWindowsDriver`、`NvmUnixDriver`、`NoneDriver` 等驱动层。
- manager 检测已支持 PATH、Volta 常见路径、Unix `nvm.sh`。
- `nvm-windows` 的 `* 当前版本` 解析问题已经修复。
- `ProjectRequirementDetector` 已从 service 中拆出，职责更清晰。

当前剩余问题主要是**功能语义、状态刷新、日志归属和健壮性**。

---

## 已解决的问题

| 原问题 | 当前状态 |
|---|---|
| `NodeVersionServiceImpl` 过重 | 已拆分 manager driver / requirement detector |
| nvm / volta 检测过于依赖 Windows 固定路径 | 已增强 PATH、Volta 常见路径、Unix nvm.sh 检测 |
| `nvm list` 跳过当前版本 | 已修复，当前版本也会解析 |
| Volta 当前版本解析不可靠 | 已改为 `volta current node` 输出解析 |
| 不支持 nvm-unix | 已新增 `NvmUnixDriver` |
| 项目 Node 要求检测混在 service 内 | 已拆到 `project-requirement.detector.ts` |

---

## P0：`switchVersion()` 不能只调用 `install()`

当前 `switchVersion()` 中：

```ts
await this.driver.install(clean);
```

这个语义不准确。对于 nvm 来说：

```bash
nvm install 18
nvm use 18
```

是两件事。

当前 `NvmWindowsDriver.install()` 只执行：

```ts
await execFileAsync(this.binary, ['install', clean], { windowsHide: true });
```

这会导致：

```text
switchVersion('18') 看似成功，但当前 Node 版本可能没有切过去。
```

### 建议

给 driver 接口增加 `use()` 或 `activate()`：

```ts
export interface INodeVersionManagerDriver {
  readonly name: string;

  install(version: string): Promise<void>;
  uninstall(version: string): Promise<void>;
  use(version: string): Promise<void>;

  getCurrentVersion(): Promise<NormalisedVersion | null>;
  listInstalled(): Promise<InstalledVersion[]>;
}
```

`switchVersion()` 改为：

```ts
await driver.use(clean);
```

### 各 driver 实现建议

```ts
// nvm-windows
async use(version: string): Promise<void> {
  const clean = version.replace(/^v/, '');
  await execFileAsync(this.binary, ['use', clean], { windowsHide: true });
}
```

```ts
// nvm-unix
async use(version: string): Promise<void> {
  const clean = version.replace(/^v/, '');
  await this.bashLc(`nvm use ${clean}`);
}
```

```ts
// volta
async use(version: string): Promise<void> {
  const clean = version.replace(/^v/, '');
  await execFileAsync(this.binary, ['install', `node@${clean}`], { windowsHide: true });
}
```

如果需要确保未安装版本也可切换，可以在 service 中先：

```ts
await driver.install(clean);
await driver.use(clean);
```

但 Volta 的 `install` 和 `use` 可以是同一实现。

---

## P1：`NodeVersionServiceImpl` 不应缓存 descriptor / driver

当前：

```ts
private driver: INodeVersionManagerDriver;
private descriptor = detectManager();

constructor(private sysLog: SystemLogService) {
  this.driver = buildDriver();
}
```

问题：

1. 用户安装 Volta / nvm 后，不重启 `ng-manager`，service 不会识别到新 manager。
2. 用户修改 PATH / NVM_HOME 后，service 不会重新检测。
3. `descriptor = detectManager()` 和 `buildDriver()` 内部再次 `detectManager()`，可能出现 descriptor 与 driver 不一致。

### 建议

改成每次操作时动态解析：

```ts
private resolveDriver(): {
  descriptor: ManagerDescriptor;
  driver: INodeVersionManagerDriver;
} {
  const descriptor = detectManager();

  switch (descriptor.kind) {
    case ManagerKind.Volta:
      return { descriptor, driver: createVoltaDriver(descriptor) };
    case ManagerKind.NVM_Windows:
      return { descriptor, driver: createNvmWindowsDriver(descriptor) };
    case ManagerKind.NVM_Unix:
      return { descriptor, driver: createNvmUnixDriver(descriptor) };
    default:
      return { descriptor, driver: new NoneDriver() };
  }
}
```

在 `getCurrentVersion()`、`switchVersion()`、`installNodeVersion()`、`uninstallNodeVersion()`、`getManager()` 中都使用：

```ts
const { descriptor, driver } = this.resolveDriver();
```

---

## P1：日志 source/scope 仍然是 `task`

当前：

```ts
private log(level: 'info' | 'warn' | 'error', text: string) {
  this.sysLog?.[level]({ scope: 'task', text });
}
```

`node-version` 已经独立，不应继续标记为 `task`。

### 建议

```ts
private log(
  level: 'info' | 'warn' | 'error',
  text: string,
  refId?: string,
) {
  this.sysLog?.[level]({
    source: 'node-version',
    scope: 'node-version',
    refId,
    text,
  });
}
```

同时 `switchVersion(version, runId)` 不应忽略 `runId`，可用于和任务运行日志关联：

```ts
this.log('info', `正在切换到 Node.js ${clean}，管理器: ${driver.name}`, runId);
```

---

## P2：Windows NVM 检测建议补 `NVM_HOME`，并调整优先级

当前 `detectNvmWindows()` 主要使用：

```ts
const candidates = [
  path.join(programFiles, 'nvm', 'nvm.exe'),
  path.join(programData, 'nvm', 'nvm.exe'),
  path.join(appData, 'nvm', 'nvm.exe'),
];
```

然后再扫描 PATH。

nvm-windows 通常会设置 `NVM_HOME`。建议优先级改成：

```text
NVM_HOME -> PATH -> 常见 candidates
```

示例：

```ts
const candidates: string[] = [];

const nvmHome = process.env.NVM_HOME;
if (nvmHome) {
  candidates.push(path.join(nvmHome, 'nvm.exe'));
}

const pathEnv = process.env.PATH ?? '';
for (const dir of pathEnv.split(path.delimiter)) {
  candidates.push(path.join(dir, 'nvm.exe'));
}

candidates.push(
  path.join(programFiles, 'nvm', 'nvm.exe'),
  path.join(programData, 'nvm', 'nvm.exe'),
  path.join(appData, 'nvm', 'nvm.exe'),
);
```

---

## P2：Volta 解析建议再宽松一些

当前 `VoltaDriver.extractNodeVersion()`：

```ts
const match = stdout.match(/node\s+(v?\d+\.\d+\.\d+)/m);
```

它能处理：

```text
node    20.19.0
node    v20.19.0
```

但可能无法处理：

```text
Node: v20.19.0
node: v20.19.0
```

### 建议

```ts
const match = stdout.match(/node\s*:?\s+(v?\d+\.\d+\.\d+)/im);
```

或者更稳：

```ts
const line = stdout
  .split(/\r?\n/)
  .find(l => /^node\b/i.test(l.trim()));

const match = line?.match(/v?\d+\.\d+\.\d+/);
```

---

## P2：Volta list 解析建议兼容更多格式

当前：

```ts
const match = trimmed.match(/node\s+(v?\d+\.\d+\.\d+)/);
```

如果 `volta list node --format plain` 返回：

```text
20.19.0
node@20.19.0
```

可能解析不到。

### 建议

```ts
const match =
  trimmed.match(/node\s*:?\s+(v?\d+\.\d+\.\d+)/i) ??
  trimmed.match(/node@?(v?\d+\.\d+\.\d+)/i) ??
  trimmed.match(/\b(v?\d+\.\d+\.\d+)\b/);
```

---

## P2：`NvmUnixDriver.bashLc()` 应处理路径引号

当前：

```ts
const sh = this.nvmSh.replace('~', '$HOME');
const full = `source ${sh} && ${cmd}`;
```

如果路径中包含空格，可能出错。

因为 `manager.detector.ts` 通常已经生成绝对路径，建议直接对路径做 shell quote：

```ts
private shellQuote(s: string) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

private async bashLc(cmd: string): Promise<string> {
  const sh = this.descriptor.nvmShPath ?? path.join(os.homedir(), '.nvm', 'nvm.sh');
  const full = `source ${this.shellQuote(sh)} && ${cmd}`;
  const { stdout } = await execFileAsync('bash', ['-lc', full]);
  return stdout;
}
```

不要把 `$HOME` 放进单引号，否则不会展开。更推荐使用 `os.homedir()` 得到绝对路径。

---

## P3：`detectManager()` 注释与行为不一致

当前：

```ts
if (volta.kind !== ManagerKind.None && nvm.kind !== ManagerKind.None) {
  // Both detected — prefer Volta for current-version reads, but caller
  // can decide which to use for install/uninstall
  return volta;
}
```

实际返回值只有一个 descriptor，caller 无法知道 nvm 也存在，所以不能“decide which to use”。

### 建议

短期只修注释：

```ts
// Both detected — prefer Volta.
return volta;
```

中长期可以改为：

```ts
export interface ManagerDetectionResult {
  preferred: ManagerDescriptor;
  detected: ManagerDescriptor[];
}
```

---

## P3：Volta 项目配置匹配逻辑还可优化

当前 `project-requirement.detector.ts`：

```ts
if (voltaVersion && currentVersion) {
  isMatch = currentVersion === voltaVersion || currentVersion === `v${voltaVersion}`;
  if (isMatch) satisfiedBy = currentVersion;
}
```

它比旧版严谨，但仍有语义问题：

```text
服务进程 currentVersion 不一定等于项目目录下 Volta shim 生效后的 node 版本。
```

如果任务是在 `projectPath` 作为 `cwd` 启动的，Volta 会根据项目 manifest 自动选版本。此时用 server 进程的 currentVersion 判断可能不准确。

### 建议

短期可改成：

```ts
if (voltaVersion) {
  const required = voltaVersion.startsWith('v') ? voltaVersion : `v${voltaVersion}`;
  const availableVersions = options.available.map(v => v.version);

  isMatch = currentVersion === required;
  satisfiedBy = isMatch
    ? currentVersion
    : findBestMatchingVersion(availableVersions, required) ?? null;
}
```

中长期建议扩展返回字段：

```ts
isManagedByVolta: boolean;
isCurrentRuntimeMatch: boolean;
```

---

## 推荐优先修复顺序

### P0

1. `switchVersion()` 改为调用 `driver.use()` / `driver.activate()`，不要只 `install()`。

### P1

2. `NodeVersionServiceImpl` 不缓存 descriptor / driver，每次操作重新 `resolveDriver()`。
3. 日志改为 `source: 'node-version'`、`scope: 'node-version'`，并使用 `runId` 作为 `refId`。

### P2

4. Windows NVM 检测补 `NVM_HOME`，顺序调整为 `NVM_HOME -> PATH -> candidates`。
5. Volta current / list 解析再放宽。
6. `NvmUnixDriver.bashLc()` 增加路径引号处理。

### P3

7. 修正 `detectManager()` 注释，或改成 `ManagerDetectionResult`。
8. 优化 Volta 项目配置的 requirement 语义。

---

## 建议代码片段

### Driver 接口

```ts
export interface INodeVersionManagerDriver {
  readonly name: string;

  install(version: string): Promise<void>;
  uninstall(version: string): Promise<void>;
  use(version: string): Promise<void>;

  getCurrentVersion(): Promise<NormalisedVersion | null>;
  listInstalled(): Promise<InstalledVersion[]>;
}
```

### Service resolveDriver

```ts
private resolveDriver(): {
  descriptor: ManagerDescriptor;
  driver: INodeVersionManagerDriver;
} {
  const descriptor = detectManager();

  switch (descriptor.kind) {
    case ManagerKind.Volta:
      return { descriptor, driver: createVoltaDriver(descriptor) };
    case ManagerKind.NVM_Windows:
      return { descriptor, driver: createNvmWindowsDriver(descriptor) };
    case ManagerKind.NVM_Unix:
      return { descriptor, driver: createNvmUnixDriver(descriptor) };
    default:
      return { descriptor, driver: new NoneDriver() };
  }
}
```

### switchVersion

```ts
async switchVersion(version: string, runId?: string): Promise<NodeVersionInfo> {
  const { descriptor, driver } = this.resolveDriver();

  if (descriptor.kind === ManagerKind.None) {
    this.log('warn', '没有安装 Node 版本管理器 (nvm/Volta)', runId);
    throw new CoreError(
      CoreErrorCodes.NO_VERSION_MANAGER,
      '没有安装 Node 版本管理器 (nvm/Volta)',
      {},
    );
  }

  const clean = version.replace(/^v/, '');
  this.log('info', `正在切换到 Node.js ${clean}，管理器: ${driver.name}`, runId);

  try {
    await driver.use(clean);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    this.log('error', `切换 Node 版本失败: ${msg}`, runId);

    throw new CoreError(CoreErrorCodes.SWITCH_VERSION_FAILED, `切换 Node 版本失败: ${msg}`, {
      version,
      manager: kindToPublicManager(descriptor.kind),
    });
  }

  return this.getCurrentVersion();
}
```

---

## 最终结论

这版 `packages/node-version` 的重构方向是正确的，已经解决了原始实现的大部分结构问题。当前最需要修的是：

```text
1. switchVersion 不能只 install，必须具备 use/activate 语义。
2. descriptor/driver 不应在 service 构造时缓存。
3. node-version 日志不能继续标记为 task。
4. NVM_HOME 与 Volta/nvm 输出解析可以继续增强。
```

优先修复前 3 个后，`packages/node-version` 的基础质量就比较稳了。
