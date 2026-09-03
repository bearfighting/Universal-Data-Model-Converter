import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export interface JavaGeneratorOptions extends GenerateOptions {
  rootVisibility?: "public" | "package-private";
}

export interface ResolvedJavaGeneratorOptions {
  rootVisibility: "public" | "package-private";
}

export const DEFAULT_JAVA_GENERATOR_OPTIONS: ResolvedJavaGeneratorOptions = {
  rootVisibility: "public",
};

export function resolveJavaGeneratorOptions(
  options: JavaGeneratorOptions = {},
): ResolvedJavaGeneratorOptions {
  return { rootVisibility: options.rootVisibility ?? "public" };
}

export function validateJavaGeneratorOptions(
  options: ResolvedJavaGeneratorOptions,
): string[] {
  return options.rootVisibility === "public" ||
    options.rootVisibility === "package-private"
    ? []
    : ['rootVisibility must be "public" or "package-private".'];
}

export function prepareJavaGeneratorOptions(
  options: JavaGeneratorOptions = {},
): PreparedOptions<ResolvedJavaGeneratorOptions> {
  const resolved = resolveJavaGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateJavaGeneratorOptions(resolved),
  };
}

export function assertSupportedJavaGeneratorOptions(
  options: ResolvedJavaGeneratorOptions,
): void {
  const errors = validateJavaGeneratorOptions(options);
  if (errors.length)
    throw new Error(`Invalid Java generator options: ${errors.join("; ")}`);
}
