import type {
  ConfiguredParser,
  ParseOptions,
  PreparedOptions,
  SchemaParser,
} from "@schema-transformation-toolkit/core";
import type { ZodInferenceResult } from "./api.js";

export interface ZodParseOptions extends ParseOptions {
  entry?: string;
}

export interface ResolvedZodParseOptions {
  name: string;
  entry?: string;
}

export const DEFAULT_ZOD_PARSE_OPTIONS: ResolvedZodParseOptions = {
  name: "ZodDocument",
};

export function resolveZodParseOptions(
  options: ZodParseOptions = {},
): ResolvedZodParseOptions {
  return {
    name: options.name ?? DEFAULT_ZOD_PARSE_OPTIONS.name,
    ...(options.entry ? { entry: options.entry } : {}),
  };
}

export function validateZodParseOptions(
  options: ResolvedZodParseOptions,
): string[] {
  return options.name.trim().length === 0 ? ["name must not be empty."] : [];
}

export function assertSupportedZodParseOptions(
  options: ResolvedZodParseOptions,
): void {
  const errors = validateZodParseOptions(options);
  if (errors.length > 0)
    throw new Error(`Invalid Zod parser options: ${errors.join("; ")}`);
}

export function prepareZodParseOptions(
  options: ZodParseOptions = {},
): PreparedOptions<ResolvedZodParseOptions> {
  const resolved = resolveZodParseOptions(options);
  return { resolved, warnings: [], errors: validateZodParseOptions(resolved) };
}

export function createZodParser(
  parseWithOptions: (
    input: string,
    options: ResolvedZodParseOptions,
  ) => ZodInferenceResult,
  options: ZodParseOptions = {},
): SchemaParser<string, ZodParseOptions, ZodInferenceResult> {
  return {
    format: "zod",
    parse(input, runtimeOptions) {
      return parseWithOptions(
        input,
        resolveZodParseOptions({ ...options, ...runtimeOptions }),
      );
    },
  };
}

export function configureZodParser(
  parseWithOptions: (
    input: string,
    options: ResolvedZodParseOptions,
  ) => ZodInferenceResult,
  options: ZodParseOptions = {},
): ConfiguredParser<
  SchemaParser<string, ZodParseOptions, ZodInferenceResult>,
  ResolvedZodParseOptions
> {
  const prepared = prepareZodParseOptions(options);
  if (prepared.errors.length > 0)
    throw new Error(
      `Invalid Zod parser options: ${prepared.errors.join("; ")}`,
    );
  return { prepared, parser: createZodParser(parseWithOptions, options) };
}
