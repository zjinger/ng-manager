export interface PackageJsonViewModel {
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  private?: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: Record<string, string>;
  packageManager?: string;
}

function asRecordOfString(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function asObject(input: unknown): Record<string, unknown> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

export function buildPackageJsonViewModel(raw: unknown): PackageJsonViewModel {
  const pkg = asObject(raw);
  return {
    name: typeof pkg.name === "string" ? pkg.name : undefined,
    version: typeof pkg.version === "string" ? pkg.version : undefined,
    description: typeof pkg.description === "string" ? pkg.description : undefined,
    type: typeof pkg.type === "string" ? pkg.type : undefined,
    private: typeof pkg.private === "boolean" ? pkg.private : undefined,
    scripts: asRecordOfString(pkg.scripts),
    dependencies: asRecordOfString(pkg.dependencies),
    devDependencies: asRecordOfString(pkg.devDependencies),
    engines: asRecordOfString(pkg.engines),
    packageManager: typeof pkg.packageManager === "string" ? pkg.packageManager : undefined
  };
}
