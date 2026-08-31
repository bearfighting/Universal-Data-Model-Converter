import type {
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { renderGoDocument } from "./emit.js";
import { GoGenerationError, type GoGenerateResult } from "./failure.js";
import {
  assertSupportedGoGeneratorOptions,
  resolveGoGeneratorOptions,
  type GoGeneratorOptions,
} from "./options.js";
export function tryGenerateGo(
  document: SchemaDocument,
  options: GoGeneratorOptions = {},
  constraints?: ConstraintDocument,
): GoGenerateResult {
  void constraints;
  const resolved = resolveGoGeneratorOptions(options);
  try {
    assertSupportedGoGeneratorOptions(resolved);
    return { ok: true, output: renderGoDocument(document, resolved) };
  } catch (error) {
    const code =
      error instanceof GoGenerationError ? error.code : "unsupported-go-node";
    return {
      ok: false,
      code,
      message: error instanceof Error ? error.message : "Go generation failed.",
    };
  }
}
export function generateGo(
  document: SchemaDocument,
  options: GoGeneratorOptions = {},
  constraints?: ConstraintDocument,
): string {
  const result = tryGenerateGo(document, options, constraints);
  if (!result.ok) throw new Error(result.message);
  return result.output;
}
