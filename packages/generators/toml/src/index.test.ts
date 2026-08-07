import { describe, expect, it } from "vitest";
import {
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateToml, tomlGeneratorDescriptor } from "./index.js";

describe("TOML generator", () => {
  it("generates scalar fields, nested tables, arrays, and array-of-tables", () => {
    const result = tryGenerateToml(
      valueDocument(
        "Config",
        valueObjectNode([
          valueObjectField("title", valueScalarNode("Config")),
          valueObjectField("enabled", valueScalarNode(true)),
          valueObjectField(
            "ports",
            valueArrayNode([valueScalarNode(8000), valueScalarNode(8001)]),
          ),
          valueObjectField(
            "owner",
            valueObjectNode([valueObjectField("name", valueScalarNode("Ada"))]),
          ),
          valueObjectField(
            "products",
            valueArrayNode([
              valueObjectNode([valueObjectField("name", valueScalarNode("A"))]),
            ]),
          ),
        ]),
      ),
    );

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.output).toContain('title = "Config"');
      expect(result.output).toContain("[owner]");
      expect(result.output).toContain("[[products]]");
    }
  });

  it("generates an empty object as an empty TOML document", () => {
    expect(
      tryGenerateToml(valueDocument("Config", valueObjectNode([]))),
    ).toEqual({ ok: true, output: "\n" });
  });

  it.each([
    ["scalar root", valueScalarNode("value"), "toml-invalid-root"],
    ["array root", valueArrayNode([]), "toml-invalid-root"],
    [
      "null field",
      valueObjectNode([valueObjectField("value", valueScalarNode(null))]),
      "toml-unsupported-value",
    ],
    [
      "non-finite number",
      valueObjectNode([valueObjectField("value", valueScalarNode(Number.NaN))]),
      "toml-non-json-value",
    ],
  ])("rejects %s", (_label, root, code) => {
    expect(tryGenerateToml(valueDocument("Invalid", root))).toMatchObject({
      ok: false,
      code,
    });
  });

  it("preserves prototype-sensitive field names", () => {
    const result = tryGenerateToml(
      valueDocument(
        "SpecialKeys",
        valueObjectNode([
          valueObjectField("__proto__", valueScalarNode("proto")),
          valueObjectField("constructor", valueScalarNode("ctor")),
          valueObjectField("toString", valueScalarNode("string")),
        ]),
      ),
    );

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.output).toContain('__proto__ = "proto"');
      expect(result.output).toContain('constructor = "ctor"');
      expect(result.output).toContain('toString = "string"');
    }
  });

  it("returns a structured failure for malformed descriptor input", () => {
    expect(
      tomlGeneratorDescriptor.generate(null as never, {
        options: {},
      }),
    ).toMatchObject({ ok: false, code: "invalid-generator-input" });
  });
});
