import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export type PythonParserFailureCode =
  | "invalid-python-syntax"
  | "unsupported-python-feature"
  | "unsupported-python-type"
  | "unsupported-python-union"
  | "unsupported-python-default"
  | "unsupported-python-decorator"
  | "unsupported-python-inheritance"
  | "unknown-python-reference"
  | "ambiguous-python-entry"
  | "missing-python-entry"
  | "duplicate-python-definition"
  | "invalid-python-data-model"
  | "unsupported-python-parser-v1";
export type PythonFailureCode = PythonParserFailureCode;
export type PythonParseFailureResult =
  ParseFailureResult<PythonParserFailureCode>;

export class PythonSyntaxError extends Error {
  constructor(
    readonly code: PythonFailureCode,
    message: string,
    readonly position?: { offset: number; line: number; column: number },
  ) {
    super(message);
    this.name = "PythonSyntaxError";
  }
}
