import { describe, expect, it } from "vitest";
import {
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";
import { generateYaml, tryGenerateYaml } from "./index.js";
import { parse } from "yaml";

describe("YAML generator", () => {
  it("serializes Value IR and preserves field order", () => {
    const document = valueDocument(
      "User",
      valueObjectNode([
        valueObjectField("zeta", valueScalarNode(1)),
        valueObjectField("enabled", valueScalarNode(true)),
        valueObjectField(
          "nested",
          valueObjectNode([valueObjectField("name", valueScalarNode("Ada"))]),
        ),
      ]),
    );

    const result = tryGenerateYaml(document);

    expect(result).toEqual({
      ok: true,
      output: "zeta: 1\nenabled: true\nnested:\n  name: Ada\n",
    });
    expect(parse(result.ok ? result.output : "")).toEqual({
      zeta: 1,
      enabled: true,
      nested: { name: "Ada" },
    });
    expect(
      parse(result.ok ? result.output : "", {
        schema: "core",
        version: "1.2",
        uniqueKeys: true,
        merge: false,
        resolveKnownTags: false,
      }),
    ).toEqual({
      zeta: 1,
      enabled: true,
      nested: { name: "Ada" },
    });
    expect(generateYaml(document)).toBe(result.ok ? result.output : "");
  });

  it("quotes strings that could change type when reparsed", () => {
    const result = tryGenerateYaml(
      valueDocument(
        "Values",
        valueObjectNode([
          valueObjectField("bool", valueScalarNode("true")),
          valueObjectField("number", valueScalarNode("1.0")),
          valueObjectField("date", valueScalarNode("2026-08-06")),
          valueObjectField("multiline", valueScalarNode("line 1\nline 2")),
        ]),
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = parse(result.output);
      expect(parsed).toEqual({
        bool: "true",
        number: "1.0",
        date: "2026-08-06",
        multiline: "line 1\nline 2",
      });
      expect(result.output).not.toContain("&");
      expect(result.output).not.toContain("*");
    }
  });

  it("serializes scalar and array roots", () => {
    expect(generateYaml(valueDocument("Value", valueScalarNode(null)))).toBe(
      "null\n",
    );
    expect(
      generateYaml(
        valueDocument(
          "Values",
          valueArrayNode([valueScalarNode(1), valueScalarNode("two")]),
        ),
      ),
    ).toBe("- 1\n- two\n");
  });

  it("rejects non-finite Value IR numbers", () => {
    const result = tryGenerateYaml(
      valueDocument("Invalid", valueScalarNode(Number.NaN)),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "yaml-non-json-value",
      diagnostics: [expect.objectContaining({ source: "generator-yaml" })],
    });
  });

  it("rejects duplicate Value IR field names instead of overwriting them", () => {
    const result = tryGenerateYaml(
      valueDocument(
        "Duplicate",
        valueObjectNode([
          valueObjectField("name", valueScalarNode("first")),
          valueObjectField("name", valueScalarNode("second")),
        ]),
      ),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "duplicate-value-field-name",
      diagnostics: [
        expect.objectContaining({
          source: "generator-yaml",
          code: "duplicate-value-field-name",
        }),
      ],
    });
  });
});
