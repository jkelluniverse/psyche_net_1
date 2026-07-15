"use client";

// JOURNAL FORM — the words' front door, kept quiet and unhurried.
// No streaks, no prompts to disclose more, no depth scoring (LAW 6) — a
// textarea, a save, and the calm crisis-resource panel when the classifier
// asks for it. "Reflect now" triggers the batched extraction pass
// deliberately (demo affordance; extraction is async by design).

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  reflectNow,
  saveEntry,
  type JournalFormState,
  type ReflectState,
} from "./actions";

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

function ReflectButton({ onError }: { onError: (msg: string | null) => void }) {
  const [running, setRunning] = useState(false);
  return (
    <button
      type="button"
      disabled={running}
      onClick={async () => {
        setRunning(true);
        onError(null);
        const result: ReflectState = await reflectNow();
        // On success the action redirects to /sky; reaching here means it didn't.
        onError(result?.error ?? null);
        setRunning(false);
      }}
      className="rounded-md border border-wine/40 px-5 py-2.5 text-sm font-medium text-wine transition-colors hover:bg-wine/5 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
    >
      {running ? "Reading your words…" : "Reflect now"}
    </button>
  );
}

export function JournalForm() {
  const [state, formAction] = useFormState(saveEntry, INITIAL);
  const [reflectError, setReflectError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={async (fd) => {
          formAction(fd);
          // Clear only after a submit attempt; the action re-renders state.
          formRef.current?.reset();
        }}
        className="flex flex-col gap-3"
      >
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
        <div className="flex items-center gap-3">
          <SaveButton />
          <ReflectButton onError={setReflectError} />
        </div>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-wine">
          {state.error}
        </p>
      )}
      {reflectError && (
        <p role="alert" className="text-sm text-wine">
          {reflectError}
        </p>
      )}
      {state.saved && !state.crisis && (
        <p className="text-sm text-ink/70">
          Kept. When you&apos;re ready, &ldquo;Reflect now&rdquo; reads your
          recent entries into the sky.
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
    </div>
  );
}
