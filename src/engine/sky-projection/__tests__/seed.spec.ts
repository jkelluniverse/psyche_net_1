import { describe, expect, it } from "vitest";
import { stableSeed } from "../seed";

describe("stableSeed — per-user layout continuity", () => {
  it("deterministic and user-distinct", () => {
    expect(stableSeed("user-a")).toBe(stableSeed("user-a"));
    expect(stableSeed("user-a")).not.toBe(stableSeed("user-b"));
    expect(stableSeed("user-a")).toMatch(/^[0-9a-f]{8}$/);
  });
});
