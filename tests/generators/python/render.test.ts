import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaArrayNode,
  schemaDefinition,
} from "@schema-transformation-toolkit/core";
import { tryGeneratePython } from "@schema-transformation-toolkit/generator-python";

describe("Python dataclass generator", () => {
  it("renders deterministic modern dataclasses", () => {
    const address = schemaObjectNode([
      schemaFieldNode("city", schemaScalarNode("string")),
    ]);
    const user = schemaObjectNode([
      schemaFieldNode("name", schemaScalarNode("string")),
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      schemaFieldNode("address", schemaReferenceNode("Address")),
      schemaFieldNode("nickname", schemaScalarNode("string"), {
        nullable: true,
      }),
    ]);
    const result = tryGeneratePython(
      schemaDocument("User", user, {
        definitions: [schemaDefinition("Address", address)],
      }),
    );
    expect(result).toEqual({
      ok: true,
      output: expect.stringContaining("class User:"),
    });
    if (!result.ok) return;
    expect(result.output).toContain("from __future__ import annotations");
    expect(result.output).toContain("tags: list[str]");
    expect(result.output).toContain("nickname: str | None");
    expect(result.output.indexOf("class Address:")).toBeLessThan(
      result.output.indexOf("class User:"),
    );
  });

  it("renders a named root reference emitted by another Shape parser", () => {
    const user = schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
    ]);
    const result = tryGeneratePython(
      schemaDocument("Document", schemaReferenceNode("User"), {
        definitions: [schemaDefinition("User", user)],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toContain("class User:");
  });

  it("rejects optional field presence instead of making it required", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
        }),
      ]),
    );
    expect(tryGeneratePython(document)).toMatchObject({
      ok: false,
      code: "unsupported-python-optional-field",
    });
  });
});
