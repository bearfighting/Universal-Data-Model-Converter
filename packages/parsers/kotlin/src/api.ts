import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { parseKotlinSyntax } from "./syntax.js";
import { mapKotlinFile } from "./semantic.js";
import {
  KotlinSemanticError,
  KotlinSyntaxError,
  KotlinOptionsError,
  type KotlinPosition,
} from "./failure.js";
import {
  assertSupportedKotlinParseOptions,
  resolveKotlinParseOptions,
  prepareKotlinParseOptions,
  type KotlinParseOptions,
} from "./options.js";
import type {
  KotlinParseFailureResult,
  KotlinParserFailureCode,
} from "./failure.js";

export interface KotlinParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts: {
    constraints: import("@schema-transformation-toolkit/core").ConstraintDocument;
  };
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type KotlinParseResult =
  KotlinParseSuccessResult | KotlinParseFailureResult;

export function tryParseKotlin(
  input: string,
  options: KotlinParseOptions = {},
): KotlinParseResult {
  const resolved = resolveKotlinParseOptions(options);
  try {
    assertSupportedKotlinParseOptions(resolved);
    const semantic = mapKotlinFile(
      parseKotlinSyntax(input),
      resolved.name,
      resolved.entry,
    );
    return {
      ok: true,
      document: semantic.document,
      artifacts: { constraints: semantic.constraints },
      ...(semantic.semanticNotes.length
        ? { semanticNotes: semantic.semanticNotes }
        : {}),
    };
  } catch (error) {
    return kotlinFailure(error, input);
  }
}
export function parseKotlin(
  input: string,
  options: KotlinParseOptions = {},
): SchemaDocument {
  const result = tryParseKotlin(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}
export const kotlinParser = {
  format: "kotlin" as const,
  parse(input: string, options: KotlinParseOptions = {}) {
    return tryParseKotlin(input, options);
  },
};
export const preparedKotlinParserOptions = prepareKotlinParseOptions();
function kotlinFailure(
  error: unknown,
  input: string,
): KotlinParseFailureResult {
  const syntax = error instanceof KotlinSyntaxError ? error : undefined;
  const semantic = error instanceof KotlinSemanticError ? error : undefined;
  const options = error instanceof KotlinOptionsError ? error : undefined;
  const code =
    options?.code ??
    semantic?.code ??
    syntax?.code ??
    "unsupported-kotlin-parser-v1";
  const message =
    error instanceof Error ? error.message : "Kotlin parser failed.";
  return {
    ok: false,
    code: code as KotlinParserFailureCode,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-kotlin",
        ...((syntax?.position ?? semantic?.position)
          ? {
              evidence: {
                position: syntax?.position ?? semantic?.position,
                sourceLength: input.length,
              },
            }
          : {}),
      },
    ],
  };
}
export type { KotlinPosition };
