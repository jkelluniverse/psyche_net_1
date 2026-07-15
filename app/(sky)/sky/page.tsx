// THE SKY — persisted graph → skyProjection → canvas + canonical list.
// Server component: auth-gated, loads the viewer's OWN graph. The viewer
// context here is always INDIVIDUAL — this is a person looking at their own
// sky (practitioner views of a client's map are a different, future surface
// with consent plumbing; nothing here may anticipate it permissively).

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { loadSkyGraph } from "@/src/engine/sky-projection/load-sky";
import { skyProjection } from "@/src/engine/sky-projection/sky-projection";
import { listModel } from "@/src/engine/sky-projection/list-model";
import { stableSeed } from "@/src/engine/sky-projection/seed";
import { RENDERER_CONFIG_V3 } from "@/src/engine/sky-projection/renderer-config.v3";
import { Eyebrow, SignatureRule } from "@/components/brand";
import { SkyCanvas } from "./SkyCanvas";
import { ListView } from "./ListView";

export const dynamic = "force-dynamic";

export default async function SkyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const now = new Date();
  const graph = await loadSkyGraph(prisma, user.id, now);
  const vm = skyProjection(
    graph.nodes,
    graph.edges,
    now,
    stableSeed(user.id),
    { role: "INDIVIDUAL" },
    RENDERER_CONFIG_V3,
    graph.matchLinks,
    graph.forming,
  );
  const list = listModel(vm);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>Your sky</Eyebrow>
        <SignatureRule />
      </div>

      {vm.nodes.length === 0 && vm.forming.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="text-lg">Your sky is still dark.</p>
          <p className="mt-2 text-sm text-ink/70">
            Add your birth data to place the first hypothesis stars — faint
            ghosts your own words can later confirm or contradict.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/sky/birth"
              className="rounded-md bg-wine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-wine-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            >
              Add birth data
            </Link>
            <Link
              href="/journal"
              className="rounded-md border border-wine/40 px-5 py-2.5 text-sm font-medium text-wine transition-colors hover:bg-wine/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            >
              Write an entry
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <SkyCanvas vm={vm} />
          </div>
          <p className="mt-3 text-center text-xs text-ink/50">
            Positions are a rendering convenience, not a claim — meaning lives
            in the stars, their light, and the drawn connections only.
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/journal"
              className="text-sm text-wine underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            >
              Write in your journal
            </Link>
          </div>
          <div className="mt-12">
            <ListView list={list} />
          </div>
        </>
      )}
    </main>
  );
}
