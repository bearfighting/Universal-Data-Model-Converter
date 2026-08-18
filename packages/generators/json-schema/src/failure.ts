import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
import type { JsonSchemaOutput } from "./options.js";

export type JsonSchemaGeneratorFailureCode =
  | "invalid-schema-document"
  | "invalid-json-schema-reference"
  | "invalid-record-key"
  | "invalid-numeric-constraint"
  | "unsupported-decimal-constraint"
  | "unsupported-node-kind";

export type JsonSchemaGenerateFailureResult =
  GenerateFailureResult<JsonSchemaGeneratorFailureCode>;

export type JsonSchemaGenerateResult =
  GenerateSuccessResult<JsonSchemaOutput> | JsonSchemaGenerateFailureResult;
