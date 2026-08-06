import { describe, expect, it } from "vitest";
import {
  tryParseYamlDocument,
  tryParseYamlValueDocument,
  yamlParserDescriptor,
} from "./index.js";

describe("YAML parser", () => {
  it("parses a strict JSON-compatible YAML document into Value and Shape IR", () => {
    const result = tryParseYamlDocument(
      `name: Ada\nactive: true\nroles:\n  - admin\n  - user\nprofile:\n  age: 42\n`,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.root).toMatchObject({ kind: "object" });
      expect(result.document.root).toMatchObject({ kind: "object" });
      expect(result.value.name).toBe("YamlDocument");
    }
  });

  it("produces the same IR as equivalent JSON", () => {
    const yaml = tryParseYamlDocument("id: 1\nname: Ada\nitems: [a, b]\n");
    const json = tryParseYamlDocument(
      JSON.stringify({ id: 1, name: "Ada", items: ["a", "b"] }),
    );

    expect(yaml.ok).toBe(true);
    expect(json.ok).toBe(true);
    if (yaml.ok && json.ok) {
      expect(yaml.value.root).toEqual(json.value.root);
      expect(yaml.document.root).toEqual(json.document.root);
    }
  });

  it("can parse Value IR without requiring Shape IR inference", () => {
    const result = tryParseYamlValueDocument('items: [1, "a"]\n');

    expect(result).toMatchObject({
      ok: true,
      document: { kind: "value-document" },
    });
    if (result.ok) {
      expect(result.document.root).toMatchObject({ kind: "object" });
    }
  });

  it("honors a value-only descriptor request", () => {
    const result = yamlParserDescriptor.parse('items: [1, "a"]\n', {
      name: "Mixed",
      requestedIr: ["value"],
    });

    expect(result).toMatchObject({
      ok: true,
      value: { kind: "value-document", name: "Mixed" },
    });
    if (result.ok) expect(result.document).toBeUndefined();
  });

  it("exposes a descriptor with both IR capabilities", () => {
    expect(yamlParserDescriptor).toMatchObject({
      format: "yaml",
      capabilities: {
        producesIr: ["value", "shape"],
      },
    });
  });

  it.each([
    ["invalid syntax", "name: [", "invalid-yaml"],
    ["empty input", "", "yaml-empty-document"],
    ["multiple documents", "---\na: 1\n---\nb: 2\n", "yaml-multiple-documents"],
    ["duplicate keys", "a: 1\na: 2\n", "yaml-duplicate-key"],
    ["non-string keys", "1: one\n", "yaml-non-string-key"],
    ["custom tags", "value: !custom x\n", "yaml-unsupported-tag"],
    ["merge keys", "base: {a: 1}\n<<: {a: 2}\n", "yaml-unsupported-merge"],
    ["anchors", "base: &base {a: 1}\n", "yaml-unsupported-anchor"],
    ["aliases", "base: &base {a: 1}\ncopy: *base\n", "yaml-unsupported-anchor"],
    ["non-finite numbers", "value: .nan\n", "yaml-non-json-value"],
  ])("rejects %s explicitly", (_label, input, code) => {
    const result = tryParseYamlDocument(input);

    expect(result).toMatchObject({
      ok: false,
      code,
      diagnostics: [expect.objectContaining({ code, source: "parser-yaml" })],
    });
  });
});
