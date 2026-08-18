import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";

const fixtureRoot = `${process.cwd()}/tests/fixtures/python/`;

describe("Python fixture matrix", () => {
  it("matches the independent expected Shape IR fixture", () => {
    const source = readFileSync(`${fixtureRoot}valid/primitive.py`, "utf8");
    const expected = JSON.parse(
      readFileSync(`${fixtureRoot}valid/primitive.expected.json`, "utf8"),
    );
    const result = tryParsePython(source);
    expect(result).toEqual({ ok: true, document: expected });
  });

  it.each([
    ["unsupported/union", "unsupported-python-union"],
    ["invalid/malformed", "invalid-python-syntax"],
  ])("returns the stable failure for %s", (name, code) => {
    const source = readFileSync(`${fixtureRoot}${name}.py`, "utf8");
    const result = tryParsePython(source);
    expect(result).toMatchObject({ ok: false, code });
  });
});
