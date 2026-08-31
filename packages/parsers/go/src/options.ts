import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface GoParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedGoParseOptions {
  name: string;
  entry?: string;
}
export const DEFAULT_GO_PARSE_OPTIONS: ResolvedGoParseOptions = {
  name: "GoDocument",
};
export function resolveGoParseOptions(
  options: GoParseOptions = {},
): ResolvedGoParseOptions {
  return {
    name: options.name ?? DEFAULT_GO_PARSE_OPTIONS.name,
    ...(options.entry ? { entry: options.entry } : {}),
  };
}
export function validateGoParseOptions(
  options: ResolvedGoParseOptions,
): string[] {
  return options.name.trim() ? [] : ["name must not be empty."];
}
export function prepareGoParseOptions(
  options: GoParseOptions = {},
): PreparedOptions<ResolvedGoParseOptions> {
  const resolved = resolveGoParseOptions(options);
  return { resolved, warnings: [], errors: validateGoParseOptions(resolved) };
}
export function assertSupportedGoParseOptions(
  options: ResolvedGoParseOptions,
): void {
  const errors = validateGoParseOptions(options);
  if (errors.length)
    throw new Error(`Invalid Go parser options: ${errors.join("; ")}`);
}
