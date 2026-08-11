import { describe, expect, it } from "vitest";
import { tryParseRust } from "@schema-transformation-toolkit/parser-rust";

describe("Rust parser", () => {
  it("maps the V1 struct subset to Shape and Constraint IR", () => {
    const result = tryParseRust(
      `
      // ignored
      pub struct User {
        id: u64,
        email: Option<String>,
        tags: Vec<Option<String>>,
        profile: Profile,
        ratio: f32,
      }
      struct Profile { active: bool }
    `,
      { name: "UserDocument", entry: "User" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root.kind).toBe("object");
    if (result.document.root.kind !== "object") return;
    expect(
      result.document.root.fields.map((field) => field.name.source),
    ).toEqual(["id", "email", "tags", "profile", "ratio"]);
    expect(result.document.root.fields[1]).toMatchObject({
      required: false,
      nullable: true,
    });
    expect(result.document.root.fields[2]?.type).toMatchObject({
      kind: "array",
    });
    expect(result.document.root.fields[4]?.type).toMatchObject({
      kind: "scalar",
      scalar: "number",
      representation: { family: "float", widthBits: 32 },
    });
    expect(result.artifacts.constraints.entries).toHaveLength(1);
    expect(
      result.artifacts.constraints.entries[0]?.constraints[1]?.value,
    ).toEqual({
      representation: "decimal",
      value: "18446744073709551615",
    });
  });

  it("reports structured entry and syntax failures", () => {
    expect(tryParseRust("struct A {} struct B {}")).toMatchObject({
      ok: false,
      code: "ambiguous-rust-entry",
    });
    expect(tryParseRust("struct A { value: Missing }")).toMatchObject({
      ok: false,
      code: "invalid-rust-data-model",
    });
    expect(tryParseRust("#[derive(Debug)] struct A {}")).toMatchObject({
      ok: false,
      code: "unsupported-rust-attribute",
    });
    expect(tryParseRust("enum A { One }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(tryParseRust("pub struct A<T> {}")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
  });

  it("supports raw identifiers without changing their IR names", () => {
    const result = tryParseRust(
      "struct User { r#type: String, r#match: u8, r#pub: bool }",
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.document.root.kind !== "object") return;
    expect(
      result.document.root.fields.map((field) => field.name.source),
    ).toEqual(["type", "match", "pub"]);
  });

  it("places nested numeric constraints on array items", () => {
    const result = tryParseRust("struct User { ids: Vec<u32> }");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.artifacts.constraints.entries[0]?.target.path).toEqual([
      "root",
      "ids",
      "items",
    ]);
  });

  it("includes source location for semantic failures", () => {
    const result = tryParseRust("struct User { value: Missing }");
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ evidence: { position: { line: 1, column: 22 } } }],
    });
  });
});
