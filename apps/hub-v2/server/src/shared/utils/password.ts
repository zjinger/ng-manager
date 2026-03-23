import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  // Prefer bcrypt for all new passwords and migrated v1 accounts.
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2y$")) {
    return bcrypt.compareSync(password, passwordHash);
  }

  // Keep backward compatibility for early v2 seed/test data that used sha256.
  return createHash("sha256").update(password).digest("hex") === passwordHash;
}
