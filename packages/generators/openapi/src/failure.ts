import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";
import type { OpenApiOutput } from "./options.js";

export type OpenApiGeneratorFailureCode =
  "openapi-definition-name-conflict" | "openapi-schema-generation-failed";

export type OpenApiGenerateFailureResult =
  GenerateFailureResult<OpenApiGeneratorFailureCode>;

export type OpenApiGenerateResult =
  GenerateSuccessResult<OpenApiOutput> | OpenApiGenerateFailureResult;
