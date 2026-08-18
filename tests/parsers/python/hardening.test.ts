import { describe, expect, it } from "vitest";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";

function failure(input: string, code: string) {
  const result = tryParsePython(input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected Python parsing to fail.");
  expect(result.code).toBe(code);
  expect(result.diagnostics?.[0]?.evidence).toEqual(
    expect.objectContaining({
      position: expect.objectContaining({ line: expect.any(Number) }),
    }),
  );
}

describe("Python dataclass parser hardening", () => {
  it("resolves self and mutually recursive references independent of order", () => {
    const result = tryParsePython(
      `@dataclass
class Parent:
    child: Child | None

@dataclass
class Child:
    parent: Parent | None
`,
      { entry: "Parent" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toEqual({ kind: "reference", name: "Parent" });
    expect(
      result.document.definitions.find((item) => item.name.source === "Parent")
        ?.type,
    ).toMatchObject({
      kind: "object",
      fields: [
        {
          name: { source: "child" },
          nullable: true,
          type: { kind: "reference", name: "Child" },
        },
      ],
    });
    expect(
      result.document.definitions.find((item) => item.name.source === "Child")
        ?.type,
    ).toMatchObject({
      kind: "object",
      fields: [{ type: { kind: "reference", name: "Parent" } }],
    });
  });

  it("reports unknown references as a distinct semantic failure", () => {
    failure(
      "@dataclass\nclass User:\n    address: MissingAddress\n",
      "unknown-python-reference",
    );
  });

  it("classifies known unsupported Python names separately from references", () => {
    for (const type of ["Any", "Enum", "object", "TypedDict"]) {
      failure(
        `@dataclass\nclass User:\n    value: ${type}\n`,
        "unsupported-python-type",
      );
    }
  });

  it("classifies unsupported unions, defaults, inheritance, and decorators", () => {
    failure(
      "@dataclass\nclass User:\n    value: int | str\n",
      "unsupported-python-union",
    );
    failure(
      "@dataclass\nclass User:\n    value: str = 'x'\n",
      "unsupported-python-default",
    );
    failure(
      "@dataclass\nclass User(Base):\n    value: str\n",
      "unsupported-python-inheritance",
    );
    failure(
      "@frozen\nclass User:\n    value: str\n",
      "unsupported-python-decorator",
    );
  });

  it("rejects quoted forward references without evaluating them", () => {
    failure(
      "@dataclass\nclass User:\n    address: 'Address'\n",
      "unsupported-python-type",
    );
  });

  it("reports malformed annotations at the field location", () => {
    const result = tryParsePython(
      "@dataclass\nclass User:\n    value: list[\n",
    );
    expect(result).toMatchObject({
      ok: false,
      code: "invalid-python-syntax",
      diagnostics: [
        {
          evidence: {
            position: { line: 3 },
          },
        },
      ],
    });
  });
});
