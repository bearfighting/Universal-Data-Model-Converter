import type {
  ConfiguredGenerator,
  ConstraintDocument,
  GenerateOptions,
  PreparedOptions,
  SchemaGenerator,
} from "@aio/core";
import type { OpenApiGenerateResult } from "./failure.js";

export type OpenApiOutput = Record<string, unknown>;

export interface OpenApiGeneratorOptions extends GenerateOptions {
  constraints?: ConstraintDocument;
}

export interface ResolvedOpenApiGeneratorOptions {
  constraints?: ConstraintDocument;
}

export const DEFAULT_OPENAPI_GENERATOR_OPTIONS: ResolvedOpenApiGeneratorOptions =
  {};

export function resolveOpenApiGeneratorOptions(
  options: OpenApiGeneratorOptions = {},
): ResolvedOpenApiGeneratorOptions {
  return options.constraints
    ? { constraints: options.constraints }
    : DEFAULT_OPENAPI_GENERATOR_OPTIONS;
}

export function prepareOpenApiGeneratorOptions(
  options: OpenApiGeneratorOptions = {},
): PreparedOptions<ResolvedOpenApiGeneratorOptions> {
  const resolved = resolveOpenApiGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: [],
  };
}

export function validateOpenApiGeneratorOptions(
  _options: ResolvedOpenApiGeneratorOptions,
): string[] {
  void _options;
  return [];
}

export type ConfiguredOpenApiGenerator = ConfiguredGenerator<
  SchemaGenerator<
    OpenApiOutput,
    OpenApiGeneratorOptions,
    OpenApiGenerateResult
  >,
  ResolvedOpenApiGeneratorOptions
>;
