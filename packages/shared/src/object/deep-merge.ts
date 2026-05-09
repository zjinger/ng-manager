function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = cloneValue(item);
    }
    return out as T;
  }

  return value;
}

function mergeValues(target: unknown, source: unknown): unknown {
  if (source === undefined) {
    return cloneValue(target);
  }

  if (Array.isArray(source)) {
    return cloneValue(source);
  }

  if (isPlainObject(source) && isPlainObject(target)) {
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(target), ...Object.keys(source)]);

    for (const key of keys) {
      if (key in source) {
        out[key] = mergeValues(target[key], source[key]);
      } else {
        out[key] = cloneValue(target[key]);
      }
    }

    return out;
  }

  if (isPlainObject(source)) {
    return cloneValue(source);
  }

  return cloneValue(source);
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
  return mergeValues(target, source) as T;
}
