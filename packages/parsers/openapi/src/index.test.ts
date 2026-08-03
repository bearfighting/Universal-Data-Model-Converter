import { describe, expect, it } from "vitest";
import { openApiParserDescriptor, tryParseOpenApiDocument } from "./index.js";

function expectOk<T extends { ok: boolean }>(
  result: T,
  message: string,
): asserts result is T & { ok: true } {
  if (!result.ok) throw new Error(message);
}

const jsonDocument = JSON.stringify({
  openapi: "3.1.0",
  info: { title: "Example", version: "1.0.0" },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          profile: { $ref: "#/components/schemas/Profile" },
          role: { type: "string", enum: ["admin", "user"] },
        },
        required: ["id", "profile"],
      },
      Profile: {
        type: "object",
        properties: { displayName: { type: "string" } },
      },
    },
  },
});

const yamlDocument = `openapi: 3.0.3
info:
  title: Example
  version: 1.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        profile:
          $ref: '#/components/schemas/Profile'
        role:
          type: string
          enum: [admin, user]
      required: [id, profile]
    Profile:
      type: object
      properties:
        displayName:
          type: string
`;

describe("OpenAPI parser", () => {
  it("parses JSON and YAML OpenAPI schema documents", () => {
    const jsonResult = tryParseOpenApiDocument(jsonDocument, { entry: "User" });
    const yamlResult = tryParseOpenApiDocument(yamlDocument, { entry: "User" });

    expect(jsonResult.ok).toBe(true);
    expect(yamlResult.ok).toBe(true);
    if (jsonResult.ok && yamlResult.ok) {
      expect(jsonResult.document.root).toEqual(yamlResult.document.root);
    }
  });

  it("requires an explicit entry for multi-schema documents", () => {
    const result = tryParseOpenApiDocument(jsonDocument);

    expect(result).toMatchObject({
      ok: false,
      code: "openapi-entry-required",
    });
  });

  it("reports an unknown schema entry", () => {
    const result = tryParseOpenApiDocument(jsonDocument, { entry: "Missing" });

    expect(result).toMatchObject({
      ok: false,
      code: "openapi-entry-not-found",
    });
  });

  it("supports a single schema without requiring an entry", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.0.3",
        components: { schemas: { Health: { type: "object" } } },
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("preserves nullable object structure", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            User: {
              type: "object",
              nullable: true,
              properties: { id: { type: "integer" } },
            },
          },
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.root).toMatchObject({
        kind: "union",
        members: [{ kind: "object" }, { kind: "null" }],
      });
    }
  });

  it.each([
    ["invalid YAML", "openapi: [", "invalid-openapi-document"],
    ["non-object input", "[]", "invalid-openapi-document"],
    ["missing version", JSON.stringify({}), "unsupported-openapi-version"],
    [
      "unsupported version",
      JSON.stringify({ openapi: "2.0", components: {} }),
      "unsupported-openapi-version",
    ],
    [
      "missing schemas",
      JSON.stringify({ openapi: "3.1.0", components: {} }),
      "openapi-schemas-missing",
    ],
  ])("rejects %s explicitly", (_case, input, code) => {
    const result = tryParseOpenApiDocument(input);

    expect(result).toMatchObject({
      ok: false,
      code,
      diagnostics: [
        expect.objectContaining({ code, source: "parser-openapi" }),
      ],
    });
  });

  it("maps arrays, tuples, records, enums, unions, and constraints", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Catalog: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string", minLength: 2 },
                  minItems: 1,
                },
                pair: {
                  type: "array",
                  prefixItems: [{ type: "integer" }, { type: "string" }],
                  items: false,
                },
                labels: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
                state: { type: "string", enum: ["active", "closed"] },
                choice: { anyOf: [{ type: "string" }, { type: "null" }] },
              },
              required: ["tags"],
            },
          },
        },
      }),
    );

    expectOk(result, "Expected OpenAPI schema to parse.");
    expect(result.document.name.source).toBe("Catalog");
    expect(result.document.root).toMatchObject({ kind: "object" });
    if (result.document.root.kind === "object") {
      expect(result.document.root.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.objectContaining({ source: "tags" }),
            required: true,
            type: expect.objectContaining({ kind: "array" }),
          }),
          expect.objectContaining({
            name: expect.objectContaining({ source: "pair" }),
            type: expect.objectContaining({ kind: "tuple" }),
          }),
          expect.objectContaining({
            name: expect.objectContaining({ source: "labels" }),
            type: expect.objectContaining({ kind: "record" }),
          }),
          expect.objectContaining({
            name: expect.objectContaining({ source: "state" }),
            type: expect.objectContaining({ kind: "union" }),
          }),
          expect.objectContaining({
            name: expect.objectContaining({ source: "choice" }),
            nullable: true,
            type: expect.objectContaining({ kind: "scalar" }),
          }),
        ]),
      );
    }
    expect(result.constraints?.kind).toBe("constraint-document");
    expect(result.constraints?.entries.length).toBeGreaterThan(0);
  });

  it("preserves fixed fields alongside typed additional properties", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Settings: {
              type: "object",
              properties: { enabled: { type: "boolean" } },
              required: ["enabled"],
              additionalProperties: { type: "string" },
            },
          },
        },
      }),
    );

    expectOk(result, "Expected mixed object schema to parse.");
    expect(result.document.root).toMatchObject({
      kind: "object",
      additionalProperties: { kind: "scalar", scalar: "string" },
    });
  });

  it("merges safe object-only allOf compositions, including local refs", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Base: {
              type: "object",
              properties: { id: { type: "string" } },
              required: ["id"],
            },
            User: {
              allOf: [
                { $ref: "#/components/schemas/Base" },
                {
                  type: "object",
                  properties: { name: { type: "string" } },
                  required: ["name"],
                },
              ],
            },
          },
        },
      }),
      { entry: "User" },
    );

    expectOk(result, "Expected safe allOf composition to parse.");
    expect(result.document.root).toMatchObject({ kind: "object" });
    if (result.document.root.kind === "object") {
      expect(
        result.document.root.fields.map((field) => field.name.source),
      ).toEqual(["id", "name"]);
      expect(result.document.root.fields.every((field) => field.required)).toBe(
        true,
      );
    }
  });

  it("extracts components schemas without processing API operations", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        info: { title: "Example", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: { id: { type: "integer" } },
            },
          },
        },
      }),
    );

    expectOk(result, "Expected component schema extraction to succeed.");
    expect(result.document.name.source).toBe("User");
    expect(result.document.root).toMatchObject({ kind: "object" });
  });

  it("reports unsupported refs and invalid nested schemas", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Root: {
              type: "object",
              properties: {
                external: { $ref: "#/components/parameters/Id" },
                composed: { allOf: [{ type: "string" }, { type: "object" }] },
                invalid: "not-a-schema",
              },
            },
          },
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "invalid-json-schema-shape",
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unsupported-openapi-ref",
          severity: "error",
          path: [
            "components",
            "schemas",
            "Root",
            "properties",
            "external",
            "$ref",
          ],
          source: "parser-openapi",
        }),
        expect.objectContaining({
          code: "invalid-openapi-schema",
          path: ["components", "schemas", "Root", "properties", "invalid"],
          source: "parser-openapi",
        }),
      ]),
    );
  });

  it("fails on dangling local refs in nested schema positions", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Root: {
              type: "object",
              properties: {
                profile: { $ref: "#/components/schemas/Profile" },
                history: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Event" },
                },
              },
            },
          },
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "openapi-ref-not-found",
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "openapi-ref-not-found",
          path: [
            "components",
            "schemas",
            "Root",
            "properties",
            "profile",
            "$ref",
          ],
          source: "parser-openapi",
        }),
        expect.objectContaining({
          code: "openapi-ref-not-found",
          path: [
            "components",
            "schemas",
            "Root",
            "properties",
            "history",
            "items",
            "$ref",
          ],
          source: "parser-openapi",
        }),
      ]),
    });
  });

  it("applies OpenAPI 3.0 keyword semantics before JSON Schema conversion", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.0.3",
        components: {
          schemas: {
            Bounds: {
              type: "object",
              properties: {
                amount: {
                  type: "number",
                  minimum: 1,
                  exclusiveMinimum: true,
                },
                state: {
                  type: "string",
                  enum: ["active", "closed"],
                  nullable: true,
                },
              },
            },
          },
        },
      }),
    );

    expectOk(result, "Expected OpenAPI 3.0 schema to parse.");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "json-schema-nullable-property-normalized",
        source: "parser-openapi",
      }),
    ]);
    expect(result.document.root).toMatchObject({ kind: "object" });
  });

  it("preserves portable schema annotations", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string", readOnly: true },
              },
            },
          },
        },
      }),
    );

    expectOk(result, "Expected portable metadata to remain non-fatal.");
    expect(result.constraints?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: expect.arrayContaining([
            expect.objectContaining({ kind: "read-only", value: true }),
          ]),
        }),
      ]),
    );
  });

  it("rejects OpenAPI 3.0 boolean tuple schemas explicitly", () => {
    const result = tryParseOpenApiDocument(
      JSON.stringify({
        openapi: "3.0.3",
        components: {
          schemas: {
            Pair: {
              type: "array",
              prefixItems: [{ type: "integer" }, { type: "string" }],
              items: false,
            },
          },
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "unsupported-openapi-keyword",
          path: ["components", "schemas", "Pair", "prefixItems"],
        }),
        expect.objectContaining({
          code: "invalid-openapi-schema",
          path: ["components", "schemas", "Pair", "items"],
        }),
      ]),
    });
  });

  it("honors descriptor context, metadata, and parser options", () => {
    expect(openApiParserDescriptor.kind).toBe("parser");
    expect(openApiParserDescriptor.descriptorVersion).toBe("0.1");
    expect(openApiParserDescriptor.format).toBe("openapi");
    expect(openApiParserDescriptor.capabilities.producesIr).toContain("shape");
    expect(openApiParserDescriptor.options.format).toBe("openapi");
    expect(openApiParserDescriptor.options.role).toBe("parser");
    expect(openApiParserDescriptor.parse).toEqual(expect.any(Function));
    expect(openApiParserDescriptor.options.options).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "entry" })]),
    );

    const result = openApiParserDescriptor.parse(jsonDocument, {
      name: "RenamedUser",
      options: { entry: "User" },
    });

    expectOk(result, "Expected descriptor parsing to succeed.");
    expect(result.document.name.source).toBe("RenamedUser");
  });
});
