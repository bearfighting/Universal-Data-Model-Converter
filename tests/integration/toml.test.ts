import { describe, expect, it } from "vitest";
import { convert } from "../../packages/sdk/src/index.js";
import { tryParseJsonValueDocument } from "../../packages/parsers/json/src/index.js";
import { tryParseTomlValueDocument } from "../../packages/parsers/toml/src/index.js";
import { tryParseYamlValueDocument } from "../../packages/parsers/yaml/src/index.js";

describe("TOML conversion routes", () => {
  const toml = `title = "Config"
enabled = true

[owner]
name = "Ada"
`;

  it("converts TOML to value and shape targets", () => {
    expect(
      convert({ sourceFormat: "toml", targetFormat: "json", input: toml }),
    ).toMatchObject({ ok: true });
    expect(
      convert({ sourceFormat: "toml", targetFormat: "yaml", input: toml }),
    ).toMatchObject({ ok: true });
    expect(
      convert({
        sourceFormat: "toml",
        targetFormat: "typescript",
        input: toml,
      }),
    ).toMatchObject({ ok: true });
    expect(
      convert({
        sourceFormat: "toml",
        targetFormat: "json-schema",
        input: toml,
      }),
    ).toMatchObject({ ok: true });
    expect(
      convert({ sourceFormat: "toml", targetFormat: "zod", input: toml }),
    ).toMatchObject({ ok: true });
    expect(
      convert({ sourceFormat: "toml", targetFormat: "openapi", input: toml }),
    ).toMatchObject({ ok: true });
  });

  it("supports TOML round-trip and value sources", () => {
    const tomlResult = convert({
      sourceFormat: "toml",
      targetFormat: "toml",
      input: toml,
    });
    expect(tomlResult).toMatchObject({ ok: true });

    expect(
      convert({
        sourceFormat: "json",
        targetFormat: "toml",
        input: '{"id":1}',
      }),
    ).toMatchObject({ ok: true });
    expect(
      convert({ sourceFormat: "yaml", targetFormat: "toml", input: "id: 1\n" }),
    ).toMatchObject({ ok: true });
    expect(() =>
      convert({ sourceFormat: "csv", targetFormat: "toml", input: "id\n1\n" }),
    ).toThrow(/Unsupported conversion route/);
  });

  it("returns structured parser and generator failures", () => {
    expect(
      convert({
        sourceFormat: "toml",
        targetFormat: "json",
        input: "created = 1979-05-27\n",
      }),
    ).toMatchObject({
      ok: false,
      phase: "parse",
      code: "toml-unsupported-value",
    });

    expect(
      convert({ sourceFormat: "json", targetFormat: "toml", input: "1" }),
    ).toMatchObject({
      ok: false,
      phase: "generate",
      code: "toml-invalid-root",
    });

    expect(() =>
      convert({
        sourceFormat: "json-schema",
        targetFormat: "toml",
        input: '{"type":"object","properties":{"id":{"type":"string"}}}',
      }),
    ).toThrow(/Unsupported conversion route/);
  });

  it("returns Value and Shape artifacts for Shape routes", () => {
    const result = convert({
      sourceFormat: "toml",
      targetFormat: "json-schema",
      input: toml,
      includeArtifacts: true,
    });

    expect(result).toMatchObject({
      ok: true,
      artifacts: {
        value: { kind: "value-document" },
        shape: { kind: "document" },
      },
    });
  });

  it("preserves prototype-sensitive fields across JSON, YAML, and TOML", () => {
    const input =
      '{"__proto__":"proto","constructor":"ctor","toString":"string"}';
    const json = convert<string>({
      sourceFormat: "json",
      targetFormat: "json",
      input,
    });
    const yaml = convert<string>({
      sourceFormat: "json",
      targetFormat: "yaml",
      input,
    });
    const toml = convert<string>({
      sourceFormat: "json",
      targetFormat: "toml",
      input,
    });

    expect(json).toMatchObject({ ok: true });
    expect(yaml).toMatchObject({ ok: true });
    expect(toml).toMatchObject({ ok: true });

    if (json.ok && yaml.ok && toml.ok) {
      const expected = ["__proto__", "constructor", "toString"];
      const reparsed = [
        tryParseJsonValueDocument(json.output),
        tryParseYamlValueDocument(yaml.output),
        tryParseTomlValueDocument(toml.output),
      ];
      expect(reparsed.every((result) => result.ok)).toBe(true);
      expect(Object.keys(JSON.parse(json.output))).toEqual(expected);
      for (const result of reparsed) {
        if (result.ok && result.document.root.kind === "object") {
          expect(
            result.document.root.fields.map((field) => field.name),
          ).toEqual(expected);
        }
      }
    }
  });
});
