import type {
  ConstraintDocument,
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { renderKotlinDocument } from "./emit.js";
import { KotlinGenerationError, type KotlinGenerateResult } from "./failure.js";
import {
  assertSupportedKotlinGeneratorOptions,
  resolveKotlinGeneratorOptions,
  type KotlinGeneratorOptions,
} from "./options.js";
export function tryGenerateKotlin(
  document: SchemaDocument,
  options: KotlinGeneratorOptions = {},
  constraints?: ConstraintDocument,
): KotlinGenerateResult {
  const resolved = resolveKotlinGeneratorOptions(options);
  try {
    assertSupportedKotlinGeneratorOptions(resolved);
    const result = renderKotlinDocument(document, resolved, constraints);
    const semanticNotes: SchemaSemanticNote[] = result.losses.map((loss) => ({
      kind: "loss",
      code: loss.code,
      message: loss.message,
      ...(loss.path ? { path: loss.path } : {}),
      source: "generator-kotlin",
      layer: "target",
    }));
    return {
      ok: true,
      output: result.output,
      ...(semanticNotes.length ? { semanticNotes } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof KotlinGenerationError
          ? error.code
          : "unsupported-kotlin-node",
      message:
        error instanceof Error ? error.message : "Kotlin generation failed.",
    };
  }
}
export function generateKotlin(
  document: SchemaDocument,
  options: KotlinGeneratorOptions = {},
  constraints?: ConstraintDocument,
): string {
  const result = tryGenerateKotlin(document, options, constraints);
  if (!result.ok) throw new Error(result.message);
  return result.output;
}
