import { describe, expect, it } from "vitest";
import {
  tryParseCsvDocument,
  tryParseCsvValueDocument,
  csvParserDescriptor,
} from "./index.js";

describe("CSV parser", () => {
  it("parses header rows into Value IR and a strict Shape IR", () => {
    const result = tryParseCsvDocument("id,name\n00123,Ada\n2,Bob\n");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.root).toEqual({
        kind: "array",
        items: [
          {
            kind: "object",
            fields: [
              { name: "id", value: { kind: "string", value: "00123" } },
              { name: "name", value: { kind: "string", value: "Ada" } },
            ],
          },
          {
            kind: "object",
            fields: [
              { name: "id", value: { kind: "string", value: "2" } },
              { name: "name", value: { kind: "string", value: "Bob" } },
            ],
          },
        ],
      });
      expect(result.document.root).toMatchObject({ kind: "array" });
      if (result.document.root.kind === "array") {
        expect(result.document.root.elementType).toMatchObject({
          kind: "object",
        });
      }
    }
  });

  it("handles quoted commas, quotes, newlines, BOM, CRLF, and empty cells", () => {
    const result = tryParseCsvValueDocument(
      '\uFEFFname,note\r\nAda,"hello, world"\r\nBob,"line 1\nline 2"\r\nEve,""\r\n',
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.document.root.kind === "array") {
      expect(result.document.root.items[0]).toMatchObject({
        fields: [
          { name: "name", value: { value: "Ada" } },
          { name: "note", value: { value: "hello, world" } },
        ],
      });
      expect(result.document.root.items[1]).toMatchObject({
        fields: [
          { name: "name", value: { value: "Bob" } },
          { name: "note", value: { value: "line 1\nline 2" } },
        ],
      });
      expect(result.document.root.items[2]).toMatchObject({
        fields: [
          { name: "name", value: { value: "Eve" } },
          { name: "note", value: { kind: "string", value: "" } },
        ],
      });
    }
  });

  it("accepts a header-only CSV and keeps the header in Shape IR", () => {
    const result = tryParseCsvDocument("id,name\n");

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.root).toEqual({ kind: "array", items: [] });
      expect(result.document.root).toMatchObject({ kind: "array" });
    }
  });

  it("uses Value-only parsing when the descriptor is asked for Value IR", () => {
    const result = csvParserDescriptor.parse("id\n1\n", {
      name: "Rows",
      requestedIr: ["value"],
    });

    expect(result).toMatchObject({
      ok: true,
      value: { kind: "value-document" },
    });
    if (result.ok) expect(result.document).toBeUndefined();
  });

  it.each([
    ["empty input", "", "csv-empty-document"],
    ["empty header", ",name\n1,Ada\n", "csv-empty-header"],
    ["duplicate header", "id,id\n1,2\n", "csv-duplicate-header"],
    ["short row", "id,name\n1\n", "csv-row-width-mismatch"],
    ["long row", "id\n1,2\n", "csv-row-width-mismatch"],
    ["invalid quoting", 'id,name\n1,"Ada\n', "invalid-csv"],
  ])("rejects %s explicitly", (_label, input, code) => {
    const result = tryParseCsvDocument(input);

    expect(result).toMatchObject({
      ok: false,
      code,
      diagnostics: [expect.objectContaining({ code, source: "parser-csv" })],
    });
  });

  it("includes parser position evidence for malformed CSV records", () => {
    const result = tryParseCsvDocument("id,name\n1\n");

    expect(result).toMatchObject({
      ok: false,
      code: "csv-row-width-mismatch",
      diagnostics: [
        expect.objectContaining({
          evidence: expect.objectContaining({ lines: expect.any(Number) }),
        }),
      ],
    });
  });
});
