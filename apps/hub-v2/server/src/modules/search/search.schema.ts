import { z } from "zod";

function csvEnumArray<T extends [string, ...string[]]>(values: T) {
  const itemSchema = z.enum(values);
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(itemSchema).optional());
}

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  types: csvEnumArray(["issue", "rd", "document", "release"]),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
