import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export type PythonGeneratorOptions = GenerateOptions;
export type ResolvedPythonGeneratorOptions = Record<string, never>;
export const DEFAULT_PYTHON_GENERATOR_OPTIONS: ResolvedPythonGeneratorOptions =
  {};

export function resolvePythonGeneratorOptions(
  _options: PythonGeneratorOptions = {},
): ResolvedPythonGeneratorOptions {
  void _options;
  return DEFAULT_PYTHON_GENERATOR_OPTIONS;
}

export function validatePythonGeneratorOptions(
  _options: ResolvedPythonGeneratorOptions,
): string[] {
  void _options;
  return [];
}

export function preparePythonGeneratorOptions(
  options: PythonGeneratorOptions = {},
): PreparedOptions<ResolvedPythonGeneratorOptions> {
  const resolved = resolvePythonGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validatePythonGeneratorOptions(resolved),
  };
}
