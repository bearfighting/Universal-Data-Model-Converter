import { describe, expect, it } from "vitest";
import { tryParseJava } from "./api.js";

describe("Java parser", () => {
  it("parses a public root record with package-private recursive definitions", () => {
    const result = tryParseJava(
      `
      package example;
      import java.util.List;
      import java.util.Map;

      public record User(long id, String name, List<String> tags, Map<String, Profile> profiles, Profile profile) {}
      record Profile(String bio, User owner) {}
    `,
      { name: "User" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.rootName?.source).toBe("User");
    expect(result.document.root.kind).toBe("reference");
    expect(
      result.document.definitions.map((definition) => definition.name.source),
    ).toEqual(["User", "Profile"]);
    const user = result.document.definitions.find(
      (definition) => definition.name.source === "User",
    );
    expect(user?.type.kind).toBe("object");
    if (user?.type.kind !== "object") return;
    expect(user.type.fields[0]?.type).toMatchObject({
      kind: "scalar",
      scalar: "integer",
      representation: { widthBits: 64 },
    });
    expect(
      user.type.fields.find((field) => field.name.source === "name")?.nullable,
    ).toBe(true);
    expect(
      user.type.fields.find((field) => field.name.source === "tags")?.type.kind,
    ).toBe("array");
    expect(
      result.semanticNotes?.every(
        (note) => note.code === "java-nullability-unspecified",
      ),
    ).toBe(true);
  });

  it("rejects multiple public roots and missing public roots", () => {
    const multiple = tryParseJava(
      "public record A(String value) {} public record B(String value) {}",
    );
    const missing = tryParseJava("record A(String value) {}");
    expect(multiple.ok ? undefined : multiple.code).toBe(
      "multiple-java-public-roots",
    );
    expect(missing.ok ? undefined : missing.code).toBe(
      "missing-java-public-root",
    );
  });

  it("rejects unsupported Java constructs explicitly", () => {
    const generic = tryParseJava("public record Box<T>(T value) {}");
    const map = tryParseJava(
      "public record User(Map<Integer, String> values) {}",
    );
    const classResult = tryParseJava("public class User {}");
    const annotation = tryParseJava(
      "public record User(@Deprecated String name) {}",
    );
    expect(generic.ok ? undefined : generic.code).toBe(
      "unsupported-java-generic",
    );
    expect(map.ok ? undefined : map.code).toBe("unsupported-java-map-key");
    expect(classResult.ok ? undefined : classResult.code).toBe(
      "unsupported-java-feature",
    );
    expect(annotation.ok ? undefined : annotation.code).toBe(
      "unsupported-java-feature",
    );
  });

  it("rejects unsupported record modifiers and malformed imports", () => {
    const privateRecord = tryParseJava("private record User(String name) {}");
    const staticRecord = tryParseJava(
      "public static record User(String name) {}",
    );
    const malformedImport = tryParseJava(
      "import java.util.List public record User(String name) {}",
    );

    expect(privateRecord.ok ? undefined : privateRecord.code).toBe(
      "unsupported-java-feature",
    );
    expect(staticRecord.ok ? undefined : staticRecord.code).toBe(
      "unsupported-java-feature",
    );
    expect(malformedImport.ok ? undefined : malformedImport.code).toBe(
      "invalid-java-syntax",
    );
  });

  it("rejects Java reserved words as declaration and component names", () => {
    const reservedRecord = tryParseJava("public record class(String value) {}");
    const reservedComponent = tryParseJava(
      "public record User(String null) {}",
    );

    expect(reservedRecord.ok ? undefined : reservedRecord.code).toBe(
      "invalid-java-syntax",
    );
    expect(reservedComponent.ok ? undefined : reservedComponent.code).toBe(
      "invalid-java-syntax",
    );
  });

  it("maps unit-only enums to named string literal unions", () => {
    const result = tryParseJava(
      "public enum Status { ACTIVE, INACTIVE, } record User(Status status) {}",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.rootName?.source).toBe("Status");
    expect(result.document.root.kind).toBe("reference");
    const status = result.document.definitions.find(
      (definition) => definition.name.source === "Status",
    )?.type;
    expect(status?.kind).toBe("union");
    if (status?.kind !== "union") return;
    expect(status.members).toEqual([
      { kind: "literal", value: "ACTIVE" },
      { kind: "literal", value: "INACTIVE" },
    ]);
    expect(result.semanticNotes).toContainEqual(
      expect.objectContaining({ code: "java-enum-lowered" }),
    );
  });

  it("reports a standalone root enum note at the root path", () => {
    const result = tryParseJava("public enum Status { ACTIVE, INACTIVE }");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.semanticNotes).toContainEqual(
      expect.objectContaining({
        code: "java-enum-lowered",
        path: ["root"],
      }),
    );
  });

  it("rejects empty, duplicate, and data-carrying enums", () => {
    expect(tryParseJava("public enum Status {}")).toMatchObject({
      ok: false,
      code: "empty-java-enum",
    });
    expect(tryParseJava("public enum Status { ACTIVE, ACTIVE }")).toMatchObject(
      { ok: false, code: "duplicate-java-enum-variant" },
    );
    expect(
      tryParseJava("public enum Status { ACTIVE(1), INACTIVE }"),
    ).toMatchObject({ ok: false, code: "unsupported-java-enum" });
    expect(
      tryParseJava("public enum Status { ACTIVE; int code; }"),
    ).toMatchObject({ ok: false, code: "unsupported-java-enum" });
  });

  it("rejects primitive type arguments but accepts primitive arrays", () => {
    expect(
      tryParseJava("public record User(List<int> values) {}"),
    ).toMatchObject({ ok: false, code: "unsupported-java-generic" });
    expect(
      tryParseJava("public record User(Map<String, boolean> values) {}"),
    ).toMatchObject({ ok: false, code: "unsupported-java-generic" });
    expect(tryParseJava("public record User(int[] values) {}").ok).toBe(true);
  });
});
