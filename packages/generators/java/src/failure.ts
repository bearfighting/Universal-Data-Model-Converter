import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";

export type JavaGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-java-root"
  | "unsupported-java-node"
  | "invalid-java-identifier"
  | "duplicate-java-definition"
  | "unsupported-java-enum"
  | "invalid-java-package"
  | "invalid-java-visibility";

export class JavaGenerationError extends Error {
  constructor(
    readonly code: JavaGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "JavaGenerationError";
  }
}

export type JavaGenerateFailureResult =
  GenerateFailureResult<JavaGeneratorFailureCode>;
export type JavaGenerateResult =
  GenerateSuccessResult<string> | JavaGenerateFailureResult;
