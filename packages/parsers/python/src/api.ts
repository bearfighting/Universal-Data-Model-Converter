import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { parsePythonSyntax } from "./syntax.js";
import { mapPythonFile, PythonSemanticError } from "./semantic.js";
import {
  assertSupportedPythonParseOptions,
  preparePythonParseOptions,
  resolvePythonParseOptions,
  type PythonParseOptions,
} from "./options.js";
import type {
  PythonParseFailureResult,
  PythonParserFailureCode,
} from "./failure.js";
import { PythonSyntaxError } from "./failure.js";

export interface PythonParseSuccessResult {
  ok: true;
  document: SchemaDocument;
}
export type PythonParseResult =
  PythonParseSuccessResult | PythonParseFailureResult;

export function tryParsePython(
  input: string,
  options: PythonParseOptions = {},
): PythonParseResult {
  const resolved = resolvePythonParseOptions(options);
  try {
    assertSupportedPythonParseOptions(resolved);
    return {
      ok: true,
      document: mapPythonFile(
        parsePythonSyntax(input),
        resolved.name,
        resolved.entry,
      ),
    };
  } catch (error) {
    return pythonFailure(error, input);
  }
}
export function parsePython(
  input: string,
  options: PythonParseOptions = {},
): SchemaDocument {
  const result = tryParsePython(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}
export const pythonParser = {
  format: "python" as const,
  parse(input: string, options: PythonParseOptions = {}) {
    return tryParsePython(input, options);
  },
};
export const preparedPythonParserOptions = preparePythonParseOptions();

function pythonFailure(
  error: unknown,
  input: string,
): PythonParseFailureResult {
  const syntax = error instanceof PythonSyntaxError ? error : undefined;
  const semantic = error instanceof PythonSemanticError ? error : undefined;
  const code = semantic?.code ?? syntax?.code ?? "unsupported-python-parser-v1";
  const message =
    error instanceof Error ? error.message : "Python parser failed.";
  return {
    ok: false,
    code: code as PythonParserFailureCode,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-python",
        ...(syntax?.position
          ? {
              evidence: {
                position: syntax.position,
                sourceLength: input.length,
              },
            }
          : {}),
      },
    ],
  };
}
