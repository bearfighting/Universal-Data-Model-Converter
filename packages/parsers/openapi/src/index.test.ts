import { describe, expect, it } from "vitest";
import { tryParseOpenApiDocument } from "./index.js";

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
});
