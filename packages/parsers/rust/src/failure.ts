import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export type RustParserFailureCode =
  | "invalid-rust-syntax"
  | "unsupported-rust-feature"
  | "unsupported-rust-type"
  | "unsupported-rust-attribute"
  | "ambiguous-rust-entry"
  | "missing-rust-entry"
  | "duplicate-rust-definition"
  | "invalid-rust-data-model"
  | "unsupported-rust-parser-v1";

export type RustParseFailureResult = ParseFailureResult<RustParserFailureCode>;
