import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";

export type PythonGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-python-root"
  | "unsupported-python-node"
  | "invalid-python-identifier";
export type PythonGenerateResult =
  | GenerateSuccessResult<string>
  | GenerateFailureResult<PythonGeneratorFailureCode>;

export class PythonGenerationError extends Error {
  constructor(
    readonly code: PythonGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "PythonGenerationError";
  }
}
