import { describe, expect, it } from "vitest";
import {
  constraint,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
} from "@schema-transformation-toolkit/core";
import { generateOpenApi, tryGenerateOpenApi } from "./index.js";

describe("OpenAPI generator", () => {
  it("generates a canonical 3.1 schema envelope with definitions and refs", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("profile", schemaReferenceNode("Profile")),
      ]),
      {
        definitions: [
          schemaDefinition(
            "Profile",
            schemaObjectNode([
              schemaFieldNode("displayName", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    expect(generateOpenApi(document)).toEqual({
      openapi: "3.1.0",
      info: { title: "User", version: "0.1.0" },
      components: {
        schemas: {
          Profile: {
            properties: {
              displayName: { type: "string" },
            },
            required: ["displayName"],
            type: "object",
          },
          User: {
            properties: {
              profile: { $ref: "#/components/schemas/Profile" },
            },
            required: ["profile"],
            type: "object",
          },
        },
      },
    });
  });

  it("renders constraints through the JSON Schema adapter", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
    );
    const constraints = constraintDocument("User", [
      constraintEntry(constraintTarget("node", ["root", "id"]), [
        constraint("min-length", { value: 2 }),
      ]),
    ]);

    expect(generateOpenApi(document, { constraints })).toMatchObject({
      components: {
        schemas: {
          User: {
            properties: {
              id: { minLength: 2, type: "string" },
            },
          },
        },
      },
    });
  });

  it("sorts reusable definitions and schema keys deterministically", () => {
    const document = schemaDocument(
      "Root",
      schemaObjectNode([
        schemaFieldNode("zeta", schemaScalarNode("string")),
        schemaFieldNode("alpha", schemaScalarNode("number")),
      ]),
      {
        definitions: [
          schemaDefinition("Zed", schemaScalarNode("string")),
          schemaDefinition("Alpha", schemaScalarNode("number")),
        ],
      },
    );

    const output = JSON.stringify(generateOpenApi(document));
    expect(output.indexOf('"Alpha"')).toBeLessThan(output.indexOf('"Zed"'));
    expect(output.indexOf('"alpha"')).toBeLessThan(output.indexOf('"zeta"'));
    expect(JSON.stringify(generateOpenApi(document))).toBe(output);
  });

  it("escapes JSON Pointer segments in local references", () => {
    const document = schemaDocument(
      "Root",
      schemaObjectNode([
        schemaFieldNode("value", schemaReferenceNode("Foo/Bar~Baz")),
      ]),
      {
        definitions: [
          schemaDefinition("Foo/Bar~Baz", schemaScalarNode("string")),
        ],
      },
    );

    expect(generateOpenApi(document)).toMatchObject({
      components: {
        schemas: {
          Root: {
            properties: {
              value: { $ref: "#/components/schemas/Foo~1Bar~0Baz" },
            },
          },
        },
      },
    });
  });

  it("fails when the root name conflicts with a reusable definition", () => {
    const document = schemaDocument("User", schemaScalarNode("string"), {
      definitions: [schemaDefinition("User", schemaScalarNode("number"))],
    });

    expect(tryGenerateOpenApi(document)).toMatchObject({
      ok: false,
      code: "openapi-definition-name-conflict",
    });
  });
});
