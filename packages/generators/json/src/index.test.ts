import { describe, expect, it } from "vitest";
import {
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
  valueArrayNode,
} from "@schema-transformation-toolkit/core";
import { generateJson, tryGenerateJson } from "./index.js";

describe("JSON generator", () => {
  it.each([
    [valueScalarNode("hello"), '"hello"'],
    [valueScalarNode(42), "42"],
    [valueScalarNode(null), "null"],
    [valueArrayNode([valueScalarNode(1), valueScalarNode("two")]), '[1,"two"]'],
  ])("serializes Value IR as normalized JSON", (root, expected) => {
    expect(generateJson(valueDocument("Value", root))).toBe(expected);
  });

  it("preserves nested object field order and does not mutate Value IR", () => {
    const document = valueDocument(
      "User",
      valueObjectNode([
        valueObjectField("zeta", valueScalarNode(1)),
        valueObjectField(
          "nested",
          valueObjectNode([valueObjectField("alpha", valueScalarNode(true))]),
        ),
      ]),
    );

    const before = JSON.stringify(document);
    const result = tryGenerateJson(document);

    expect(result).toEqual({
      ok: true,
      output: '{"zeta":1,"nested":{"alpha":true}}',
    });
    expect(JSON.parse(result.ok ? result.output : "null")).toEqual({
      zeta: 1,
      nested: { alpha: true },
    });
    expect(JSON.stringify(document)).toBe(before);
    expect(generateJson(document)).toBe(result.ok ? result.output : "");
  });
});
