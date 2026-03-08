import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("vite dev proxy", () => {
  it("declares /api proxy target in vite config", () => {
    const text = readFileSync("vite.config.ts", "utf-8");
    expect(text).toContain("proxy");
    expect(text).toContain("\"/api\"");
    expect(text).toContain("127.0.0.1:8000");
  });
});
