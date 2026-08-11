import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaScalarNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateOpenApi } from "../../packages/generators/openapi/src/index.js";
import { tryGenerateTypeScript } from "../../packages/generators/typescript/src/index.js";
import { tryGenerateZod } from "../../packages/generators/zod/src/index.js";

describe("representation hint generator compatibility", () => {
  const plain = schemaDocument("Count", schemaScalarNode("integer"));
  const hinted = schemaDocument(
    "Count",
    schemaScalarNode("integer", {
      representation: {
        family: "integer",
        signedness: "unsigned",
        widthBits: 32,
      },
    }),
  );

  it("does not change TypeScript output", () => {
    const plainResult = tryGenerateTypeScript(plain);
    const hintedResult = tryGenerateTypeScript(hinted);

    expect(hintedResult).toEqual(plainResult);
  });

  it("does not change Zod output", () => {
    const plainResult = tryGenerateZod(plain);
    const hintedResult = tryGenerateZod(hinted);

    expect(hintedResult).toEqual(plainResult);
  });

  it("does not change OpenAPI output", () => {
    const plainResult = tryGenerateOpenApi(plain);
    const hintedResult = tryGenerateOpenApi(hinted);

    expect(hintedResult).toEqual(plainResult);
  });
});
