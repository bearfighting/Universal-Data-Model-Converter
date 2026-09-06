import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type KotlinGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-kotlin-root"
  | "unsupported-kotlin-node"
  | "invalid-kotlin-identifier"
  | "duplicate-kotlin-definition"
  | "unsupported-kotlin-enum"
  | "invalid-kotlin-package"
  | "invalid-kotlin-declaration-style"
  | "invalid-kotlin-property-style"
  | "kotlin-enum-name-collision"
  | "unsupported-kotlin-optional-field"
  | "unsupported-kotlin-empty-object"
  | "unsupported-kotlin-additional-properties"
  | "unsupported-kotlin-representation";
export class KotlinGenerationError extends Error {
  constructor(
    readonly code: KotlinGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "KotlinGenerationError";
  }
}
export type KotlinGenerateFailureResult =
  GenerateFailureResult<KotlinGeneratorFailureCode>;
export type KotlinGenerateResult =
  GenerateSuccessResult<string> | KotlinGenerateFailureResult;
