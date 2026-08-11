import { describe, expect, it } from "vitest";
import { convert } from "../../packages/sdk/src/index.js";

describe("integration: Rust routes", () => {
  it("converts Rust structs to TypeScript and JSON Schema", () => {
    for (const targetFormat of ["typescript", "json-schema"] as const) {
      const result = convert({
        sourceFormat: "rust",
        targetFormat,
        input: "struct User { id: u32, email: Option<String> }",
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok) continue;
      expect(result.output).toBeTruthy();
    }
  });

  it("converts schema-oriented TypeScript to Rust", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "rust",
      input: "interface User { id: number; name?: string | null }",
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("pub struct User");
    expect(result.output).toContain("Option<String>");
  });
});
