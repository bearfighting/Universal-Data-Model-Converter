import { describe, expect, it } from "vitest";
import { sharedSemanticFixtures } from "../fixtures/semantics/index.js";
import {
  convert,
  publicConvertResultSchema,
} from "../../packages/sdk/src/index.js";

describe("sdk zod routes from shared semantic fixtures", () => {
  const fixture = sharedSemanticFixtures.find(
    (candidate) => candidate.id === "primitive.string",
  );

  if (!fixture) {
    throw new Error("Expected primitive.string semantic fixture.");
  }

  it.each([
    ["json", fixture.sources.json?.input],
    [
      "json-schema",
      fixture.sources["json-schema"]
        ? JSON.stringify(fixture.sources["json-schema"].input)
        : undefined,
    ],
    ["typescript", fixture.sources.typescript?.input],
  ] as const)("converts %s fixture input to Zod", (sourceFormat, input) => {
    expect(input).toBeDefined();
    if (input === undefined) return;

    const result = convert({
      sourceFormat,
      targetFormat: "zod",
      input,
      name: fixture.canonicalShape.name.source,
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("export const");
  });

  it("preserves shared constraint flow on a JSON Schema to Zod route", () => {
    const constrainedFixture = sharedSemanticFixtures.find(
      (candidate) => candidate.id === "constraint.string-min-length",
    );
    expect(constrainedFixture).toBeDefined();
    if (!constrainedFixture) return;

    const source = constrainedFixture.sources["json-schema"];
    expect(source).toBeDefined();
    if (!source) return;

    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "zod",
      input: JSON.stringify(source.input),
      name: constrainedFixture.canonicalShape.name.source,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain(".min(2)");
    expect(result.preservedCapabilities).toContain("string-constraints");
  });
});
