// BIRTH-DATA ENTRY — the door into the ghost sky. Auth-gated server page;
// the form's import runs the full atomic transaction (provider → parser →
// selector → writer) and lands on /sky.

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { Eyebrow, SignatureRule } from "@/components/brand";
import { BirthForm } from "./BirthForm";

export default async function BirthPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>Birth data</Eyebrow>
        <h1 className="text-2xl font-semibold">Place the first stars</h1>
        <SignatureRule />
        <p className="text-sm leading-relaxed text-ink/70">
          Your chart places faint hypothesis stars — draft readings your own
          words can later confirm or contradict. Nothing about you is treated
          as true until you say it yourself.
        </p>
      </div>
      <BirthForm />
    </main>
  );
}
