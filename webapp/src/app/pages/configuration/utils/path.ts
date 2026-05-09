function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function parsePointer(pointer: string): string[] {
  if (pointer === "") {
    return [];
  }
  if (!pointer.startsWith("/")) {
    return [];
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => decodePointerSegment(part));
}

export function getByPath(obj: any, path: string) {
  if (!path) return obj;

  if (path.startsWith("/")) {
    const keys = parsePointer(path);
    return keys.reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }

  return path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

export function setByPath(obj: any, path: string, value: any) {
  if (!path) {
    return value;
  }

  const keys = path.startsWith("/") ? parsePointer(path) : path.split(".");
  const root = obj ?? {};
  const last = keys.pop();
  if (!last) {
    return value;
  }

  let cur = root;
  for (const k of keys) {
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") {
      cur[k] = {};
    }
    cur = cur[k];
  }
  cur[last] = value;
  return root;
}
