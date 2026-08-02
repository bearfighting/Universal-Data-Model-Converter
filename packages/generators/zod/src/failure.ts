import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";

export type ZodGeneratorFailureCode =
  | "invalid-schema-name"
  | "duplicate-rendered-schema-name"
  | "duplicate-rendered-field-name"
  | "invalid-field-name"
  | "invalid-record-key"
  | "invalid-reference-name"
  | "unsupported-node-kind"
  | "unsupported-literal"
  | "invalid-constraint-value";

export type ZodGeneratorFailureResult =
  GenerateFailureResult<ZodGeneratorFailureCode>;

export type ZodGenerateResult =
  GenerateSuccessResult<string> | ZodGeneratorFailureResult;
