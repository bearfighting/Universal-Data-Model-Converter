import { describe, expect, it } from "vitest";
import { parseSource } from "../../packages/sdk/src/source.js";

describe("sdk source parsing", () => {
  it("parses valid JSON into Value IR without requiring Shape IR", () => {
    const result = parseSource(
      '[1,"a"]',
      "json",
      "json",
      "MixedValue",
      {
        sourceFormat: "json",
        targetFormat: "json",
        input: '[1,"a"]',
        name: "MixedValue",
      },
      undefined,
      ["value"],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.kind).toBe("value-document");
    expect(result.shape).toBeUndefined();
  });

  it("parses json into value and shape artifacts", () => {
    const result = parseSource(
      '{"id":1,"name":"Ada"}',
      "json",
      "typescript",
      "User",
      {
        sourceFormat: "json",
        targetFormat: "typescript",
        input: '{"id":1,"name":"Ada"}',
        name: "User",
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value?.kind).toBe("value-document");
    if (!result.shape) throw new Error("Expected a Shape IR artifact.");
    expect(result.shape.name.source).toBe("User");
    expect(result.constraints).toBeUndefined();
    expect(result.semanticNotes).toEqual([]);
  });

  it("parses json-schema into shape and constraint artifacts", () => {
    const result = parseSource(
      JSON.stringify({
        title: "ClosedUser",
        type: "object",
        properties: {
          id: { type: "string" },
        },
        additionalProperties: false,
      }),
      "json-schema",
      "json-schema",
      "ClosedUser",
      {
        sourceFormat: "json-schema",
        targetFormat: "json-schema",
        input: "",
        name: "ClosedUser",
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value).toBeUndefined();
    if (!result.shape) throw new Error("Expected a Shape IR artifact.");
    expect(result.shape.name.source).toBe("ClosedUser");
    expect(result.constraints?.entries).toHaveLength(1);
    expect(result.semanticNotes).not.toEqual([]);
  });

  it("preserves OpenAPI schema constraints in the source artifact", () => {
    const result = parseSource(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string", minLength: 1 },
              },
            },
          },
        },
      }),
      "openapi",
      "zod",
      "User",
      {
        sourceFormat: "openapi",
        targetFormat: "zod",
        input: "",
        name: "User",
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.constraints?.kind).toBe("constraint-document");
    expect(result.constraints?.entries.length).toBeGreaterThan(0);
  });

  it("returns a parse failure with route context for invalid sources", () => {
    const result = parseSource("{ invalid", "json", "typescript", "Broken", {
      sourceFormat: "json",
      targetFormat: "typescript",
      input: "{ invalid",
      name: "Broken",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.phase).toBe("parse");
    expect(result.plan.sourceFormat).toBe("json");
    expect(result.plan.targetFormat).toBe("typescript");
  });
});
