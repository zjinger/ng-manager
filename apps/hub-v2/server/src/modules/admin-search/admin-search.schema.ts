import { z } from "zod";
import { ADMIN_SEARCH_ENTITY_TYPES } from "./admin-search.types";

function csvEnumArray<T extends readonly [string, ...string[]]>(values: T) {
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

export const adminSearchQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  types: csvEnumArray(ADMIN_SEARCH_ENTITY_TYPES),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
