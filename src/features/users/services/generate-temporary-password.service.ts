import { randomInt } from "node:crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

// Admin-created users get a random temp password instead of a hardcoded
// default (e.g. "ChangeMe123!") — returned once in the create response for
// the Manager to hand off, never stored or logged. See docs/DECISIONS.md,
// "Epic 7 decisions".
export function GenerateTemporaryPassword(length = 16): string {
  let password = "";

  for (let i = 0; i < length; i++) {
    password += CHARS[randomInt(CHARS.length)];
  }

  return password;
}
