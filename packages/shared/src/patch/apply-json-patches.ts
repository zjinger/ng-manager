import { deepMerge } from "../object/deep-merge";
import { getByJsonPointer, removeByJsonPointer, setByJsonPointer } from "../object/json-pointer";
import { JsonPatch } from "./json-patch.types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function ensurePath(path: string): void {
  if (typeof path !== "string" || (!path.startsWith("/") && path !== "")) {
    throw new Error(`Failed to apply JSON patch at path: ${path}`);
  }
}

function applySet(target: unknown, patch: JsonPatch): unknown {
  return setByJsonPointer(target, patch.path, patch.value);
}

function applyRemove(target: unknown, patch: JsonPatch): unknown {
  return removeByJsonPointer(target, patch.path);
}

function applyAppend(target: unknown, patch: JsonPatch): unknown {
  const current = getByJsonPointer(target, patch.path);

  if (current === undefined) {
    return setByJsonPointer(target, patch.path, [patch.value]);
  }

  if (!Array.isArray(current)) {
    throw new Error(`Failed to apply JSON patch at path: ${patch.path}. Target is not an array.`);
  }

  return setByJsonPointer(target, patch.path, [...current, patch.value]);
}

function applyMerge(target: unknown, patch: JsonPatch): unknown {
  const incoming = patch.value;
  if (!isPlainObject(incoming)) {
    throw new Error(
      `Failed to apply JSON patch at path: ${patch.path}. Merge value must be an object.`
    );
  }

  const current = getByJsonPointer(target, patch.path);
  if (current === undefined) {
    return setByJsonPointer(target, patch.path, deepMerge({}, incoming));
  }

  if (!isPlainObject(current)) {
    throw new Error(`Failed to apply JSON patch at path: ${patch.path}. Target is not an object.`);
  }

  return setByJsonPointer(target, patch.path, deepMerge(current, incoming));
}

export function applyJsonPatches<T = unknown>(target: T, patches: JsonPatch[]): T {
  let current: unknown = target;

  for (const patch of patches) {
    ensurePath(patch.path);

    switch (patch.op) {
      case "set":
        current = applySet(current, patch);
        break;
      case "remove":
        current = applyRemove(current, patch);
        break;
      case "append":
        current = applyAppend(current, patch);
        break;
      case "merge":
        current = applyMerge(current, patch);
        break;
      default:
        throw new Error(`Failed to apply JSON patch at path: ${patch.path}. Unsupported op.`);
    }
  }

  return current as T;
}
