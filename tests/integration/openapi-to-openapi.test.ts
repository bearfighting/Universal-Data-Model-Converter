import { describe, expect, it } from "vitest";
import { openApiParser } from "../../packages/parsers/openapi/src/index.js";
import { openApiGenerator } from "../../packages/generators/openapi/src/index.js";
import { expectOk } from "../helpers/result-assertions.js";

const source = JSON.stringify({
  openapi: "3.1.0",
  info: { title: "Original", version: "1.0.0" },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          profile: { $ref: "#/components/schemas/Profile" },
          status: {
            type: "string",
            enum: ["active", "closed"],
            nullable: true,
          },
          tags: {
            type: "array",
            prefixItems: [{ type: "string" }, { type: "integer" }],
            items: false,
            minItems: 1,
          },
        },
        required: ["id", "profile"],
      },
      Profile: {
        type: "object",
        properties: {
          displayName: { type: "string" },
        },
        required: ["displayName"],
      },
    },
  },
});

describe("integration: openapi -> ir -> openapi", () => {
  it("preserves IR and constraints through canonical generation", () => {
    const firstParsed = openApiParser.parse(source, {
      name: "User",
      options: { entry: "User" },
    });
    expectOk(firstParsed, "Expected the first OpenAPI parse to succeed.");

    const firstGenerated = openApiGenerator.generate(
      firstParsed.document,
      firstParsed.constraints ? { constraints: firstParsed.constraints } : {},
    );
    expectOk(
      firstGenerated,
      "Expected the first OpenAPI generation to succeed.",
    );

    expect(firstGenerated.output).toMatchObject({
      openapi: "3.1.0",
      info: { title: "User", version: "0.1.0" },
      components: { schemas: expect.any(Object) },
    });

    const secondParsed = openApiParser.parse(
      JSON.stringify(firstGenerated.output),
      {
        name: "User",
        options: { entry: "User" },
      },
    );
    expectOk(secondParsed, "Expected the generated OpenAPI to reparse.");

    expect(secondParsed.document).toEqual(firstParsed.document);
    expect(secondParsed.constraints).toEqual(firstParsed.constraints);

    const secondGenerated = openApiGenerator.generate(
      secondParsed.document,
      secondParsed.constraints ? { constraints: secondParsed.constraints } : {},
    );
    expectOk(
      secondGenerated,
      "Expected the second OpenAPI generation to succeed.",
    );
    expect(secondGenerated.output).toEqual(firstGenerated.output);
  });
});
