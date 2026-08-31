import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { parseGoSyntax } from "./syntax.js";
import { GoSemanticError } from "./semantic.js";
import { GoSyntaxError, type GoPosition } from "./failure.js";
import {
  assertSupportedGoParseOptions,
  prepareGoParseOptions,
  resolveGoParseOptions,
  type GoParseOptions,
} from "./options.js";
import type { GoParseFailureResult, GoParserFailureCode } from "./failure.js";
import { mapGoFile } from "./semantic.js";
export interface GoParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts: {
    constraints: ReturnType<
      typeof import("@schema-transformation-toolkit/core").constraintDocument
    >;
  };
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type GoParseResult = GoParseSuccessResult | GoParseFailureResult;
export function tryParseGo(
  input: string,
  options: GoParseOptions = {},
): GoParseResult {
  const resolved = resolveGoParseOptions(options);
  try {
    assertSupportedGoParseOptions(resolved);
    const result = mapGoFile(
      parseGoSyntax(input),
      resolved.name,
      resolved.entry,
    );
    return {
      ok: true,
      document: result.document,
      artifacts: { constraints: result.constraints },
      ...(result.semanticNotes.length
        ? { semanticNotes: result.semanticNotes }
        : {}),
    };
  } catch (error) {
    return goFailure(error, input);
  }
}
export function parseGo(
  input: string,
  options: GoParseOptions = {},
): SchemaDocument {
  const result = tryParseGo(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}
export const goParser = {
  format: "go" as const,
  parse(input: string, options: GoParseOptions = {}) {
    return tryParseGo(input, options);
  },
};
export const preparedGoParserOptions = prepareGoParseOptions();
function goFailure(error: unknown, input: string): GoParseFailureResult {
  const typed = error as Partial<GoSyntaxError & GoSemanticError>;
  const code = (typed.code ??
    "unsupported-go-parser-v1") as GoParserFailureCode;
  const message = error instanceof Error ? error.message : "Go parser failed.";
  return {
    ok: false,
    code,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-go",
        ...((typed.position as GoPosition | undefined)
          ? {
              evidence: {
                position: typed.position,
                sourceLength: input.length,
              },
            }
          : {}),
      },
    ],
  };
}
