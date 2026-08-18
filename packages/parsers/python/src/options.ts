import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export interface PythonParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedPythonParseOptions {
  name: string;
  entry?: string;
}
export const DEFAULT_PYTHON_PARSE_OPTIONS: ResolvedPythonParseOptions = {
  name: "PythonDocument",
};

export function resolvePythonParseOptions(
  options: PythonParseOptions = {},
): ResolvedPythonParseOptions {
  return {
    name: options.name ?? DEFAULT_PYTHON_PARSE_OPTIONS.name,
    ...(options.entry ? { entry: options.entry } : {}),
  };
}
export function validatePythonParseOptions(
  options: ResolvedPythonParseOptions,
): string[] {
  return options.name.trim().length === 0 ? ["name must not be empty."] : [];
}
export function preparePythonParseOptions(
  options: PythonParseOptions = {},
): PreparedOptions<ResolvedPythonParseOptions> {
  const resolved = resolvePythonParseOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validatePythonParseOptions(resolved),
  };
}
export function assertSupportedPythonParseOptions(
  options: ResolvedPythonParseOptions,
): void {
  const errors = validatePythonParseOptions(options);
  if (errors.length)
    throw new Error(`Invalid Python parser options: ${errors.join("; ")}`);
}
