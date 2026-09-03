/**
 * hash.ts — content hashing for FileNode.hash / declHash / exportHash.
 *
 * Design (§3.1, §6.1) specified xxh3 128-bit hex. xxhash is not a dependency
 * and adding one (native or WASM) is not worth it for a ~28k LOC repo, so this
 * uses Node's built-in sha256 truncated to 128 bits (32 hex chars). Swapping in
 * xxh3 later is a one-line change inside hashBytes.
 */

import { createHash } from 'node:crypto';

export function hashBytes(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

export function hashString(s: string): string {
  return hashBytes(Buffer.from(s, 'utf8'));
}