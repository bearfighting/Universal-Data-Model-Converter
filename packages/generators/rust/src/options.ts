import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export type RustGeneratorOptions = GenerateOptions;
export type ResolvedRustGeneratorOptions = Record<string, never>;

export const DEFAULT_RUST_GENERATOR_OPTIONS: ResolvedRustGeneratorOptions = {};

export function resolveRustGeneratorOptions(
  _options: RustGeneratorOptions = {},
): ResolvedRustGeneratorOptions {
  void _options;
  return DEFAULT_RUST_GENERATOR_OPTIONS;
}

export function validateRustGeneratorOptions(
  _options: ResolvedRustGeneratorOptions,
): string[] {
  void _options;
  return [];
}

export function prepareRustGeneratorOptions(
  options: RustGeneratorOptions = {},
): PreparedOptions<ResolvedRustGeneratorOptions> {
  const resolved = resolveRustGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateRustGeneratorOptions(resolved),
  };
}
