import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Server-side authorization boundary. Role and active status are read from the
// database, not the JWT — that's authoritative, can't drift from a stale token,
// and avoids any redirect loop from a missing session claim. Middleware is only
// a coarse "are you signed in" convenience; these are the real gate.
//
// SEED NOTE (from valentinaapp scaffolding): this module expects auth fields on
// User (email, passwordHash, active) that the committed Psyche-Net schema does
// not yet define — wiring auth up is a pending schema decision, deliberately
// Roles are adapted to the Psyche-Net enum (INDIVIDUAL | PRACTITIONER | ADMIN).
// The schema's display handle is `displayName`; we surface it as `name` so the
// NextAuth session shape stays conventional.

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "INDIVIDUAL" | "PRACTITIONER" | "ADMIN";
  active: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, displayName: true, email: true, role: true, active: true },
  });
  if (!user) return null;
  const { displayName, ...rest } = user;
  return { ...rest, name: displayName };
}

export async function requirePractitioner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "PRACTITIONER") redirect("/space");
  return user;
}

export async function requireIndividual(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "INDIVIDUAL") redirect("/practitioner");
  // Deactivation gate against the DB, so a user deactivated mid-session loses
  // access on their next navigation (not just at next login).
  if (!user.active) redirect("/login?error=inactive");
  return user;
}
