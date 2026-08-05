import type {
  ConstraintDocument,
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import {
  configureZodParser,
  resolveZodParseOptions,
  assertSupportedZodParseOptions,
  type ResolvedZodParseOptions,
  type ZodParseOptions,
} from "./options.js";
import { isZodInferenceError } from "./errors.js";
import { parseZodSource } from "./parse.js";

export interface ZodInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type ZodInferenceFailureResult = ParseFailureResult<
  | "invalid-zod-source"
  | "missing-zod-entry"
  | "ambiguous-zod-entry"
  | "missing-zod-schema-binding"
  | "unknown-zod-schema-reference"
  | "unsupported-zod-expression"
  | "unsupported-zod-constructor"
  | "unsupported-zod-method"
  | "unsupported-zod-object-key"
  | "unsupported-zod-lazy"
  | "unsupported-zod-optional-presence"
  | "unsupported-zod-regex-flags"
  | "unsupported-zod-import"
  | "unsupported-zod-reference-cycle"
  | "unsupported-zod-redeclaration"
  | "unsupported-zod-constraint"
  | "unsupported-zod-enum"
  | "unsupported-zod-union"
  | "unsupported-zod-metadata"
  | "unsupported-zod-parser-v0"
>;
export type ZodInferenceResult =
  ZodInferenceSuccessResult | ZodInferenceFailureResult;

export function inferZodDocument(
  input: string,
  name = "ZodDocument",
): SchemaDocument {
  return inferZodDocumentWithOptions(input, { name });
}
export function inferZodDocumentWithOptions(
  input: string,
  options: ZodParseOptions = {},
): SchemaDocument {
  const result = tryInferZodDocumentWithOptions(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}
export function tryInferZodDocument(
  input: string,
  name = "ZodDocument",
): ZodInferenceResult {
  return tryInferZodDocumentWithOptions(input, { name });
}
export function tryInferZodDocumentWithOptions(
  input: string,
  options: ZodParseOptions = {},
): ZodInferenceResult {
  const resolved = resolveZodParseOptions(options);
  assertSupportedZodParseOptions(resolved);
  return tryInferZodDocumentWithResolvedOptions(input, resolved);
}

function tryInferZodDocumentWithResolvedOptions(
  input: string,
  options: ResolvedZodParseOptions,
): ZodInferenceResult {
  try {
    const converted = parseZodSource(input, options);
    return {
      ok: true,
      document: converted.document,
      ...(converted.constraints.entries.length > 0
        ? { constraints: converted.constraints }
        : {}),
      ...(converted.diagnostics.length > 0
        ? { diagnostics: converted.diagnostics }
        : {}),
      ...(converted.semanticNotes.length > 0
        ? { semanticNotes: converted.semanticNotes }
        : {}),
    };
  } catch (error) {
    if (isZodInferenceError(error))
      return {
        ok: false,
        code: error.code,
        message: error.message,
        diagnostics: error.diagnostics,
      };
    return {
      ok: false,
      code: "unsupported-zod-parser-v0",
      message:
        "The Zod parser hit an unexpected fallback outside the supported static subset.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-zod-parser-v0",
          message:
            "The Zod parser hit an unexpected fallback outside the supported static subset.",
          source: "parser-zod",
        },
      ],
    };
  }
}

const configured = configureZodParser((input, options) =>
  tryInferZodDocumentWithResolvedOptions(input, options),
);
export const zodParser = configured.parser;
export const preparedZodParserOptions = configured.prepared;
