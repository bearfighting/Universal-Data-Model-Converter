import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface GoGeneratorOptions extends GenerateOptions {
  packageName?: string;
  emitJsonTags?: boolean;
}
export interface ResolvedGoGeneratorOptions {
  packageName: string;
  emitJsonTags: boolean;
}
export const DEFAULT_GO_GENERATOR_OPTIONS: ResolvedGoGeneratorOptions = {
  packageName: "models",
  emitJsonTags: true,
};
export function resolveGoGeneratorOptions(
  options: GoGeneratorOptions = {},
): ResolvedGoGeneratorOptions {
  return {
    packageName: options.packageName ?? "models",
    emitJsonTags: options.emitJsonTags ?? true,
  };
}
export function validateGoGeneratorOptions(
  options: ResolvedGoGeneratorOptions,
): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(options.packageName))
    errors.push("packageName must be a valid Go identifier.");
  if (GO_KEYWORDS.has(options.packageName))
    errors.push("packageName must not be a Go keyword.");
  return errors;
}
export function prepareGoGeneratorOptions(
  options: GoGeneratorOptions = {},
): PreparedOptions<ResolvedGoGeneratorOptions> {
  const resolved = resolveGoGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateGoGeneratorOptions(resolved),
  };
}
export function assertSupportedGoGeneratorOptions(
  options: ResolvedGoGeneratorOptions,
): void {
  const errors = validateGoGeneratorOptions(options);
  if (errors.length)
    throw new Error(`Invalid Go generator options: ${errors.join("; ")}`);
}
const GO_KEYWORDS = new Set([
  "break",
  "default",
  "func",
  "interface",
  "select",
  "case",
  "defer",
  "go",
  "map",
  "struct",
  "chan",
  "else",
  "goto",
  "package",
  "switch",
  "const",
  "fallthrough",
  "if",
  "range",
  "type",
  "continue",
  "for",
  "import",
  "return",
  "var",
]);
