import { describe, expect, it } from "vitest";
import {
  tryValidateSchemaDocument,
  tryValidateSchemaFieldNullability,
  validateSchemaDocument,
  validateSchemaFieldNullability,
  schemaDefinition,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaUnknownNode,
  areEquivalentSchemaDocuments,
  normalizeSchemaDocument,
  schemaDocument,
  transformSchemaDocument,
} from "../../packages/core/src/index.js";
import { areEquivalentSchemaNodes } from "../../packages/core/src/schema/equivalence.js";
import { identifierName } from "../../packages/core/src/schema/identifiers.js";
import type { SchemaDocument } from "../../packages/core/src/schema/types.js";

describe("core schema internals", () => {
  it("treats equivalent unknown nodes as equal even when evidence differs", () => {
    expect(
      areEquivalentSchemaNodes(
        schemaUnknownNode({
          reason: "empty-array-element",
          evidence: {
            source: "parser-json",
            detail: "first sample",
          },
        }),
        schemaUnknownNode({
          reason: "empty-array-element",
          evidence: {
            source: "parser-json",
            detail: "second sample",
          },
        }),
      ),
    ).toBe(true);
  });

  it("treats union member order as semantically irrelevant", () => {
    expect(
      areEquivalentSchemaNodes(
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaScalarNode("integer"),
        ]),
        schemaUnionNode([
          schemaScalarNode("integer"),
          schemaScalarNode("string"),
        ]),
      ),
    ).toBe(true);
  });

  it("validates duplicate definitions and missing references independently", () => {
    const duplicateDefinitions: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("DuplicateDefinitions"),
      definitions: [
        schemaDefinition("User", schemaScalarNode("string")),
        schemaDefinition("User", schemaScalarNode("integer")),
      ],
      root: schemaReferenceNode("User"),
    };

    expect(() => validateSchemaDocument(duplicateDefinitions)).toThrow(
      'Invalid schema document: duplicate definition name "User".',
    );

    const missingReference: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("MissingReference"),
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ],
      root: schemaReferenceNode("Account"),
    };

    expect(() => validateSchemaDocument(missingReference)).toThrow(
      'Invalid schema document: reference "Account" does not match a known definition.',
    );
  });

  it("validates root declaration identity and keeps legacy documents valid", () => {
    const document = schemaDocument(
      "UserDocument",
      schemaReferenceNode("User"),
      {
        rootName: "User",
        definitions: [schemaDefinition("User", schemaScalarNode("string"))],
      },
    );

    expect(document.rootName?.source).toBe("User");
    expect(
      tryValidateSchemaDocument({
        ...document,
        rootName: identifierName("Account"),
      }),
    ).toMatchObject({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "root-name-reference-mismatch" }),
      ],
    });

    const missingRootDefinition = tryValidateSchemaDocument({
      ...document,
      rootName: identifierName("User"),
      definitions: [],
    });
    expect(missingRootDefinition.ok).toBe(false);
    if (!missingRootDefinition.ok) {
      expect(
        missingRootDefinition.diagnostics.map((item) => item.code),
      ).toContain("missing-root-definition");
    }

    expect(
      tryValidateSchemaDocument({
        version: "0.1",
        kind: "document",
        name: identifierName("Legacy"),
        definitions: [],
        root: schemaScalarNode("string"),
      }),
    ).toEqual({ ok: true });

    const inlineRootConflict = tryValidateSchemaDocument({
      version: "0.1",
      kind: "document",
      name: identifierName("UserDocument"),
      rootName: identifierName("User"),
      definitions: [schemaDefinition("User", schemaScalarNode("string"))],
      root: schemaObjectNode([]),
    });
    expect(inlineRootConflict).toMatchObject({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "root-name-definition-conflict",
          path: ["rootName"],
          evidence: {
            rootName: "User",
            conflictingDefinition: "User",
          },
        }),
      ],
    });

    expect(
      tryValidateSchemaDocument({
        version: "0.1",
        kind: "document",
        name: identifierName("UserDocument"),
        rootName: identifierName("User"),
        definitions: [schemaDefinition("Address", schemaScalarNode("string"))],
        root: schemaObjectNode([]),
      }),
    ).toEqual({ ok: true });
  });

  it("preserves rootName through normalization and transforms", () => {
    const document = schemaDocument(
      "UserDocument",
      schemaReferenceNode("User"),
      {
        rootName: "User",
        definitions: [schemaDefinition("User", schemaScalarNode("string"))],
      },
    );
    const transformer = { transformNode: (node: typeof document.root) => node };

    expect(normalizeSchemaDocument(document).rootName?.source).toBe("User");
    expect(
      transformSchemaDocument(document, transformer).rootName?.source,
    ).toBe("User");
    expect(
      areEquivalentSchemaDocuments(
        document,
        schemaDocument("UserDocument", schemaReferenceNode("User"), {
          rootName: "User",
          definitions: [schemaDefinition("User", schemaScalarNode("string"))],
        }),
      ),
    ).toBe(true);
  });

  it("validates duplicate fields and invalid record keys", () => {
    const invalid: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("InvalidShape"),
      definitions: [],
      root: {
        kind: "object",
        fields: [
          schemaFieldNode("value", schemaScalarNode("string")),
          schemaFieldNode("value", schemaScalarNode("number")),
        ],
        additionalProperties: {
          kind: "record",
          key: schemaScalarNode("number"),
          value: schemaScalarNode("string"),
        },
      },
    };

    expect(tryValidateSchemaDocument(invalid)).toMatchObject({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "duplicate-field-name" }),
        expect.objectContaining({ code: "invalid-record-key" }),
      ],
    });
  });

  it("keeps record semantics distinct from fixed objects", () => {
    const record = schemaRecordNode(
      schemaScalarNode("string"),
      schemaReferenceNode("User"),
    );
    const nested = schemaRecordNode(
      schemaScalarNode("string"),
      schemaUnionNode([schemaScalarNode("string"), schemaNullNode()]),
    );

    expect(record.kind).toBe("record");
    expect(nested.kind).toBe("record");
    expect(areEquivalentSchemaNodes(record, nested)).toBe(false);
    expect(
      areEquivalentSchemaNodes(
        {
          kind: "object",
          fields: [],
          additionalProperties: schemaScalarNode("string"),
        },
        record,
      ),
    ).toBe(false);
  });

  it("returns structured document validation diagnostics without throwing", () => {
    const missingReference: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("MissingReference"),
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ],
      root: schemaReferenceNode("Account"),
    };

    expect(tryValidateSchemaDocument(missingReference)).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "unknown-reference",
          message:
            'Invalid schema document: reference "Account" does not match a known definition.',
          path: ["root"],
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: "Account",
          },
        },
      ],
    });
  });

  it("validates nullable-null conflicts independently", () => {
    expect(() => validateSchemaFieldNullability(schemaNullNode())).toThrow(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  });

  it("returns structured field-nullability diagnostics without throwing", () => {
    expect(tryValidateSchemaFieldNullability(schemaNullNode())).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "invalid-field-nullability",
          message:
            'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
          nodeKind: "field",
          source: "core",
        },
      ],
    });
  });
});
