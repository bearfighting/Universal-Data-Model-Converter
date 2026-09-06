import { describe, expect, it } from "vitest";
import { tryParseKotlin } from "./api.js";

describe("Kotlin parser", () => {
  it("maps nested nullability, references, sets, and numeric hints", () => {
    const result = tryParseKotlin(
      `
      data class Address(val city: String)
      data class User(
        val id: Int,
        val names: List<String?>,
        val address: Address?,
        val friends: Map<String, Address?>,
        val tags: Set<String>
      )
    `,
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.rootName?.source).toBe("User");
    const user =
      result.document.root.kind === "reference"
        ? result.document.definitions.find(
            (definition) => definition.name.source === "User",
          )?.type
        : result.document.root;
    expect(user?.kind).toBe("object");
    if (user?.kind !== "object") return;
    expect(
      user.fields.find((field) => field.name.source === "id")?.type,
    ).toMatchObject({ scalar: "integer", representation: { widthBits: 32 } });
    expect(
      user.fields.find((field) => field.name.source === "names")?.type,
    ).toMatchObject({ kind: "array", elementType: { kind: "union" } });
    expect(
      user.fields.find((field) => field.name.source === "address")?.nullable,
    ).toBe(true);
    expect(
      user.fields.find((field) => field.name.source === "friends")?.type,
    ).toMatchObject({ kind: "record", value: { kind: "union" } });
    expect(result.artifacts.constraints.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: [
            expect.objectContaining({ kind: "unique-items", value: true }),
          ],
        }),
      ]),
    );
  });

  it("requires a unique root or an explicit entry", () => {
    const result = tryParseKotlin(
      "data class A(val value: String) data class B(val value: String)",
    );
    expect(result).toMatchObject({ ok: false, code: "ambiguous-kotlin-root" });
    expect(
      tryParseKotlin(
        "data class A(val value: String) data class B(val value: String)",
        { entry: "" },
      ),
    ).toMatchObject({ ok: false, code: "invalid-kotlin-entry" });
  });

  it("reports invalid parser options distinctly", () => {
    expect(
      tryParseKotlin("data class User(val id: Int)", { name: "" }),
    ).toMatchObject({ ok: false, code: "invalid-kotlin-options" });
  });

  it("rejects unsupported declarations and map keys", () => {
    expect(tryParseKotlin("class User(val id: Int)")).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-declaration",
    });
    expect(
      tryParseKotlin("data class User(val values: Map<Int, String>)"),
    ).toMatchObject({ ok: false, code: "unsupported-kotlin-map-key" });
    expect(tryParseKotlin("data class Box<T>(val value: T)")).toMatchObject({
      ok: false,
      code: "unsupported-kotlin-generic",
    });
    expect(
      tryParseKotlin("data class Box(val value: String<Int>)"),
    ).toMatchObject({ ok: false, code: "unsupported-kotlin-generic" });
    expect(
      tryParseKotlin(
        "data class User(val id: Int) data class Box(val value: User<String>)",
        { entry: "Box" },
      ),
    ).toMatchObject({ ok: false, code: "unsupported-kotlin-generic" });
  });

  it("rejects empty and duplicate data class fields", () => {
    expect(tryParseKotlin("data class Empty()")).toMatchObject({
      ok: false,
      code: "empty-kotlin-data-class",
    });
    expect(
      tryParseKotlin("data class User(val id: Int, val id: String)"),
    ).toMatchObject({ ok: false, code: "duplicate-kotlin-field" });
  });

  it("preserves direct recursion through a root definition", () => {
    const result = tryParseKotlin("data class Node(val next: Node?)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "reference",
      name: "Node",
    });
    expect(result.document.definitions).toHaveLength(1);
  });

  it("only accepts escaped Kotlin keywords as escaped identifiers", () => {
    expect(
      tryParseKotlin("data class User(val `class`: String)"),
    ).toMatchObject({
      ok: true,
    });
    expect(
      tryParseKotlin("data class User(val `foo-bar`: String)"),
    ).toMatchObject({ ok: false, code: "invalid-kotlin-identifier" });
  });

  it("maps a unit enum to a named literal union", () => {
    const result = tryParseKotlin("enum class Status { ACTIVE, INACTIVE }");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "union",
      members: [{ value: "ACTIVE" }, { value: "INACTIVE" }],
    });
  });
});
