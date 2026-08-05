import type { SchemaDiagnostic } from "@schema-transformation-toolkit/core";
import ts from "typescript";
import { zodDiagnostic } from "./diagnostics.js";

export type ZodInferenceErrorCode =
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
  | "unsupported-zod-parser-v0";

export class ZodInferenceError extends Error {
  readonly code: ZodInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[];

  constructor(
    code: ZodInferenceErrorCode,
    message: string,
    diagnostics: SchemaDiagnostic[],
  ) {
    super(message);
    this.name = "ZodInferenceError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function isZodInferenceError(
  error: unknown,
): error is ZodInferenceError {
  return error instanceof ZodInferenceError;
}

export function throwZodInferenceError(
  code: ZodInferenceErrorCode,
  message: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  path: string[],
): never {
  throw new ZodInferenceError(code, message, [
    zodDiagnostic({ code, message, path, sourceFile, node }),
  ]);
}
