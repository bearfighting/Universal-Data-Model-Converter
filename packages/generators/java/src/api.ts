import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { renderJavaDocument } from "./emit.js";
import { JavaGenerationError, type JavaGenerateResult } from "./failure.js";
import {
  assertSupportedJavaGeneratorOptions,
  resolveJavaGeneratorOptions,
  type JavaGeneratorOptions,
} from "./options.js";

export function tryGenerateJava(
  document: SchemaDocument,
  options: JavaGeneratorOptions = {},
): JavaGenerateResult {
  const resolved = resolveJavaGeneratorOptions(options);
  try {
    assertSupportedJavaGeneratorOptions(resolved);
    return { ok: true, output: renderJavaDocument(document, resolved) };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof JavaGenerationError
          ? error.code
          : "unsupported-java-node",
      message:
        error instanceof Error ? error.message : "Java generation failed.",
    };
  }
}

export function generateJava(
  document: SchemaDocument,
  options: JavaGeneratorOptions = {},
): string {
  const result = tryGenerateJava(document, options);
  if (!result.ok) throw new Error(result.message);
  return result.output;
}
