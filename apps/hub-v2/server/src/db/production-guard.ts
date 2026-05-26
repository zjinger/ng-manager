export function assertNonProductionScript(scriptName: string): void {
  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  if (nodeEnv === "production") {
    throw new Error(`${scriptName} is disabled when NODE_ENV=production`);
  }
}
