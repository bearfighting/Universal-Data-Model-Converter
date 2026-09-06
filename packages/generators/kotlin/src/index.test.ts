import { describe, expect, it } from "vitest";
import {
  constraint,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
} from "@schema-transformation-toolkit/core";
import { generateKotlin, tryGenerateKotlin } from "./api.js";

describe("Kotlin generator", () => {
  it("generates data classes and preserves nested nullable types", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string"), { nullable: true }),
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      ]),
      { rootName: "User" },
    );
    expect(generateKotlin(document)).toBe(
      `data class User(\n    val name: String?,\n    val tags: List<String>,\n)\n`,
    );
  });

  it("uses Set when unique-items is available and supports class/var options", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      ]),
      { rootName: "User" },
    );
    const constraints = constraintDocument("User", [
      constraintEntry(constraintTarget("node", ["root", "tags"]), [
        constraint("unique-items", { value: true }),
      ]),
    ]);
    expect(
      generateKotlin(
        document,
        {
          declarationStyle: "class",
          propertyStyle: "var",
          packageName: "com.example.models",
        },
        constraints,
      ),
    ).toBe(
      `package com.example.models\n\nclass User(\n    var tags: Set<String>,\n)\n`,
    );
  });

  it("normalizes enum member names and reports loss", () => {
    const document = schemaDocument(
      "Status",
      { kind: "union", members: [{ kind: "literal", value: "in-progress" }] },
      { rootName: "Status" },
    );
    const result = tryGenerateKotlin(document);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("IN_PROGRESS");
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "kotlin-enum-member-renamed" }),
      ]),
    );
  });

  it("rejects invalid schema property identifiers", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("not-valid", schemaScalarNode("string")),
      ]),
    );
    expect(tryGenerateKotlin(document)).toMatchObject({
      ok: false,
      code: "invalid-kotlin-identifier",
    });
  });

  it("rejects optional fields because V1 does not generate defaults", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
        }),
      ]),
    );
    expect(tryGenerateKotlin(document)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-optional-field",
    });
  });

  it("escapes keyword declaration names", () => {
    const document = schemaDocument(
      "class",
      schemaObjectNode([schemaFieldNode("value", schemaScalarNode("string"))]),
      { rootName: "class" },
    );
    expect(generateKotlin(document)).toContain("data class `class`(");
  });

  it("rejects empty data class objects", () => {
    const document = schemaDocument("Empty", schemaObjectNode([]));
    expect(tryGenerateKotlin(document)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-empty-object",
    });
  });

  it("rejects additional properties instead of dropping them", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))], {
        additionalProperties: schemaScalarNode("string"),
      }),
    );
    expect(tryGenerateKotlin(document)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-additional-properties",
    });
  });

  it("rejects numeric representations Kotlin V1 cannot preserve", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode(
          "id",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 32,
            },
          }),
        ),
      ]),
    );
    expect(tryGenerateKotlin(document)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-representation",
    });
  });

  it("rejects inline literals instead of widening them", () => {
    const literalDocument = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("status", { kind: "literal", value: "active" }),
      ]),
    );
    expect(tryGenerateKotlin(literalDocument)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-node",
    });

    const nullableLiteralDocument = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("status", {
          kind: "union",
          members: [{ kind: "literal", value: "active" }, { kind: "null" }],
        }),
      ]),
    );
    expect(tryGenerateKotlin(nullableLiteralDocument)).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-node",
    });
  });
});
