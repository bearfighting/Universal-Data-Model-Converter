import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export type GoParserFailureCode =
  | "invalid-go-syntax"
  | "unsupported-go-feature"
  | "unsupported-go-type"
  | "unsupported-go-map-key"
  | "unknown-go-reference"
  | "ambiguous-go-entry"
  | "missing-go-entry"
  | "duplicate-go-definition"
  | "invalid-go-data-model"
  | "unsupported-go-parser-v1";
export type GoParseFailureResult = ParseFailureResult<GoParserFailureCode>;

export class GoSyntaxError extends Error {
  constructor(
    readonly code: GoParserFailureCode,
    message: string,
    readonly position?: GoPosition,
  ) {
    super(message);
    this.name = "GoSyntaxError";
  }
}
export interface GoPosition {
  offset: number;
  line: number;
  column: number;
}
