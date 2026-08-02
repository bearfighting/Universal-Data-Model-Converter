import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaDefinition,
  schemaArrayNode,
  schemaUnionNode,
  schemaLiteralNode,
  type SchemaDocument,
} from "@aio/core";
import {
  tryGenerateZod,
  zodGenerator,
} from "../../../packages/generators/zod/src/index.js";

describe("generator-zod", () => {
  it("renders TypeScript schemas and inferred types", () => {
    const result = tryGenerateZod(
      schemaDocument(
        "User",
        schemaObjectNode([
          schemaFieldNode("id", schemaScalarNode("integer")),
          schemaFieldNode("name", schemaScalarNode("string"), {
            required: false,
            nullable: true,
          }),
        ]),
      ),
    );

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.output).toContain('import { z } from "zod";');
    expect(result.output).toContain("z.strictObject");
    expect(result.output).toContain("id: z.number().int()");
    expect(result.output).toContain("name: z.string().nullable().optional()");
    expect(result.output).toContain(
      "export type User = z.infer<typeof UserSchema>;",
    );
    expect(result.semanticNotes?.map((note) => note.code)).toContain(
      "zod-object-policy",
    );
  });

  it("renders JavaScript without TypeScript-only declarations", () => {
    const result = tryGenerateZod(
      schemaDocument("Status", schemaLiteralNode("ready")),
      { outputLanguage: "javascript" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain(
      'export const StatusSchema = z.literal("ready");',
    );
    expect(result.output).not.toContain("z.infer");
  });

  it("uses lazy references for recursive definitions", () => {
    const node = schemaDefinition(
      "Node",
      schemaObjectNode([
        schemaFieldNode(
          "children",
          schemaArrayNode(schemaReferenceNode("Node")),
        ),
      ]),
    );
    const result = tryGenerateZod(
      schemaDocument("Node", schemaReferenceNode("Node"), {
        definitions: [node],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("z.lazy(() => NodeSchema)");
  });

  it("fails for unresolved references and rendered name collisions", () => {
    const unresolved = tryGenerateZod({
      version: "0.1",
      kind: "document",
      name: { source: "Root", words: ["Root"] },
      definitions: [],
      root: schemaReferenceNode("Missing"),
    } satisfies SchemaDocument);
    expect(unresolved).toMatchObject({
      ok: false,
      code: "invalid-reference-name",
    });

    const collision = tryGenerateZod(
      schemaDocument("User", schemaScalarNode("string"), {
        definitions: [schemaDefinition("user", schemaScalarNode("number"))],
      }),
    );
    expect(collision).toMatchObject({
      ok: false,
      code: "duplicate-rendered-schema-name",
    });
  });

  it("exposes the generator contract", () => {
    expect(zodGenerator.target).toBe("zod");
    expect(
      zodGenerator.generate(
        schemaDocument(
          "Value",
          schemaUnionNode([schemaLiteralNode("a"), schemaLiteralNode("b")]),
        ),
      ),
    ).toMatchObject({ ok: true });
  });
});
