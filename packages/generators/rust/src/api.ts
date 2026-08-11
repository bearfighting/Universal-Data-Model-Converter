import type {
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { renderRustDocument } from "./emit.js";
import { RustGenerationError, type RustGenerateResult } from "./failure.js";
import {
  resolveRustGeneratorOptions,
  type RustGeneratorOptions,
} from "./options.js";

export function tryGenerateRust(
  document: SchemaDocument,
  options: RustGeneratorOptions = {},
  constraints?: ConstraintDocument,
): RustGenerateResult {
  resolveRustGeneratorOptions(options);
  try {
    const rendered = renderRustDocument(document, constraints);
    return {
      ok: true,
      output: rendered.output,
      ...(rendered.semanticNotes.length
        ? { semanticNotes: rendered.semanticNotes }
        : {}),
    };
  } catch (error) {
    return {
      ok: false,
      code: classifyRustGenerationFailure(error),
      message:
        error instanceof Error ? error.message : "Rust generation failed.",
    };
  }
}

export function generateRust(
  document: SchemaDocument,
  options: RustGeneratorOptions = {},
  constraints?: ConstraintDocument,
): string {
  const result = tryGenerateRust(document, options, constraints);
  if (!result.ok) throw new Error(result.message);
  return result.output;
}

function classifyRustGenerationFailure(error: unknown) {
  if (error instanceof RustGenerationError) return error.code;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("integer range"))
    return "unsupported-rust-integer-range" as const;
  if (message.includes("representation"))
    return "incompatible-rust-representation" as const;
  if (message.includes("object root")) return "unsupported-rust-root" as const;
  if (message.includes("union")) return "unsupported-rust-union" as const;
  if (message.includes("identifier")) return "invalid-rust-identifier" as const;
  return "unsupported-rust-node" as const;
}
