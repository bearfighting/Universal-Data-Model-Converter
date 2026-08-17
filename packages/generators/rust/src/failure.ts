import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";

export type RustGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-rust-root"
  | "unsupported-rust-node"
  | "invalid-rust-identifier"
  | "incompatible-rust-representation"
  | "unsupported-rust-integer-range"
  | "unsupported-rust-union"
  | "unsupported-rust-enum"
  | "unsupported-rust-constraint";

export class RustGenerationError extends Error {
  constructor(
    readonly code: RustGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "RustGenerationError";
  }
}

export type RustGenerateFailureResult =
  GenerateFailureResult<RustGeneratorFailureCode>;
export type RustGenerateResult =
  GenerateSuccessResult<string> | RustGenerateFailureResult;
