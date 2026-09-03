import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export interface JavaParseOptions extends ParseOptions {
  entry?: string;
}

export interface ResolvedJavaParseOptions {
  name: string;
  entry?: string;
}

export const DEFAULT_JAVA_PARSE_OPTIONS: ResolvedJavaParseOptions = {
  name: "JavaDocument",
};

export function resolveJavaParseOptions(
  options: JavaParseOptions = {},
): ResolvedJavaParseOptions {
  return {
    name: options.name ?? DEFAULT_JAVA_PARSE_OPTIONS.name,
    ...(options.entry ? { entry: options.entry } : {}),
  };
}

export function validateJavaParseOptions(
  options: ResolvedJavaParseOptions,
): string[] {
  return options.name.trim() ? [] : ["name must not be empty."];
}

export function prepareJavaParseOptions(
  options: JavaParseOptions = {},
): PreparedOptions<ResolvedJavaParseOptions> {
  const resolved = resolveJavaParseOptions(options);
  return { resolved, warnings: [], errors: validateJavaParseOptions(resolved) };
}

export function assertSupportedJavaParseOptions(
  options: ResolvedJavaParseOptions,
): void {
  const errors = validateJavaParseOptions(options);
  if (errors.length)
    throw new Error(`Invalid Java parser options: ${errors.join("; ")}`);
}
