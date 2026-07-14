// /practitioner — the PRACTITIONER role home (lib/roles.ts sends sign-ins
// here). The practitioner console (client roster, supervised views with
// consent plumbing) is future work; until it exists this dispatches to the
// practitioner's OWN sky so login never dead-ends on a 404. Viewing a
// CLIENT's sky is a different surface and deliberately not reachable here.

import { redirect } from "next/navigation";

export default function PractitionerPage() {
  redirect("/sky");
}
