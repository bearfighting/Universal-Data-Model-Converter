import { describe, expect, it } from "vitest";
import {
  tryValidateValueDocument,
  valueNodeToJsonCompatible,
} from "./internal.js";

describe("Value IR runtime validation", () => {
  it("rejects malformed documents without throwing", () => {
    expect(
      tryValidateValueDocument({
        kind: "value-document",
        name: undefined,
        root: { kind: "mystery" },
      } as never),
    ).toMatchObject({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "invalid-value-document" }),
        expect.objectContaining({ code: "invalid-value-kind" }),
      ],
    });
  });

  it("rejects invalid scalar, array, and object payloads", () => {
    expect(
      tryValidateValueDocument({
        kind: "value-document",
        name: "Invalid",
        root: {
          kind: "object",
          fields: [
            { name: "broken", value: { kind: "number", value: "1" } },
            { name: "items", value: { kind: "array", items: "nope" } },
            { name: "fields", value: { kind: "object", fields: [] } },
          ],
        },
      } as never),
    ).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "invalid-value-scalar" }),
        expect.objectContaining({ code: "invalid-value-array" }),
      ]),
    });
  });

  it("keeps conversion exhaustive for the valid Value IR union", () => {
    expect(valueNodeToJsonCompatible({ kind: "object", fields: [] })).toEqual(
      {},
    );
  });

  it("preserves prototype-sensitive object field names", () => {
    const value = valueNodeToJsonCompatible({
      kind: "object",
      fields: [
        { name: "__proto__", value: { kind: "string", value: "proto" } },
        { name: "constructor", value: { kind: "string", value: "ctor" } },
        { name: "toString", value: { kind: "string", value: "string" } },
      ],
    });

    expect(Object.keys(value as object)).toEqual([
      "__proto__",
      "constructor",
      "toString",
    ]);
    expect((value as Record<string, unknown>)["__proto__"]).toBe("proto");
  });
});
