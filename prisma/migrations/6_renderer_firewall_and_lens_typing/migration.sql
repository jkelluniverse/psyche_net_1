-- Renderer-lens round 1 integration (spec v1.1; rulings D-R3/D-R4, finding A-4).
--
-- 1. The domain/rendering firewall, structurally: PsycheNode carried
--    x/y/colorHint "for continuity", which is exactly the escape hatch the
--    firewall forbids (force-layout positions are stochastic rendering
--    artifacts, never domain state). Continuity comes from the fixed
--    per-user layout seed; a future layout cache, if ever needed, lives in a
--    rendering-only store keyed by node id — never on domain tables.
ALTER TABLE "PsycheNode" DROP COLUMN IF EXISTS "x";
ALTER TABLE "PsycheNode" DROP COLUMN IF EXISTS "y";
ALTER TABLE "PsycheNode" DROP COLUMN IF EXISTS "colorHint";

-- 2. D-R4: lens hypotheses carry DOMAIN types (BELIEF/PROTECTION/…) with
--    provenance = LENS, so the post-gate matcher's type comparison can fire.
--    NodeType 'LENS' stays in the enum for migration cleanliness but is
--    deprecated-never-written — enforced here, not by convention.
ALTER TABLE "PsycheNode" ADD CONSTRAINT "PsycheNode_type_never_lens"
  CHECK ("type" <> 'LENS');
