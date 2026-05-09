function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }

  if (isObjectLike(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = cloneValue(item);
    }
    return out as T;
  }

  return value;
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function encodePathError(pointer: string): Error {
  return new Error(`Invalid JSON pointer: ${pointer}`);
}

function parsePointer(pointer: string): string[] {
  if (pointer === "") {
    return [];
  }

  if (!pointer.startsWith("/")) {
    throw encodePathError(pointer);
  }

  return pointer
    .slice(1)
    .split("/")
    .map((segment) => decodePointerSegment(segment));
}

function toArrayIndex(segment: string, pointer: string): number {
  if (!/^\d+$/.test(segment)) {
    throw new Error(`Invalid array index at path: ${pointer}`);
  }

  return Number(segment);
}

export function getByJsonPointer(target: unknown, pointer: string): unknown {
  const segments = parsePointer(pointer);
  let current: unknown = target;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current[toArrayIndex(segment, pointer)];
      continue;
    }

    if (!isObjectLike(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function setByJsonPointer<T = unknown>(target: T, pointer: string, value: unknown): T {
  const segments = parsePointer(pointer);

  if (segments.length === 0) {
    return cloneValue(value) as T;
  }

  const root = cloneValue(target) as unknown;
  const objectRoot: Record<string, unknown> | unknown[] = isObjectLike(root) || Array.isArray(root)
    ? (root as Record<string, unknown> | unknown[])
    : {};

  let current: unknown = objectRoot;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];

    if (Array.isArray(current)) {
      const index = toArrayIndex(segment, pointer);
      const nextValue = current[index];

      if (!isObjectLike(nextValue) && !Array.isArray(nextValue)) {
        current[index] = {};
      }

      current = current[index];
      continue;
    }

    if (!isObjectLike(current)) {
      throw new Error(`Cannot set JSON pointer at path: ${pointer}`);
    }

    const obj = current as Record<string, unknown>;
    const nextValue = obj[segment];

    if (!isObjectLike(nextValue) && !Array.isArray(nextValue)) {
      obj[segment] = {};
    }

    current = obj[segment];
  }

  const finalSegment = segments[segments.length - 1];

  if (Array.isArray(current)) {
    const index = toArrayIndex(finalSegment, pointer);
    current[index] = cloneValue(value);
  } else if (isObjectLike(current)) {
    current[finalSegment] = cloneValue(value);
  } else {
    throw new Error(`Cannot set JSON pointer at path: ${pointer}`);
  }

  return objectRoot as T;
}

export function removeByJsonPointer<T = unknown>(target: T, pointer: string): T {
  const segments = parsePointer(pointer);

  if (segments.length === 0) {
    return undefined as T;
  }

  const root = cloneValue(target) as unknown;
  const objectRoot: Record<string, unknown> | unknown[] = isObjectLike(root) || Array.isArray(root)
    ? (root as Record<string, unknown> | unknown[])
    : {};

  let current: unknown = objectRoot;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];

    if (Array.isArray(current)) {
      const index = toArrayIndex(segment, pointer);
      current = current[index];
      continue;
    }

    if (!isObjectLike(current)) {
      return objectRoot as T;
    }

    current = current[segment];
  }

  const finalSegment = segments[segments.length - 1];

  if (Array.isArray(current)) {
    const index = toArrayIndex(finalSegment, pointer);
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
    }
    return objectRoot as T;
  }

  if (isObjectLike(current)) {
    delete current[finalSegment];
  }

  return objectRoot as T;
}
