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
    expect(tryParseRust("enum A { One }")).toMatchObject({ ok: true });
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

  it("maps unit enums and string-keyed maps to existing Shape IR nodes", () => {
    const result = tryParseRust(
      `
      use std::collections::HashMap;
      enum Status { Pending, Active, Disabled }
      struct User {
        status: Status,
        labels: HashMap<String, Vec<Status>>,
        manager: Option<Box<User>>,
      }
      `,
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.document.root.kind !== "object") return;
    expect(result.document.root.fields[0]?.type).toMatchObject({
      kind: "reference",
      name: "Status",
    });
    expect(result.document.root.fields[1]?.type).toMatchObject({
      kind: "record",
      key: { kind: "scalar", scalar: "string" },
      value: {
        kind: "array",
        elementType: { kind: "reference", name: "Status" },
      },
    });
    expect(result.document.root.fields[2]).toMatchObject({
      type: { kind: "reference", name: "User" },
      required: false,
      nullable: true,
    });
    expect(result.document.definitions[0]?.type).toMatchObject({
      kind: "union",
      members: [
        { kind: "literal", value: "Pending" },
        { kind: "literal", value: "Active" },
        { kind: "literal", value: "Disabled" },
      ],
    });
  });

  it("supports canonical BTreeMap paths and rejects non-string keys", () => {
    expect(
      tryParseRust(
        "struct Config { values: alloc::collections::BTreeMap<String, u64> }",
      ),
    ).toMatchObject({ ok: true });
    expect(
      tryParseRust("struct Config { values: HashMap<u64, String> }"),
    ).toMatchObject({ ok: false, code: "unsupported-rust-map-key" });
  });

  it("rejects unsupported enum variants and aliases", () => {
    expect(tryParseRust("enum Empty {}")).toMatchObject({
      ok: false,
      code: "invalid-rust-data-model",
    });
    expect(tryParseRust("enum Status { Active, Active }")).toMatchObject({
      ok: false,
      code: "invalid-rust-data-model",
    });
    expect(tryParseRust("enum Event { Created { id: u64 } }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(tryParseRust("enum Event { Created(u64) }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(tryParseRust("enum Status { Pending = 1 }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(tryParseRust("enum Status { Pending = -1 }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(tryParseRust("enum Status { Pending = 1 + 1 }")).toMatchObject({
      ok: false,
      code: "unsupported-rust-feature",
    });
    expect(
      tryParseRust("use serde::Serialize; struct Config {}"),
    ).toMatchObject({ ok: false, code: "unsupported-rust-feature" });
    expect(
      tryParseRust(
        "use std::collections::HashMap as Map; struct Config { values: Map<String, String> }",
      ),
    ).toMatchObject({ ok: false, code: "unsupported-rust-feature" });
    expect(
      tryParseRust("struct Config { values: HashMap<String, String,> }"),
    ).toMatchObject({ ok: true });
  });
});
