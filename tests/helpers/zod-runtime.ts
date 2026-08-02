import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect } from "vitest";
import ts from "typescript";
import { ZodError } from "zod";

export interface ZodValidationExamples {
  valid: unknown[];
  invalid: unknown[];
}

export async function expectGeneratedZodRuntimeBehavior(
  output: string,
  schemaExportName: string,
  examples: ZodValidationExamples,
  language: "typescript" | "javascript",
): Promise<void> {
  const directory = await mkdtemp(
    join(process.cwd(), "node_modules", ".aio-zod-runtime-"),
  );
  const sourcePath = join(directory, "generated.mjs");

  try {
    const executable =
      language === "typescript"
        ? ts.transpileModule(output, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
            },
            fileName: "generated.ts",
          }).outputText
        : output;

    await writeFile(sourcePath, executable, "utf8");
    const generatedModule = await import(
      `${pathToFileURL(sourcePath).href}?cache=${Date.now()}`
    );
    const schema = generatedModule[`${schemaExportName}Schema`];

    expect(schema).toBeDefined();
    expect(typeof schema?.parse).toBe("function");

    for (const value of examples.valid) {
      expect(() => schema.parse(value)).not.toThrow();
    }

    for (const value of examples.invalid) {
      try {
        schema.parse(value);
        throw new Error(
          "Expected generated Zod schema to reject invalid input.",
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
