import { describe, expect, it } from "vitest";
import { convert } from "../../packages/sdk/src/index.js";
import { tryGenerateRust } from "../../packages/generators/rust/src/index.js";
import { tryParseRust } from "../../packages/parsers/rust/src/index.js";

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

  it("converts Rust enums and maps across schema-oriented targets", () => {
    const input = `
      use std::collections::HashMap;
      enum Status { Pending, Active }
      struct User { status: Status, labels: HashMap<String, String> }
    `;
    for (const targetFormat of [
      "typescript",
      "json-schema",
      "zod",
      "openapi",
    ] as const) {
      const result = convert({
        sourceFormat: "rust",
        targetFormat,
        input,
        advanced: { parser: { rust: { entry: "User" } } },
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (result.ok) expect(result.output).toBeTruthy();
    }
  });

  it("round-trips Rust recursive models through the Rust generator", () => {
    const result = convert({
      sourceFormat: "rust",
      targetFormat: "rust",
      input: "struct Node { value: String, next: Option<Box<Node>> }",
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("std::collections");
    expect(result.output).toContain("next: Option<Node>");
  });

  it("preserves enum and map semantics across a Rust IR round trip", () => {
    const first = tryParseRust(
      "use std::collections::BTreeMap; enum Status { Pending, Active } struct User { status: Status, labels: BTreeMap<String, String> }",
      { entry: "User", name: "User" },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const generated = tryGenerateRust(
      first.document,
      {},
      first.artifacts.constraints,
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const second = tryParseRust(generated.output, {
      entry: "User",
      name: "User",
    });
    expect(second.ok, JSON.stringify(second)).toBe(true);
    if (!second.ok) return;
    expect(second.document).toEqual(first.document);
  });
});
