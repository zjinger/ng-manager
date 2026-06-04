export function stripJsonComments(text: string): string {
  const output: string[] = [];
  let index = 0;
  let inString = false;
  let escaped = false;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1] ?? "";

    if (inString) {
      output.push(char);
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      output.push(char);
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      index += 2;
      while (index < text.length && !"\r\n".includes(text[index])) {
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index + 1 < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }

    output.push(char);
    index += 1;
  }

  return output.join("");
}

export function parseJsonObject(text: string): Record<string, unknown> {
  if (!text.trim()) {
    return {};
  }
  const parsed = JSON.parse(stripJsonComments(text));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}
