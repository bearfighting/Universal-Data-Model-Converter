import { describe, expect, it } from "vitest";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";

describe("Python dataclass parser", () => {
  it("parses primitives, arrays, nullable fields, and references", () => {
    const result = tryParsePython(
      `
from dataclasses import dataclass

@dataclass
class Address:
    city: str

@dataclass
class User:
    id: int
    score: float | None
    active: bool
    tags: list[str]
    address: Address
`,
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root.kind).toBe("object");
    if (result.document.root.kind !== "object") return;
    expect(
      result.document.root.fields.map((field) => [
        field.name.source,
        field.required,
        field.nullable,
      ]),
    ).toEqual([
      ["id", true, false],
      ["score", true, true],
      ["active", true, false],
      ["tags", true, false],
      ["address", true, false],
    ]);
    expect(result.document.root.fields[4]?.type).toEqual({
      kind: "reference",
      name: "Address",
    });
    expect(
      result.document.definitions.map((definition) => definition.name.source),
    ).toEqual(["Address"]);
  });

  it("normalizes Optional and pipe nullable syntax", () => {
    const optional = tryParsePython(
      "@dataclass\nclass User:\n    name: Optional[str]\n",
    );
    const pipe = tryParsePython(
      "@dataclass\nclass User:\n    name: str | None\n",
    );
    expect(optional.ok).toBe(true);
    expect(pipe.ok).toBe(true);
    if (!optional.ok || !pipe.ok) return;
    expect(optional.document).toEqual(pipe.document);
  });

  it("requires an entry for multiple dataclasses", () => {
    const result = tryParsePython(
      "@dataclass\nclass A:\n    value: str\n\n@dataclass\nclass B:\n    value: str\n",
    );
    expect(result).toMatchObject({ ok: false, code: "ambiguous-python-entry" });
  });

  it("rejects unsupported types and defaults", () => {
    expect(
      tryParsePython("@dataclass\nclass User:\n    value: int | str\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-union" });
    expect(
      tryParsePython("@dataclass\nclass User:\n    value: str = 'x'\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-default" });
  });

  it("rejects ignored top-level syntax and invalid indentation", () => {
    expect(
      tryParsePython("value = 1\n@dataclass\nclass User:\n    id: int\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-feature" });
    expect(tryParsePython("@dataclass\nclass User:\nid: int\n")).toMatchObject({
      ok: false,
      code: "invalid-python-syntax",
    });
  });

  it("uses the duplicate-definition failure code and rejects keywords", () => {
    expect(
      tryParsePython(
        "@dataclass\nclass User:\n    id: int\n\n@dataclass\nclass User:\n    name: str\n",
      ),
    ).toMatchObject({ ok: false, code: "duplicate-python-definition" });
    expect(
      tryParsePython("@dataclass\nclass User:\n    class: str\n"),
    ).toMatchObject({ ok: false, code: "invalid-python-syntax" });
  });

  it("rejects imports between a dataclass decorator and its class", () => {
    expect(
      tryParsePython("@dataclass\nimport os\nclass User:\n    id: int\n"),
    ).toMatchObject({ ok: false, code: "invalid-python-syntax" });
  });
});
