-- Migration 9 — rejection telemetry pull-forward (ruled 2026-07-15; the
-- round-1 approved-but-deferred item, argued into NOW by the candidate-
-- identity diagnosis: paraphrase loss was invisible because detail died at
-- the writer). Proposal rows gain a structured detail column: per-evidence
-- failure reasons for gate rejections, wrapper drop detail for wrapper
-- rejections. Sanitized at the source — reasons and spans, never content
-- beyond what the proposal payload already carries.

ALTER TABLE "Proposal" ADD COLUMN "rejectionDetail" JSONB;
