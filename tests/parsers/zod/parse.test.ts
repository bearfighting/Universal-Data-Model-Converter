import { describe, expect, it } from "vitest";
import { tryInferZodDocumentWithOptions } from "@schema-transformation-toolkit/parser-zod";

describe("parser-zod static schema subset", () => {
  it("lowers canonical Zod expressions into shape and constraint IR", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       const AddressSchema = z.strictObject({ city: z.string().min(1) });
       export const UserSchema = z.object({
         name: z.string().nullable().optional(),
         age: z.number().int().min(0),
         address: AddressSchema,
         tags: z.array(z.string()).max(3),
       });`,
      { name: "User" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toEqual({
      kind: "reference",
      name: "UserSchema",
    });
    expect(
      result.document.definitions.map((definition) => definition.name.source),
    ).toEqual(["AddressSchema", "UserSchema"]);
    expect(result.document.definitions[1]?.type).toMatchObject({
      kind: "object",
    });
    if (result.document.definitions[1]?.type.kind !== "object") return;
    expect(result.document.definitions[1].type.fields[0]).toMatchObject({
      name: { source: "name" },
      required: false,
      nullable: true,
    });
    expect(result.document.definitions[1].type.fields[1]).toMatchObject({
      name: { source: "age" },
      required: true,
      type: { kind: "scalar", scalar: "integer" },
    });
    expect(
      result.constraints?.entries.flatMap((entry) =>
        entry.constraints.map((item) => item.kind),
      ),
    ).toEqual(["minimum", "min-length", "closed-object", "max-items"]);
    expect(
      result.semanticNotes?.some(
        (note) => note.code === "zod-object-unknown-keys-policy",
      ),
    ).toBe(true);
  });

  it("supports recursive lazy references and JavaScript source", () => {
    const result = tryInferZodDocumentWithOptions(
      `import * as z from "zod"; const NodeSchema = z.object({ value: z.string(), next: z.lazy(() => NodeSchema).nullable() });`,
      { name: "Node", entry: "NodeSchema" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.definitions[0]?.type).toMatchObject({
      kind: "object",
    });
    expect(
      result.document.definitions[0]?.type.kind === "object" &&
        result.document.definitions[0].type.fields[1]?.type,
    ).toEqual({ kind: "reference", name: "NodeSchema" });
  });

  it("reports policy for ordinary objects and preserves strict objects", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; export const UserSchema = z.object({ name: z.string() });`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.semanticNotes?.[0]?.code).toBe(
      "zod-object-unknown-keys-policy",
    );
  });

  it("keeps dotted property names distinct in constraint paths", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; export const UserSchema = z.object({ "user.name": z.string().min(1), user: z.object({ name: z.string().max(4) }) });`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.constraints?.entries.map((entry) => entry.target.path),
    ).toEqual([
      ["definitions", "UserSchema", "user.name"],
      ["definitions", "UserSchema", "user", "name"],
    ]);
  });

  it("allows mutual lazy recursion", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; const ASchema = z.lazy(() => BSchema); const BSchema = z.lazy(() => ASchema);`,
      { name: "A", entry: "ASchema" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.definitions).toHaveLength(2);
  });

  it("lowers static enums and portable metadata", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       export const UserSchema = z.object({
         role: z.enum(["admin", "user", "admin"]).describe("Account role"),
         retries: z.number().default(0),
         settings: z.array(z.boolean()).default([true, false]),
         profile: z.object({ enabled: z.boolean() }).default({ enabled: true }),
       });`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const definition = result.document.definitions[0];
    expect(definition?.type.kind).toBe("object");
    if (definition?.type.kind !== "object") return;
    expect(definition.type.fields[0]?.type).toEqual({
      kind: "union",
      members: [
        { kind: "literal", value: "admin" },
        { kind: "literal", value: "user" },
      ],
    });
    expect(result.constraints?.entries).toEqual([
      expect.objectContaining({
        target: { kind: "node", path: ["definitions", "UserSchema", "role"] },
        constraints: [{ kind: "description", value: "Account role" }],
      }),
      expect.objectContaining({
        target: {
          kind: "node",
          path: ["definitions", "UserSchema", "retries"],
        },
        constraints: [{ kind: "default", value: 0 }],
      }),
      expect.objectContaining({
        target: {
          kind: "node",
          path: ["definitions", "UserSchema", "settings"],
        },
        constraints: [{ kind: "default", value: [true, false] }],
      }),
      expect.objectContaining({
        target: {
          kind: "node",
          path: ["definitions", "UserSchema", "profile"],
        },
        constraints: [{ kind: "default", value: { enabled: true } }],
      }),
    ]);
  });

  it("overrides earlier metadata at the same path with a semantic note", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; export const UserSchema = z.string().describe("first").describe("last");`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.constraints?.entries[0]?.constraints).toEqual([
      { kind: "description", value: "last" },
    ]);
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "zod-metadata-overridden" }),
      ]),
    );
  });

  it("keeps default fields required while reporting input presence caveat", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       const ChildSchema = z.string().default("child");
       export const UserSchema = z.object({
         name: z.string().default("user"),
         pair: z.tuple([z.string().default("tuple")]),
       });`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const type = result.document.definitions.at(-1)?.type;
    expect(type?.kind).toBe("object");
    if (type?.kind !== "object") return;
    expect(type.fields.every((field) => field.required)).toBe(true);
    expect(
      result.semanticNotes?.filter(
        (note) => note.code === "zod-default-input-presence",
      ),
    ).toHaveLength(2);
    const profileDefault = result.constraints?.entries.find((entry) =>
      entry.target.path.includes("pair"),
    );
    expect(profileDefault).toBeDefined();
  });

  it("reports default caveat for a standalone definition", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; const ChildSchema = z.string().default("child");`,
      { name: "Child", entry: "ChildSchema" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "zod-default-input-presence" }),
      ]),
    );
  });

  it("keeps special static object keys as data", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; export const UserSchema = z.object({ data: z.object({}).default({ "__proto__": "safe" }) });`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = result.constraints?.entries[0]?.constraints[0]?.value;
    expect(value).toMatchObject({ __proto__: "safe" });
    expect(Object.getPrototypeOf(value)).toBeNull();
  });

  it("ignores unreachable dynamic declarations and imports", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       import { runtimeValue } from "./runtime";
       const unrelated = makeSchema();
       let alsoUnrelated = z.string();
       alsoUnrelated = makeSchema();
       export const UserSchema = z.string();`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
  });

  it("selects a unique schema-like binding without counting ordinary variables", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       const unrelated = makeSchema();
       const UserSchema = z.object({});
      `,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.root).toEqual({
        kind: "reference",
        name: "UserSchema",
      });
    }
  });

  it("requires an explicit entry for multiple or non-schema-like bindings", () => {
    const multiple = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; const UserSchema = z.string(); const AdminSchema = z.number();`,
      { name: "User" },
    );
    expect(multiple).toMatchObject({ ok: false, code: "ambiguous-zod-entry" });

    const ordinary = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; const value = z.string();`,
      { name: "User" },
    );
    expect(ordinary).toMatchObject({ ok: false, code: "missing-zod-entry" });

    const explicit = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; const value = z.string();`,
      { name: "User", entry: "value" },
    );
    expect(explicit.ok).toBe(true);
  });

  it("tracks outer reassignments without false positives from lexical shadows", () => {
    const outer = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       const UserSchema = z.string();
       function mutate() { UserSchema = z.number(); }
       export const RootSchema = UserSchema;`,
      { name: "User" },
    );
    expect(outer).toMatchObject({
      ok: false,
      code: "unsupported-zod-redeclaration",
    });

    const shadowed = tryInferZodDocumentWithOptions(
      `import { z } from "zod";
       const UserSchema = z.string();
       function mutate(UserSchema) { UserSchema = z.number(); }
       function localZ(z) { z = other; }
       export const RootSchema = UserSchema;`,
      { name: "User" },
    );
    expect(shadowed.ok).toBe(true);
  });

  it("reports enum lowering details", () => {
    const result = tryInferZodDocumentWithOptions(
      `import { z } from "zod"; export const UserSchema = z.enum(["a", "a", "b"]);`,
      { name: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "zod-enum-lowered",
          evidence: expect.objectContaining({
            originalMemberCount: 3,
            normalizedMemberCount: 2,
          }),
        }),
      ]),
    );
  });
});
