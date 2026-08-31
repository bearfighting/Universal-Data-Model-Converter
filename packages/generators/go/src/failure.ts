import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type GoGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-go-root"
  | "unsupported-go-node"
  | "invalid-go-identifier"
  | "invalid-go-struct-tag"
  | "unsupported-go-union";
export class GoGenerationError extends Error {
  constructor(
    readonly code: GoGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "GoGenerationError";
  }
}
export type GoGenerateFailureResult =
  GenerateFailureResult<GoGeneratorFailureCode>;
export type GoGenerateResult =
  GenerateSuccessResult<string> | GoGenerateFailureResult;
