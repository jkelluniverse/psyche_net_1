// TAP-FOR-EVIDENCE — the canonical-snippet endpoint (renderer-lens spec §2).
//
// Slices SourceEvent.content by the PERSISTED spans, server-side: the full
// content never leaves this handler, only the verified slice (or a visible
// mismatch error — never a silent fallback). Auth-scoped: the node must
// belong to the session user. The WOUND veil applies here too — a veiled
// node's evidence stays veiled (fail-closed; v1 has no release carrier), so
// this endpoint cannot become the leak the projection prevents.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { buildEvidencePanel } from "@/src/engine/evidence-panel/snippets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const nodeId = new URL(req.url).searchParams.get("nodeId");
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId required" }, { status: 400 });
  }

  const node = await prisma.psycheNode.findFirst({
    where: { id: nodeId, userId: user.id },
    include: {
      evidence: {
        include: {
          sourceEvent: {
            select: { content: true, authorship: true, invalidatedAt: true },
          },
        },
      },
    },
  });
  if (!node) {
    // Same shape for "not yours" and "doesn't exist" — no existence oracle.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (node.type === "WOUND") {
    // Veiled-but-present (D-R5): presence is known from the sky; the words
    // are not. The panel gets the count-free veil response, not the rows.
    return NextResponse.json({ veiled: true, entries: [], omittedInvalidated: 0 });
  }

  const panel = buildEvidencePanel(
    node.evidence.map((e) => ({
      evidenceId: e.id,
      quote: e.quote,
      spanStart: e.spanStart,
      spanEnd: e.spanEnd,
      occurredAt: e.occurredAt,
      polarity: e.polarity,
      role: e.role,
      authorship: e.sourceEvent.authorship,
      sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
      content: e.sourceEvent.content,
    })),
    node.type,
  );
  return NextResponse.json({ veiled: false, ...panel });
}
