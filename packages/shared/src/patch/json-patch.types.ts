export type JsonPatchOp = "set" | "remove" | "append" | "merge";

export interface JsonPatch {
  op: JsonPatchOp;
  path: string;
  value?: unknown;
}
