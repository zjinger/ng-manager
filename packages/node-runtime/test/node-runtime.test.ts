import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promises as fsp } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  buildRuntimeEnv,
  createNodeRuntimeService,
  normalizeRuntimeVersion,
  parseCommandLine,
  type ResolvedNodeRuntime,
} from "../src";

async function tempDir(name: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), `ngm-node-runtime-${name}-`));
}

async function writeFile(filePath: string, content = ""): Promise<string> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content);
  return filePath;
}

async function createFakeRuntimeRoot(baseDir: string, version = "16.20.2"): Promise<{
  rootDir: string;
  nodePath: string;
  npmCliPath: string;
  npxCliPath: string;
}> {
  const rootDir = path.join(baseDir, `v${version}`);
  const nodePath = await writeFile(path.join(rootDir, process.platform === "win32" ? "node.exe" : "bin/node"));
  const npmCliPath = await writeFile(path.join(rootDir, "node_modules/npm/bin/npm-cli.js"), "console.log('8.19.4');\n");
  const npxCliPath = await writeFile(path.join(rootDir, "node_modules/npm/bin/npx-cli.js"), "console.log('8.19.4');\n");
  await writeFile(path.join(rootDir, process.platform === "win32" ? "npm.cmd" : "bin/npm"));
  await writeFile(path.join(rootDir, process.platform === "win32" ? "npx.cmd" : "bin/npx"));
  return { rootDir, nodePath, npmCliPath, npxCliPath };
}

function makeRuntime(partial: Partial<ResolvedNodeRuntime> = {}): ResolvedNodeRuntime {
  const runtime: ResolvedNodeRuntime = {
    type: "managed",
    name: "node-16",
    version: "16.20.2",
    packageManager: "npm",
    rootDir: "C:/node/v16.20.2",
    binDir: "C:/node/v16.20.2",
    nodePath: "C:/node/v16.20.2/node.exe",
    npmCliPath: "C:/node/v16.20.2/node_modules/npm/bin/npm-cli.js",
    npxCliPath: "C:/node/v16.20.2/node_modules/npm/bin/npx-cli.js",
    env: { PATH: "C:/node/v16.20.2", NODE_OPTIONS: "" },
    ...partial,
  };
  return runtime;
}

function isolatedEnv(baseDir: string): Record<string, string> {
  return {
    PATH: "",
    NVM_HOME: path.join(baseDir, "none-nvm"),
    LOCALAPPDATA: path.join(baseDir, "none-local"),
    APPDATA: path.join(baseDir, "none-app"),
    ProgramFiles: path.join(baseDir, "none-program-files"),
    ProgramData: path.join(baseDir, "none-program-data"),
  };
}

describe("node-runtime", () => {
  it("normalizes runtime versions", () => {
    assert.equal(normalizeRuntimeVersion("v16.20.2"), "16.20.2");
    assert.equal(normalizeRuntimeVersion(" 20.11.1 "), "20.11.1");
  });

  it("reads registry JSON and resolves managed runtime by name or version", async () => {
    const dataDir = await tempDir("registry");
    const fake = await createFakeRuntimeRoot(dataDir);
    const registryPath = path.join(dataDir, "runtimes/node/registry.json");
    await writeFile(registryPath, JSON.stringify({
      items: [{
        id: "node-16",
        name: "node-16",
        version: "v16.20.2",
        platform: process.platform,
        arch: process.arch,
        rootDir: fake.rootDir,
        nodePath: fake.nodePath,
        npmCliPath: fake.npmCliPath,
        npxCliPath: fake.npxCliPath,
      }],
    }));

    const service = createNodeRuntimeService({ dataDir, registryPath, baseEnv: isolatedEnv(dataDir) });
    const list = await service.listRuntimes();
    assert.equal(list.length, 1);
    assert.equal(list[0]!.version, "16.20.2");

    const byName = await service.resolveRuntime({ type: "managed", name: "node-16" });
    assert.equal(byName.nodePath, fake.nodePath);

    const byVersion = await service.resolveRuntime({ type: "managed", version: "v16.20.2" });
    assert.equal(byVersion.npmCliPath, fake.npmCliPath);
  });

  it("auto-detects nvm-windows runtime directories when running on Windows", async () => {
    if (process.platform !== "win32") return;

    const dataDir = await tempDir("nvm-data");
    const nvmHome = await tempDir("nvm-home");
    const fake = await createFakeRuntimeRoot(nvmHome, "18.20.4");
    const service = createNodeRuntimeService({
      dataDir,
      baseEnv: {
        PATH: "",
        NVM_HOME: nvmHome,
        LOCALAPPDATA: path.join(dataDir, "none-local"),
        APPDATA: path.join(dataDir, "none-app"),
        ProgramFiles: path.join(dataDir, "none-program-files"),
        ProgramData: path.join(dataDir, "none-program-data"),
      },
    });

    const list = await service.listRuntimes();
    assert.equal(list.some((item) => item.version === "18.20.4" && item.nodePath === fake.nodePath), true);
  });

  it("resolves custom and system runtimes", async () => {
    const dataDir = await tempDir("resolve");
    const service = createNodeRuntimeService({ dataDir, baseEnv: { PATH: "" } });

    await assert.rejects(
      service.resolveRuntime({ type: "custom", nodePath: path.join(dataDir, "missing-node.exe") }),
      /Node executable not found/
    );

    const custom = await service.resolveRuntime({
      type: "custom",
      nodePath: process.execPath,
      version: process.version,
    });
    assert.equal(custom.nodePath, process.execPath);
    assert.equal(custom.type, "custom");

    const system = await service.resolveRuntime({ type: "system" });
    assert.equal(system.nodePath, process.execPath);
    assert.equal(system.type, "system");
  });

  it("builds runtime env without mutating process.env", () => {
    const before = process.env.NODE_OPTIONS;
    const runtime = makeRuntime({ binDir: path.join(os.tmpdir(), "node-bin") });
    const env = buildRuntimeEnv(runtime, {
      baseEnv: { PATH: "original-path", NODE_OPTIONS: "--openssl-legacy-provider" },
    });

    assert.equal(env.NODE_OPTIONS, "");
    assert.equal(env.NGM_NODE_RUNTIME, runtime.nodePath);
    assert.equal(env.NGM_NODE_VERSION, runtime.version);
    assert.equal(env.NGM_NODE_RUNTIME_TYPE, runtime.type);
    assert.equal(process.env.NODE_OPTIONS, before);
  });

  it("parses quoted commands and resolves node/npm/npx through runtime node", () => {
    const runtime = makeRuntime();
    assert.deepEqual(parseCommandLine('npm run "start dev"').tokens, ["npm", "run", "start dev"]);

    const nodeCommand = createNodeRuntimeService({ dataDir: os.tmpdir() }).resolveCommand("node ./scripts/start.js", runtime);
    assert.equal(nodeCommand.command, runtime.nodePath);
    assert.deepEqual(nodeCommand.args, ["./scripts/start.js"]);
    assert.equal(nodeCommand.shell, false);

    const npmStart = createNodeRuntimeService({ dataDir: os.tmpdir() }).resolveCommand("npm start", runtime);
    assert.equal(npmStart.command, runtime.nodePath);
    assert.deepEqual(npmStart.args, [runtime.npmCliPath, "start"]);
    assert.equal(npmStart.shell, false);

    const npmRun = createNodeRuntimeService({ dataDir: os.tmpdir() }).resolveCommand("npm run start -- --port 4200", runtime);
    assert.equal(npmRun.command, runtime.nodePath);
    assert.deepEqual(npmRun.args, [runtime.npmCliPath, "run", "start", "--", "--port", "4200"]);

    const npx = createNodeRuntimeService({ dataDir: os.tmpdir() }).resolveCommand("npx ng version", runtime);
    assert.equal(npx.command, runtime.nodePath);
    assert.deepEqual(npx.args, [runtime.npxCliPath, "ng", "version"]);
  });

  it("falls back to shell for package managers and unknown commands that cannot be resolved", () => {
    const runtime = makeRuntime({ npmCliPath: undefined, npxCliPath: undefined, pnpmPath: undefined, yarnPath: undefined });
    const service = createNodeRuntimeService({ dataDir: os.tmpdir() });

    assert.equal(service.resolveCommand("pnpm dev", runtime).shell, true);
    assert.equal(service.resolveCommand("yarn start", runtime).shell, true);
    assert.equal(service.resolveCommand("ng serve --port 4200", runtime).shell, true);
  });

  it("tests runtime npm by launching npm-cli.js through resolved nodePath", async () => {
    const dataDir = await tempDir("tester");
    const npmCliPath = await writeFile(
      path.join(dataDir, "npm-cli.js"),
      "console.log('fake-npm:' + process.version);\n"
    );
    const runtime = makeRuntime({
      nodePath: process.execPath,
      npmCliPath,
      env: { ...process.env, NODE_OPTIONS: "" } as Record<string, string>,
    });
    const result = await createNodeRuntimeService({ dataDir }).testRuntime(runtime);

    assert.equal(result.ok, true);
    assert.equal(result.nodePath, process.execPath);
    assert.equal(result.npmLaunchCommand?.command, process.execPath);
    assert.deepEqual(result.npmLaunchCommand?.args, [npmCliPath, "--version"]);
    assert.match(result.npmVersion || "", /^fake-npm:v\d+\./);
  });
});
