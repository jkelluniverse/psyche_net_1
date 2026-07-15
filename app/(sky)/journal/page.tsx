// JOURNAL — auth-gated entry surface. The waiting-for-reflection count is
// computed by the SAME watermark the extraction pass uses (imported, never
// restated), so what the button promises is exactly what the pass reads.
// Recent entries expand in place to their full text (details/summary —
// keyboard-reachable, no JS).

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { countUnextractedSources } from "@/src/engine/extraction/run-pass";
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

  const [recent, pendingCount] = await Promise.all([
    prisma.sourceEvent.findMany({
      where: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        authorship: "SELF",
        invalidatedAt: null,
      },
      orderBy: { occurredAt: "desc" },
      take: 10,
      select: { id: true, content: true, occurredAt: true },
    }),
    countUnextractedSources(prisma, user.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>Journal</Eyebrow>
        <h1 className="text-2xl font-semibold">In your own words</h1>
        <SignatureRule />
      </div>

      <div className="mt-8">
        <JournalForm pendingCount={pendingCount} />
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
              <li key={e.id}>
                <details className="group rounded-md border border-ink/10 px-3 py-2">
                  <summary className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine">
                    <span className="text-xs text-ink/50">
                      {dateFmt.format(e.occurredAt)}
                    </span>
                    <span className="mt-1 block text-sm text-ink/80 group-open:hidden">
                      {e.content.length > 140
                        ? `${e.content.slice(0, 140)}…`
                        : e.content}
                    </span>
                    <span className="mt-1 hidden text-xs text-ink/50 group-open:block">
                      tap to fold
                    </span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
                    {e.content}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
