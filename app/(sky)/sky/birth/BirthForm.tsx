"use client";

// BIRTH-DATA FORM — minimal, structured, honest. City and country are
// collected as their own fields (the adapter never guesses them out of free
// text); the IANA timezone is auto-detected from the browser and stays
// editable. Errors from the atomic-failure path render calmly — nothing
// partial exists to clean up, and the copy says so.

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importBirthChart, type ImportFormState } from "./actions";

const INITIAL: ImportFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-wine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-wine-dark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
    >
      {pending ? "Reading your chart…" : "Place the first stars"}
    </button>
  );
}

export function BirthForm() {
  const [state, formAction] = useFormState(importBirthChart, INITIAL);
  const tzRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tzRef.current && !tzRef.current.value) {
      tzRef.current.value =
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    }
  }, []);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Birth date
        <input
          name="birthDate"
          type="date"
          required
          className="rounded-md border border-ink/20 bg-transparent px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Birth time (as local to the birthplace)
        <input
          name="birthTime"
          type="time"
          required
          className="rounded-md border border-ink/20 bg-transparent px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Birth city
        <input
          name="city"
          type="text"
          required
          placeholder="Portland"
          className="rounded-md border border-ink/20 bg-transparent px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Country (two-letter code)
        <input
          name="countryCode"
          type="text"
          required
          maxLength={2}
          placeholder="US"
          className="rounded-md border border-ink/20 bg-transparent px-3 py-2 uppercase"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Timezone of the birthplace (IANA)
        <input
          ref={tzRef}
          name="tzResolved"
          type="text"
          required
          placeholder="America/Los_Angeles"
          className="rounded-md border border-ink/20 bg-transparent px-3 py-2"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-wine">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
