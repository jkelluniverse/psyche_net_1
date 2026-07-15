// JOURNAL — auth-gated entry surface. Recent entries render as a quiet
// list (dates + first line, the person's own words); the form and the
// crisis-resource panel live in the client component.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { Eyebrow, SignatureRule } from "@/components/brand";
import { JournalForm } from "./JournalForm";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function JournalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const recent = await prisma.sourceEvent.findMany({
    where: {
      userId: user.id,
      kind: "JOURNAL_TEXT",
      authorship: "SELF",
      invalidatedAt: null,
    },
    orderBy: { occurredAt: "desc" },
    take: 10,
    select: { id: true, content: true, occurredAt: true },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>Journal</Eyebrow>
        <h1 className="text-2xl font-semibold">In your own words</h1>
        <SignatureRule />
      </div>

      <div className="mt-8">
        <JournalForm />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/sky"
          className="text-sm text-wine underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        >
          Back to your sky
        </Link>
      </div>

      {recent.length > 0 && (
        <section aria-label="Recent entries" className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink/60">
            Recent entries
          </h2>
          <ul className="mt-3 space-y-3">
            {recent.map((e) => (
              <li key={e.id} className="rounded-md border border-ink/10 px-3 py-2">
                <p className="text-xs text-ink/50">{dateFmt.format(e.occurredAt)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink/80">{e.content}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
