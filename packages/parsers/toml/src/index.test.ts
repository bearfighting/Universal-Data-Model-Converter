import { describe, expect, it } from "vitest";
import {
  tryParseTomlDocument,
  tryParseTomlValueDocument,
  tomlParserDescriptor,
} from "./index.js";

describe("TOML parser", () => {
  it("parses scalar fields, nested tables, dotted keys, arrays, and tables", () => {
    const result = tryParseTomlDocument(`title = "Config"
enabled = true
ports = [8000, 8001]

[owner]
name = "Ada"
team = "Core"

[[products]]
name = "A"

[[products]]
name = "B"
`);

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.root).toMatchObject({ kind: "object" });
      expect(result.document.root).toMatchObject({ kind: "object" });
    }
  });

  it("accepts empty TOML as an empty object", () => {
    const result = tryParseTomlDocument("");

    expect(result).toMatchObject({
      ok: true,
      value: { root: { kind: "object", fields: [] } },
      document: { root: { kind: "object", fields: [] } },
    });
  });

  it("supports Value-only parsing without Shape IR", () => {
    const result = tomlParserDescriptor.parse("id = 1\n", {
      name: "Config",
      requestedIr: "value",
    });

    expect(result).toMatchObject({
      ok: true,
      document: { kind: "value-document" },
    });
    if (result.ok) expect(result.document.kind).toBe("value-document");
  });

  it.each([
    ["invalid syntax", "id =", "invalid-toml"],
    ["date", "created = 1979-05-27", "toml-unsupported-value"],
    ["time", "created = 07:32:00", "toml-unsupported-value"],
    ["datetime", "created = 1979-05-27T07:32:00Z", "toml-unsupported-value"],
    ["NaN", "value = NaN", "invalid-toml"],
    ["infinity", "value = inf", "toml-unsupported-value"],
  ])("rejects %s", (_label, input, code) => {
    const result = tryParseTomlDocument(input);

    expect(result).toMatchObject({
      ok: false,
      code,
      diagnostics: [expect.objectContaining({ code, source: "parser-toml" })],
    });
  });

  it("rejects duplicate keys and unsafe integers with structured diagnostics", () => {
    expect(tryParseTomlDocument("id = 1\nid = 2\n")).toMatchObject({
      ok: false,
      code: "invalid-toml",
    });
    expect(
      tryParseTomlValueDocument("id = 999999999999999999999\n"),
    ).toMatchObject({
      ok: false,
      code: "toml-unsafe-integer",
    });
  });
});
