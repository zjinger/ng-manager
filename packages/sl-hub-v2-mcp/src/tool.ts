export type ToolHandler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchemaObject;
  handler: ToolHandler;
};

export type JsonSchemaObject = {
  type: "object";
  properties: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
};

export type JsonSchema =
  | { type: "string"; description?: string; enum?: string[] }
  | { type: "number"; minimum?: number; maximum?: number }
  | { type: "integer"; minimum?: number; maximum?: number }
  | { type: "boolean" }
  | { type: "array"; items: JsonSchema };

export const projectProperties: Record<string, JsonSchema> = {
  project: { type: "string", description: "Configured project alias." },
  projectKey: { type: "string", description: "SL Hub V2 project key override." },
  baseUrl: { type: "string", description: "SL Hub V2 base URL override." },
  token: { type: "string", description: "Operation token override." },
  source: { type: "string", description: "Audit source metadata for write operations." },
};

export const pagingProperties: Record<string, JsonSchema> = {
  page: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1 },
};

export const stringArray: JsonSchema = { type: "array", items: { type: "string" } };

export function objectSchema(properties: Record<string, JsonSchema>, required: string[] = []): JsonSchemaObject {
  return { type: "object", properties, required, additionalProperties: false };
}

export function compactBody(values: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)) {
      body[key] = value;
    }
  }
  return body;
}

export function str(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return value === undefined || value === null || !String(value).trim() ? undefined : String(value).trim();
}

export function requiredStr(args: Record<string, unknown>, key: string): string {
  const value = str(args, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export function num(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

export function bool(args: Record<string, unknown>, key: string): boolean {
  return args[key] === true;
}

export function strArray(args: Record<string, unknown>, key: string): string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }
  return value.map((item) => String(item));
}

export function contextOptions(args: Record<string, unknown>) {
  return {
    project: str(args, "project"),
    projectKey: str(args, "projectKey"),
    baseUrl: str(args, "baseUrl"),
    token: str(args, "token"),
    source: str(args, "source"),
  };
}
