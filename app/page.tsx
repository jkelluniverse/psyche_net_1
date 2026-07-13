import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { roleHome } from "@/lib/roles";
import { SignatureRule, Eyebrow } from "@/components/brand";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(roleHome(user.role));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <Eyebrow>Psyche-Net</Eyebrow>
        <h1 className="text-[2.25rem] font-semibold">A living map of your inner sky</h1>
        <SignatureRule />
      </div>
      <p className="max-w-md text-lg leading-relaxed text-ink">
        An evidence-bound map of your inner architecture — nothing is true until your own words say so.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-wine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-wine-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
      >
        Sign in
      </Link>
    </main>
  );
}
