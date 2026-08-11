import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaObjectNode,
  schemaScalarNode,
  identifierName,
} from "@schema-transformation-toolkit/core";
import {
  decimalValue,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  numericConstraint,
} from "@schema-transformation-toolkit/core";
import { tryGenerateRust } from "@schema-transformation-toolkit/generator-rust";

describe("Rust generator", () => {
  it("generates stable public structs and respects representation hints", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        {
          kind: "field",
          name: identifierName("id"),
          required: true,
          nullable: false,
          type: schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 64,
            },
          }),
        },
        {
          kind: "field",
          name: identifierName("name"),
          required: false,
          nullable: true,
          type: schemaScalarNode("string"),
        },
      ]),
    );
    const result = tryGenerateRust(document);
    expect(result).toMatchObject({
      ok: true,
      output:
        "pub struct User {\n    pub id: u64,\n    pub name: Option<String>,\n}",
    });
  });

  it("preserves exact decimal constraints as a loss report instead of coercing them", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        {
          kind: "field",
          name: identifierName("id"),
          required: true,
          nullable: false,
          type: schemaScalarNode("integer"),
        },
      ]),
    );
    const constraints = constraintDocument("User", [
      constraintEntry(constraintTarget("node", ["root", "id"]), [
        numericConstraint("maximum", decimalValue("18446744073709551615")),
      ]),
    ]);
    const result = tryGenerateRust(document, {}, constraints);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("u64");
    expect(
      result.semanticNotes?.some(
        (note) => note.code === "rust-constraint-not-enforced",
      ),
    ).toBe(true);
  });

  it("rejects unsupported root shapes", () => {
    const result = tryGenerateRust(
      schemaDocument("Value", schemaScalarNode("string")),
    );
    expect(result).toMatchObject({ ok: false, code: "unsupported-rust-root" });
  });

  it("rejects representation ranges that cannot be expressed", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        {
          kind: "field",
          name: identifierName("id"),
          required: true,
          nullable: false,
          type: schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 8,
            },
          }),
        },
      ]),
    );
    const constraints = constraintDocument("User", [
      constraintEntry(constraintTarget("node", ["root", "id"]), [
        numericConstraint("maximum", 300),
      ]),
    ]);
    expect(tryGenerateRust(document, {}, constraints)).toMatchObject({
      ok: false,
      code: "incompatible-rust-representation",
    });
  });

  it("widens exclusive integer boundaries safely", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        {
          kind: "field",
          name: identifierName("id"),
          required: true,
          nullable: false,
          type: schemaScalarNode("integer"),
        },
      ]),
    );
    const constraints = constraintDocument("User", [
      constraintEntry(constraintTarget("node", ["root", "id"]), [
        numericConstraint("exclusive-minimum", 255),
      ]),
    ]);
    expect(tryGenerateRust(document, {}, constraints)).toMatchObject({
      ok: true,
      output: expect.stringContaining("u16"),
    });
  });
});
