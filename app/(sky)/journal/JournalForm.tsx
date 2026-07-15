"use client";

// JOURNAL FORM — the words' front door, kept quiet and unhurried.
// No streaks, no prompts to disclose more, no depth scoring (LAW 6).
//
// Two clearly separate acts (Jacob's phone walk caught these read as one):
// 1. SAVE keeps the entry — and the page refreshes so it appears below.
// 2. REFLECT is its own section: it reads SAVED entries into the sky (the
//    count comes from the server watermark, so it visibly operates on what
//    is already kept — never on the textarea, never needing a retype).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  reflectNow,
  saveEntry,
  type JournalFormState,
  type ReflectState,
} from "./actions";
import type { ReflectSummary } from "@/src/engine/extraction/run-pass";

/** Jacob's plain-language contract: "I heard N things in your words. M are
 * now on your sky. K are forming — they'll appear when they come up again." */
function summarySentences(s: ReflectSummary): string[] {
  const lines: string[] = [];
  lines.push(
    s.heard === 0
      ? "I listened, and nothing in these words asked to become part of your sky yet."
      : `I heard ${s.heard} thing${s.heard === 1 ? "" : "s"} in your words.`,
  );
  if (s.materialized > 0) {
    lines.push(
      `${s.materialized} ${s.materialized === 1 ? "is" : "are"} now on your sky.`,
    );
  }
  if (s.forming > 0) {
    lines.push(
      `${s.forming} ${s.forming === 1 ? "is" : "are"} forming — you'll see ${s.forming === 1 ? "it" : "them"} as faint points at the edge, and ${s.forming === 1 ? "it" : "they"}'ll take shape when ${s.forming === 1 ? "it comes" : "they come"} up again.`,
    );
  }
  if (s.ghostsCharged > 0) {
    lines.push(
      `${s.ghostsCharged} chart hypothesis${s.ghostsCharged === 1 ? "" : "es"} lit up — your own words just confirmed ${s.ghostsCharged === 1 ? "it" : "them"}.`,
    );
  } else if (s.linksCreated > 0) {
    lines.push("Some of your words reached a standing hypothesis — it brightened.");
  }
  if (s.rejected > 0) {
    lines.push(
      `${s.rejected} reading${s.rejected === 1 ? "" : "s"} couldn't be verified against your exact words and ${s.rejected === 1 ? "was" : "were"} set aside.`,
    );
  }
  return lines;
}

const INITIAL: JournalFormState = { saved: false, error: null, crisis: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-wine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-wine-dark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
    >
      {pending ? "Keeping your words…" : "Save entry"}
    </button>
  );
}

export function JournalForm({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [state, formAction] = useFormState(saveEntry, INITIAL);
  const [reflectError, setReflectError] = useState<string | null>(null);
  const [reflectSummary, setReflectSummary] = useState<ReflectSummary | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // A successful save re-renders the server bits (recent list + the
  // waiting-count) so the page always tells the truth about what's kept.
  useEffect(() => {
    if (state.saved) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">
            What&apos;s here today? Your words stay yours — nothing becomes part
            of your sky unless your own sentences put it there.
          </span>
          <textarea
            name="content"
            required
            rows={8}
            className="rounded-md border border-ink/20 bg-transparent px-3 py-2 text-base leading-relaxed"
            placeholder="Write freely…"
          />
        </label>
        <div>
          <SaveButton />
        </div>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-wine">
          {state.error}
        </p>
      )}
      {state.saved && !state.crisis && (
        <p className="text-sm text-ink/70" role="status">
          Kept — it&apos;s saved below and waiting for reflection. Nothing to
          retype.
        </p>
      )}

      {state.crisis && state.crisis.resources && (
        <aside
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-wine/30 bg-blush-deep/40 p-4"
        >
          <p className="text-sm font-medium text-ink">
            {state.crisis.resources.headline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            {state.crisis.resources.body}
          </p>
          <ul className="mt-3 space-y-1.5">
            {state.crisis.resources.lines.map((line) => (
              <li key={line.value} className="text-sm font-medium text-ink">
                {line.value.startsWith("http") ? (
                  <a
                    href={line.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-wine underline underline-offset-2"
                  >
                    {line.label}
                  </a>
                ) : (
                  line.label
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/60">
            Your entry was saved. This note is here because some of your words
            sounded heavy — a reflection tool can hold words, but a person can
            hold you.
          </p>
        </aside>
      )}

      {/* ── Reflection: its own act, on SAVED entries ─────────────────── */}
      <section
        aria-label="Reflection"
        className="mt-2 rounded-lg border border-ink/10 bg-ink/[0.03] p-4"
      >
        <h2 className="text-sm font-semibold text-ink">Reflection</h2>
        <p className="mt-1 text-sm text-ink/70">
          {pendingCount === 0
            ? "Every saved entry has been reflected into your sky. Write something new, save it, and reflect again."
            : `${pendingCount} saved ${pendingCount === 1 ? "entry is" : "entries are"} waiting. Reflection reads them into your sky — your exact words become the evidence.`}
        </p>
        <button
          type="button"
          disabled={reflecting || pendingCount === 0}
          onClick={async () => {
            setReflecting(true);
            setReflectError(null);
            setReflectSummary(null);
            const result: ReflectState = await reflectNow();
            setReflectError(result.error);
            setReflectSummary(result.summary);
            setReflecting(false);
            router.refresh(); // the waiting-count and recent list update
          }}
          className="mt-3 rounded-md border border-wine/40 px-5 py-2.5 text-sm font-medium text-wine transition-colors hover:bg-wine/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        >
          {reflecting
            ? "Reading your words…"
            : pendingCount === 0
              ? "Nothing waiting to reflect"
              : `Reflect ${pendingCount === 1 ? "this entry" : `these ${pendingCount} entries`} into my sky`}
        </button>
        {reflectError && (
          <p role="alert" className="mt-2 text-sm text-wine">
            {reflectError}
          </p>
        )}
        {reflectSummary && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-md border border-ink/15 bg-canvas p-3"
          >
            {summarySentences(reflectSummary).map((line) => (
              <p key={line} className="text-sm leading-relaxed text-ink/85">
                {line}
              </p>
            ))}
            <Link
              href="/sky"
              className="mt-3 inline-block rounded-md bg-wine px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-wine-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            >
              See your sky
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
