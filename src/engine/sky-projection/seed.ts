// LAYOUT SEED — the stable per-user seed the projection stamps and cosmos.gl
// consumes (spec §2). A rendering convenience for session-to-session visual
// continuity, never a semantic claim: FNV-1a over the userId, hex-encoded.
// Deterministic, dependency-free, and NOT cryptographic on purpose.

export function stableSeed(userId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
