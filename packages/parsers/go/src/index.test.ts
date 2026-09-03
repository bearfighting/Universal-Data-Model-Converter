import { describe, expect, it } from "vitest";
import { tryParseGo } from "./api.js";

describe("Go parser", () => {
  it("maps structs, tags, containers, references, and recursion", () => {
    const result = tryParseGo(
      [
        "package models",
        "type UserID int64",
        "type User struct {",
        '  ID UserID `json:"id"`',
        '  Email *string `json:"email,omitempty"`',
        "  Tags []string",
        "  Metadata map[string]string",
        "  Next *User",
        "}",
      ].join("\n"),
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.artifacts).toBeUndefined();
    expect(result.document.rootName?.source).toBe("User");
    const root = result.document.definitions.find(
      (definition) => definition.name.source === "User",
    )?.type;
    expect(root?.kind).toBe("object");
    if (!root || root.kind !== "object") return;
    expect(
      root.fields.map((field) => [
        field.name.source,
        field.required,
        field.nullable,
      ]),
    ).toEqual([
      ["id", true, false],
      ["email", false, true],
      ["Tags", true, false],
      ["Metadata", true, false],
      ["Next", true, true],
    ]);
  });

  it("reports unsupported map keys and ambiguous roots", () => {
    expect(
      tryParseGo("type User struct { Values map[int]string }"),
    ).toMatchObject({ ok: false, code: "unsupported-go-map-key" });
    expect(tryParseGo("type A struct{}\ntype B struct{}")).toMatchObject({
      ok: false,
      code: "ambiguous-go-entry",
    });
  });

  it("distinguishes empty interfaces from method interfaces", () => {
    expect(
      tryParseGo("type Value interface{}", { entry: "Value" }),
    ).toMatchObject({ ok: true });
    expect(
      tryParseGo("type Value interface { String() string }", {
        entry: "Value",
      }),
    ).toMatchObject({ ok: false, code: "unsupported-go-feature" });
  });

  it("maps nested pointers without flattening them", () => {
    const result = tryParseGo(
      "type User struct { Friends []*User; Items map[string]*User }",
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const definition = result.document.definitions.find(
      (item) => item.name.source === "User",
    );
    expect(definition?.type.kind).toBe("object");
    if (!definition || definition.type.kind !== "object") return;
    expect(definition.type.fields.map((field) => field.type)).toMatchObject([
      { kind: "array", elementType: { kind: "union" } },
      { kind: "record", value: { kind: "union" } },
    ]);
  });

  it("preserves shorthand omitempty and rejects aliases explicitly", () => {
    const result = tryParseGo(
      'type User struct { Name string `json:",omitempty"` }',
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const root = result.document.root;
      expect(root).toMatchObject({
        kind: "object",
        fields: [{ name: { source: "Name" }, required: false }],
      });
    }
    expect(tryParseGo("type ID = int64", { entry: "ID" })).toMatchObject({
      ok: false,
      code: "unsupported-go-feature",
    });
  });
});
