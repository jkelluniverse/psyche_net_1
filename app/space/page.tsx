// /space — the INDIVIDUAL role home (lib/roles.ts sends sign-ins here).
// For the ghost-sky milestone the person's space IS their sky; this stays a
// thin dispatch so the eventual space shell can grow around it without
// touching roleHome.

import { redirect } from "next/navigation";

export default function SpacePage() {
  redirect("/sky");
}
