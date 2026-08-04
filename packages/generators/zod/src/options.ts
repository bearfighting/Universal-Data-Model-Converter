import type {
  ConstraintDocument,
  ConfiguredGenerator,
  GenerateOptions,
  NamingStrategy,
  PreparedOptions,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import type { ZodGenerateResult } from "./failure.js";
import { createZodNamingStrategy } from "./naming.js";

export type ZodOutputLanguage = "typescript" | "javascript";

export interface ZodGeneratorOptions extends GenerateOptions {
  outputLanguage?: ZodOutputLanguage;
  namingStrategy?: NamingStrategy;
  constraints?: ConstraintDocument;
}

export interface ResolvedZodGeneratorOptions {
  outputLanguage: ZodOutputLanguage;
  namingStrategy: NamingStrategy;
  constraints?: ConstraintDocument;
}

export const DEFAULT_ZOD_GENERATOR_OPTIONS: ResolvedZodGeneratorOptions = {
  outputLanguage: "typescript",
  namingStrategy: createZodNamingStrategy(),
};

export function resolveZodGeneratorOptions(
  options: ZodGeneratorOptions = {},
): ResolvedZodGeneratorOptions {
  return {
    outputLanguage:
      options.outputLanguage ?? DEFAULT_ZOD_GENERATOR_OPTIONS.outputLanguage,
    namingStrategy:
      options.namingStrategy ?? DEFAULT_ZOD_GENERATOR_OPTIONS.namingStrategy,
    ...(options.constraints ? { constraints: options.constraints } : {}),
  };
}

export function prepareZodGeneratorOptions(
  options: ZodGeneratorOptions = {},
): PreparedOptions<ResolvedZodGeneratorOptions> {
  const resolved = resolveZodGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateZodGeneratorOptions(resolved),
  };
}

export function validateZodGeneratorOptions(
  options: ResolvedZodGeneratorOptions,
): string[] {
  const errors: string[] = [];
  if (
    options.outputLanguage !== "typescript" &&
    options.outputLanguage !== "javascript"
  ) {
    errors.push('outputLanguage must be "typescript" or "javascript".');
  }
  if (
    typeof options.namingStrategy.renderTypeName !== "function" ||
    typeof options.namingStrategy.renderFieldName !== "function"
  ) {
    errors.push(
      "namingStrategy must provide renderTypeName() and renderFieldName().",
    );
  }
  return errors;
}

export type ConfiguredZodGenerator = ConfiguredGenerator<
  SchemaGenerator<string, ZodGeneratorOptions, ZodGenerateResult>,
  ResolvedZodGeneratorOptions
>;
