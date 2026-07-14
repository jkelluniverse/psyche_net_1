// THE IMPORT TRANSACTION — parser → selector → writer (renderer-lens spec §1).
//
// Two pinned properties:
// - IDEMPOTENT per (user, system): the canonical chartFingerprint (normalized
//   birth inputs + tz + provider + system — never the provider's JSON bytes)
//   upserts the ChartImport row; lens nodes upsert by key through the writer.
// - ATOMIC FAILURE: a parse failure commits ONLY the status=error import row
//   (the retryable record) and zero nodes — never a partial ghost sky.
//
// Everything runs in one Prisma transaction with retry on serialization
// failure (concurrent imports cannot double-mint — the migration-7 partial
// unique is the backstop). Version stamps: parser + vocabulary + map +
// selector config on the import row; map + arithmetic-config versions +
// computedAt on every ghost (via the writer).

import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { parseChart } from "./parse-chart";
import type { LensConfig } from "./select-ghosts";
import { LENS_CONFIG_V1, selectGhosts } from "./select-ghosts";
import type { LensTemplate } from "./lens-map.v1";
import { writeLensGhosts } from "../graph-writer/writer";
import { GATE_CONFIG_V1 } from "../citation-gate/config";

export interface BirthInputs {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  tzResolved: string;
}

export interface ImportChartInput {
  userId: string;
  system: "human_design" | "western_natal";
  provider: string;
  birth: BirthInputs;
  /** The provider's raw response (already fetched by the adapter). */
  rawChart: unknown;
  now: Date;
  config?: LensConfig;
}

export type ImportChartResult =
  | {
      ok: true;
      chartImportId: string;
      ghosts: LensTemplate[];
      dropped: LensTemplate[];
      skipped: { path: string; reason: string }[];
      created: number;
      updated: number;
      archived: number;
    }
  | { ok: false; chartImportId: string; reason: string };

/** Canonical fingerprint: normalized birth inputs, never provider JSON bytes. */
export function chartFingerprint(
  birth: BirthInputs,
  provider: string,
  system: string,
): string {
  const canonical = JSON.stringify({
    birthDate: birth.birthDate.trim(),
    birthTime: birth.birthTime.trim(),
    birthPlace: birth.birthPlace.trim().toLowerCase(),
    tzResolved: birth.tzResolved.trim(),
    provider: provider.trim().toLowerCase(),
    system,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

const SERIALIZATION_RETRIES = 3;

export async function importChart(
  prisma: PrismaClient,
  input: ImportChartInput,
): Promise<ImportChartResult> {
  const config = input.config ?? LENS_CONFIG_V1;
  const fingerprint = chartFingerprint(input.birth, input.provider, input.system);

  let lastError: unknown;
  for (let attempt = 0; attempt < SERIALIZATION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => runImport(tx, input, config, fingerprint));
    } catch (err) {
      // Unique-violation under concurrency = the sibling import won; retry
      // resolves to the upsert path. Anything else propagates.
      const code = (err as { code?: string })?.code;
      if (code === "P2002" || code === "40001") {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function runImport(
  tx: Prisma.TransactionClient,
  input: ImportChartInput,
  config: LensConfig,
  fingerprint: string,
): Promise<ImportChartResult> {
  const { userId, system, provider, rawChart, now } = input;
  const parse = parseChart(rawChart);

  // Upsert the import row by fingerprint (idempotency), whatever the outcome —
  // an error row is the retryable record the spec requires.
  const existing = await tx.chartImport.findFirst({
    where: { userId, system, chartFingerprint: fingerprint },
  });
  const baseData = {
    raw: (rawChart ?? { unparseable: true }) as Prisma.InputJsonValue,
    importedAt: now,
    provider,
    chartFingerprint: fingerprint,
    parserVersion: parse.parserVersion,
    featureVocabularyVersion: parse.featureVocabularyVersion,
  };

  if (!parse.ok) {
    const row = existing
      ? await tx.chartImport.update({
          where: { id: existing.id },
          data: { ...baseData, status: "error" },
        })
      : await tx.chartImport.create({
          data: { userId, system, ...baseData, status: "error" },
        });
    // ZERO nodes on failure — never a partial ghost sky (spec §1).
    return { ok: false, chartImportId: row.id, reason: parse.reason };
  }

  const selection = selectGhosts(parse.features, config);
  const row = existing
    ? await tx.chartImport.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          status: "ok",
          lensMapVersion: selection.lensMapVersion,
          lensConfigVersion: selection.configVersion,
        },
      })
    : await tx.chartImport.create({
        data: {
          userId,
          system,
          ...baseData,
          status: "ok",
          lensMapVersion: selection.lensMapVersion,
          lensConfigVersion: selection.configVersion,
        },
      });

  // Through the writer — the single choke-point; stamps owned by the configs
  // that own the constants (gate config owns the hypothesis floor).
  const written = await writeLensGhosts(tx, {
    userId,
    chartImportId: row.id,
    ghosts: selection.ghosts.map((g) => ({
      type: g.type,
      label: g.label,
      ontologyKey: g.ontologyKey,
      lensMapVersion: selection.lensMapVersion,
    })),
    confidenceFloor: GATE_CONFIG_V1.confidence.hypothesisFloor,
    stamps: {
      massAlgorithmVersion: GATE_CONFIG_V1.massAlgorithmVersion,
      confidenceAlgorithmVersion: GATE_CONFIG_V1.confidenceAlgorithmVersion,
      stateAlgorithmVersion: GATE_CONFIG_V1.stateAlgorithmVersion,
      gateVersion: GATE_CONFIG_V1.gateVersion,
    },
    now,
  });

  return {
    ok: true,
    chartImportId: row.id,
    ghosts: selection.ghosts,
    dropped: selection.dropped,
    skipped: parse.skipped,
    ...written,
  };
}
