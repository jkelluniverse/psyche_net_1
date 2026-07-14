"use server";

// BIRTH-DATA IMPORT ACTION — the live path: form → provider → import
// transaction → sky. The provider factory THROWS if ASTROLOGY_API_KEY is
// unset (never a silent stub); a provider or parse failure lands as the
// retryable status=error import row with zero nodes, and the form shows
// the calm error. Auth is checked HERE (server action = its own boundary).

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { createAstrologyApiProvider } from "@/src/engine/lens/adapters/astrology-api";
import { importChartFromProvider } from "@/src/engine/lens/import-chart";

export interface ImportFormState {
  error: string | null;
}

export async function importBirthChart(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const birthTime = String(formData.get("birthTime") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "")
    .trim()
    .toUpperCase();
  const tzResolved = String(formData.get("tzResolved") ?? "").trim();

  if (!birthDate || !birthTime || !city || !countryCode || !tzResolved) {
    return { error: "All fields are needed to read a chart." };
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { error: "Country should be a two-letter code (e.g. US, GB, DE)." };
  }

  let provider;
  try {
    provider = createAstrologyApiProvider({
      apiKey: process.env.ASTROLOGY_API_KEY,
    });
  } catch {
    // Configuration problem, not a user problem — say so without detail.
    return {
      error:
        "The chart service isn't configured on this deployment yet. Nothing was imported.",
    };
  }

  const result = await importChartFromProvider(prisma, {
    userId: user.id,
    system: "human_design",
    provider,
    birth: {
      birthDate,
      birthTime,
      birthPlace: `${city}, ${countryCode}`,
      tzResolved,
    },
    city,
    countryCode,
    now: new Date(),
  });

  if (!result.ok) {
    return {
      error:
        "The chart couldn't be read just now. Nothing partial was saved — you can simply try again.",
    };
  }

  redirect("/sky");
}
