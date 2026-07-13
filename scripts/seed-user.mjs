#!/usr/bin/env node
// One-off user seeder. Reads everything from env — no credentials in files.
//
// Usage (e.g. in the Railway service shell, where DATABASE_URL already exists):
//   SEED_EMAIL="you@example.com" SEED_PASSWORD_HASH='$2a$12$…' node scripts/seed-user.mjs
// or, to hash a plaintext password on the spot (bcryptjs, cost 12):
//   SEED_EMAIL="you@example.com" SEED_PASSWORD="plaintext" node scripts/seed-user.mjs
// Optional: SEED_ROLE (default PRACTITIONER), SEED_DISPLAY_NAME.
//
// Upserts by email (idempotent: re-running updates the hash/role, never duplicates).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.SEED_EMAIL;
const role = process.env.SEED_ROLE || "PRACTITIONER";
const displayName = process.env.SEED_DISPLAY_NAME || null;

if (!email) {
  console.error("SEED_EMAIL not set");
  process.exit(1);
}
let passwordHash = process.env.SEED_PASSWORD_HASH;
if (!passwordHash && process.env.SEED_PASSWORD) {
  passwordHash = bcrypt.hashSync(process.env.SEED_PASSWORD, 12);
}
if (!passwordHash) {
  console.error("Set SEED_PASSWORD_HASH (bcrypt) or SEED_PASSWORD (plaintext to hash)");
  process.exit(1);
}
if (!passwordHash.startsWith("$2")) {
  console.error("SEED_PASSWORD_HASH does not look like a bcrypt hash — refusing");
  process.exit(1);
}

const prisma = new PrismaClient();
const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash, role, active: true, ...(displayName ? { displayName } : {}) },
  create: {
    email,
    passwordHash,
    role,
    active: true,
    ageVerified: true,
    ...(displayName ? { displayName } : {}),
  },
});
console.log(`seeded user ${user.id} (${user.email}) role=${user.role} active=${user.active}`);
await prisma.$disconnect();
