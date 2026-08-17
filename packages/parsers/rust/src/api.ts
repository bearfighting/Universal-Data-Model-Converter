import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { parseRustSyntax, type RustSyntaxError } from "./syntax.js";
import { mapRustFile, RustSemanticError } from "./semantic.js";
import {
  assertSupportedRustParseOptions,
  prepareRustParseOptions,
  resolveRustParseOptions,
  type RustParseOptions,
} from "./options.js";
import type {
  RustParseFailureResult,
  RustParserFailureCode,
} from "./failure.js";

export interface RustParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts: {
    constraints: ReturnType<
      typeof import("@schema-transformation-toolkit/core").constraintDocument
    >;
  };
  diagnostics?: never;
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}

export type RustParseResult = RustParseSuccessResult | RustParseFailureResult;

export function tryParseRust(
  input: string,
  options: RustParseOptions = {},
): RustParseResult {
  const resolved = resolveRustParseOptions(options);
  try {
    assertSupportedRustParseOptions(resolved);
    const semantic = mapRustFile(
      parseRustSyntax(input),
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
    return rustFailure(error, input);
  }
}

export function parseRust(
  input: string,
  options: RustParseOptions = {},
): SchemaDocument {
  const result = tryParseRust(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}

export const rustParser = {
  format: "rust" as const,
  parse(input: string, options: RustParseOptions = {}) {
    return tryParseRust(input, options);
  },
};

export const preparedRustParserOptions = prepareRustParseOptions();

function rustFailure(error: unknown, input: string): RustParseFailureResult {
  const syntax = error as Partial<RustSyntaxError>;
  const semantic = error as Partial<RustSemanticError>;
  const code =
    error instanceof RustSemanticError
      ? error.code
      : isRustFailureCode(syntax.code)
        ? syntax.code
        : "unsupported-rust-parser-v1";
  const message =
    error instanceof Error ? error.message : "Rust parser failed.";
  return {
    ok: false,
    code,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-rust",
        ...((syntax.position ?? semantic.position)
          ? {
              evidence: {
                position: syntax.position ?? semantic.position,
                sourceLength: input.length,
              },
            }
          : {}),
      },
    ],
  };
}

function isRustFailureCode(value: unknown): value is RustParserFailureCode {
  return (
    typeof value === "string" &&
    [
      "invalid-rust-syntax",
      "unsupported-rust-feature",
      "unsupported-rust-type",
      "unsupported-rust-attribute",
      "ambiguous-rust-entry",
      "missing-rust-entry",
      "duplicate-rust-definition",
      "invalid-rust-data-model",
      "unsupported-rust-map-key",
      "unsupported-rust-parser-v1",
    ].includes(value)
  );
}
