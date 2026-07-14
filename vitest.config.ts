import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The DB-gated suites (graph-writer, oracle-pipeline) share one Postgres
    // via TEST_DATABASE_URL and reset it between tests; parallel test FILES
    // would wipe each other's rows mid-run. The whole suite runs in ~2s, so
    // sequential files cost nothing and make DB tests deterministic.
    fileParallelism: false,
  },
});
