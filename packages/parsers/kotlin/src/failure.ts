import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export interface KotlinPosition {
  offset: number;
  line: number;
  column: number;
}

export type KotlinParserFailureCode =
  | "invalid-kotlin-options"
  | "unsupported-kotlin-declaration"
  | "unsupported-kotlin-type"
  | "unsupported-kotlin-generic"
  | "unsupported-kotlin-map-key"
  | "unsupported-kotlin-enum"
  | "invalid-kotlin-entry"
  | "ambiguous-kotlin-root"
  | "unresolved-kotlin-reference"
  | "invalid-kotlin-identifier"
  | "malformed-kotlin-model"
  | "duplicate-kotlin-definition"
  | "duplicate-kotlin-field"
  | "duplicate-kotlin-member"
  | "empty-kotlin-enum"
  | "empty-kotlin-data-class"
  | "unsupported-kotlin-parser-v1";

export type KotlinParseFailureResult =
  ParseFailureResult<KotlinParserFailureCode>;

export class KotlinSyntaxError extends Error {
  constructor(
    readonly code: KotlinParserFailureCode,
    message: string,
    readonly position?: KotlinPosition,
  ) {
    super(message);
    this.name = "KotlinSyntaxError";
  }
}

export class KotlinSemanticError extends Error {
  constructor(
    readonly code: KotlinParserFailureCode,
    message: string,
    readonly position?: KotlinPosition,
  ) {
    super(message);
    this.name = "KotlinSemanticError";
  }
}

export class KotlinOptionsError extends Error {
  readonly code = "invalid-kotlin-options" as const;

  constructor(message: string) {
    super(message);
    this.name = "KotlinOptionsError";
  }
}
