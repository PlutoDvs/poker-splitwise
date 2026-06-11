import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Generate a URL-safe secret code for room access links.
 * 9 random bytes -> 12 base64url chars (~72 bits of entropy).
 */
export function generateCode(bytes = 9): string {
  return randomBytes(bytes).toString("base64url");
}
