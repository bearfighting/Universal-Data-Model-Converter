import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export interface RustParseOptions extends ParseOptions {
  entry?: string;
}

export interface ResolvedRustParseOptions {
  name: string;
  entry?: string;
}

export const DEFAULT_RUST_PARSE_OPTIONS: ResolvedRustParseOptions = {
  name: "RustDocument",
};

export function resolveRustParseOptions(
  options: RustParseOptions = {},
): ResolvedRustParseOptions {
  return {
    name: options.name ?? DEFAULT_RUST_PARSE_OPTIONS.name,
    ...(options.entry ? { entry: options.entry } : {}),
  };
}

export function validateRustParseOptions(
  options: ResolvedRustParseOptions,
): string[] {
  return options.name.trim().length === 0 ? ["name must not be empty."] : [];
}

export function prepareRustParseOptions(
  options: RustParseOptions = {},
): PreparedOptions<ResolvedRustParseOptions> {
  const resolved = resolveRustParseOptions(options);
  return { resolved, warnings: [], errors: validateRustParseOptions(resolved) };
}

export function assertSupportedRustParseOptions(
  options: ResolvedRustParseOptions,
): void {
  const errors = validateRustParseOptions(options);
  if (errors.length > 0)
    throw new Error(`Invalid Rust parser options: ${errors.join("; ")}`);
}
