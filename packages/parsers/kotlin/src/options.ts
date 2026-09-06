import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
import { KotlinOptionsError } from "./failure.js";

export interface KotlinParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedKotlinParseOptions {
  name: string;
  entry?: string;
}
export const DEFAULT_KOTLIN_PARSE_OPTIONS: ResolvedKotlinParseOptions = {
  name: "KotlinDocument",
};

export function resolveKotlinParseOptions(
  options: KotlinParseOptions = {},
): ResolvedKotlinParseOptions {
  return {
    name: options.name ?? DEFAULT_KOTLIN_PARSE_OPTIONS.name,
    ...(options.entry !== undefined ? { entry: options.entry } : {}),
  };
}
export function validateKotlinParseOptions(
  options: ResolvedKotlinParseOptions,
): string[] {
  return options.name.trim() ? [] : ["name must not be empty."];
}
export function prepareKotlinParseOptions(
  options: KotlinParseOptions = {},
): PreparedOptions<ResolvedKotlinParseOptions> {
  const resolved = resolveKotlinParseOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateKotlinParseOptions(resolved),
  };
}
export function assertSupportedKotlinParseOptions(
  options: ResolvedKotlinParseOptions,
): void {
  const errors = validateKotlinParseOptions(options);
  if (errors.length)
    throw new KotlinOptionsError(
      `Invalid Kotlin parser options: ${errors.join("; ")}`,
    );
}
