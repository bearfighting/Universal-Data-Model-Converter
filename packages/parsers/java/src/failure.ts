import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export interface JavaPosition {
  offset: number;
  line: number;
  column: number;
}

export type JavaParserFailureCode =
  | "invalid-java-syntax"
  | "unsupported-java-feature"
  | "unsupported-java-type"
  | "unsupported-java-generic"
  | "unsupported-java-map-key"
  | "unknown-java-reference"
  | "multiple-java-public-roots"
  | "missing-java-public-root"
  | "invalid-java-entry"
  | "duplicate-java-definition"
  | "invalid-java-data-model"
  | "unsupported-java-parser-v1";

export type JavaParseFailureResult = ParseFailureResult<JavaParserFailureCode>;

export class JavaSyntaxError extends Error {
  constructor(
    readonly code: JavaParserFailureCode,
    message: string,
    readonly position?: JavaPosition,
  ) {
    super(message);
    this.name = "JavaSyntaxError";
  }
}

export class JavaSemanticError extends Error {
  constructor(
    readonly code: JavaParserFailureCode,
    message: string,
    readonly position?: JavaPosition,
  ) {
    super(message);
    this.name = "JavaSemanticError";
  }
}
