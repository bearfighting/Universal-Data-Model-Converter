import { describe, expect, it } from "vitest";
import { tryInferZodDocumentWithOptions } from "@schema-transformation-toolkit/parser-zod";

describe("parser-zod failure boundaries", () => {
  const cases = [
    [
      'import { z } from "zod"; export const UserSchema = makeSchema();',
      "unsupported-zod-constructor",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.string().transform(value => value);',
      "unsupported-zod-method",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.object({ [key]: z.string() });',
      "unsupported-zod-object-key",
    ],
    [
      'import { z } from "zod"; export const ASchema = z.string(); export const BSchema = z.number();',
      "ambiguous-zod-entry",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.lazy((value) => value);',
      "unsupported-zod-lazy",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.enum([]);',
      "unsupported-zod-enum",
    ],
    [
      'import { z } from "zod"; const value = "admin"; export const UserSchema = z.enum([value]);',
      "unsupported-zod-enum",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.enum(["admin", 1]);',
      "unsupported-zod-enum",
    ],
    [
      'import { z } from "zod"; const value = "name"; export const UserSchema = z.string().describe(value);',
      "unsupported-zod-metadata",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.string().default(makeDefault());',
      "unsupported-zod-metadata",
    ],
  ] as const;

  for (const [input, code] of cases) {
    it(`rejects ${code}`, () => {
      const result = tryInferZodDocumentWithOptions(input, { name: "Test" });
      expect(result).toMatchObject({ ok: false, code });
      if (!result.ok)
        expect(result.diagnostics?.[0]).toMatchObject({
          source: "parser-zod",
          code,
        });
    });
  }

  it("reports source ranges for invalid source", () => {
    const result = tryInferZodDocumentWithOptions(
      'import { z } from "zod"; export const UserSchema = z.object({',
      { name: "Test" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics?.[0]?.evidence).toHaveProperty(
        "sourceLocation",
      );
  });

  it.each([
    ["export const UserSchema = z.string();", "unsupported-zod-import"],
    [
      'import z from "zod"; export const UserSchema = z.string();',
      "unsupported-zod-import",
    ],
    [
      'import { z as schema } from "zod"; export const UserSchema = schema.string();',
      "unsupported-zod-import",
    ],
    [
      'import { z } from "zod"; const z = z.string(); export const UserSchema = z.string();',
      "unsupported-zod-redeclaration",
    ],
    [
      'import { z } from "zod"; let UserSchema = z.string(); UserSchema = z.number();',
      "unsupported-zod-redeclaration",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.string().optional();',
      "unsupported-zod-optional-presence",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.string().regex(/x/i);',
      "unsupported-zod-regex-flags",
    ],
    [
      'import { z } from "zod"; const A = B; const B = A;',
      "unsupported-zod-reference-cycle",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.record(z.number(), z.string());',
      "unsupported-zod-constraint",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.union([]);',
      "unsupported-zod-union",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.union([z.string()]);',
      "unsupported-zod-union",
    ],
    [
      'import { z } from "zod"; export const UserSchema = z.string().min(1, "message");',
      "unsupported-zod-constraint",
    ],
    [
      'import { z } from "zod"; import { value } from "./runtime"; export const UserSchema = value;',
      "unsupported-zod-import",
    ],
    [
      'import { z } from "zod"; import { z } from "zod"; export const UserSchema = z.string();',
      "unsupported-zod-redeclaration",
    ],
    [
      'import { z } from "zod"; z = other; export const UserSchema = z.string();',
      "unsupported-zod-redeclaration",
    ],
  ] as const)("strictly rejects %s", (input, code) => {
    const result = tryInferZodDocumentWithOptions(input, {
      name: "Test",
      ...(input.includes("const A") ? { entry: "A" } : {}),
    });
    expect(result).toMatchObject({ ok: false, code });
  });
});
