import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
} from "../../packages/sdk/src/index.js";

const source = `import { z } from "zod";
export const UserSchema = z.strictObject({
  id: z.number().int(),
  name: z.string().min(1),
});`;

const enumAndMetadataSource = `import { z } from "zod";
export const UserSchema = z.object({
  role: z.enum(["admin", "user"]).describe("Account role"),
  retries: z.number().default(0),
});`;

describe("sdk Zod source integration", () => {
  it.each(["json-schema", "typescript", "zod", "openapi"] as const)(
    "converts zod to %s",
    (targetFormat) => {
      const result = convert({
        sourceFormat: "zod",
        targetFormat,
        input: source,
        name: "User",
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.plan.sourceFormat).toBe("zod");
    },
  );

  it("exposes the parser capabilities and static-subset limitations", () => {
    expect(describeFormatSupport("zod")).toMatchObject({
      parser: {
        producesIr: ["shape", "constraint"],
        capabilities: expect.arrayContaining(["shape-ir", "constraint-ir"]),
      },
      notableLimitations: expect.arrayContaining([
        "Zod source parsing is limited to statically analyzable Zod 4 schema expressions in a single source module.",
      ]),
    });
  });

  it("carries enum and portable metadata through supported targets", () => {
    const jsonSchema = convert({
      sourceFormat: "zod",
      targetFormat: "json-schema",
      input: enumAndMetadataSource,
      name: "User",
    });
    expect(jsonSchema.ok).toBe(true);
    if (jsonSchema.ok) {
      expect(jsonSchema.output).toMatchObject({
        $defs: {
          UserSchema: {
            properties: {
              role: {
                enum: ["admin", "user"],
                description: "Account role",
              },
              retries: { type: "number", default: 0 },
            },
          },
        },
      });
    }

    const typescript = convert({
      sourceFormat: "zod",
      targetFormat: "typescript",
      input: enumAndMetadataSource,
      name: "User",
    });
    expect(typescript.ok).toBe(true);
    if (typescript.ok) {
      expect(typescript.output).toContain('"admin" | "user"');
      expect(typescript.semanticNotes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "zod-default-input-presence" }),
        ]),
      );
      expect(typescript.losses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lostCapability: "portable-annotations" }),
        ]),
      );
    }

    for (const targetFormat of ["zod", "openapi"] as const) {
      const result = convert({
        sourceFormat: "zod",
        targetFormat,
        input: enumAndMetadataSource,
        name: "User",
      });
      expect(result.ok).toBe(true);
      if (targetFormat === "openapi" && result.ok) {
        expect(result.output).toMatchObject({
          components: {
            schemas: {
              UserSchema: {
                properties: {
                  role: { enum: ["admin", "user"] },
                },
              },
            },
          },
        });
      }
    }
  });
});
