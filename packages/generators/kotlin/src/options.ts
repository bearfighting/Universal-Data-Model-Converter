import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
import { KotlinGenerationError } from "./failure.js";
export interface KotlinGeneratorOptions extends GenerateOptions {
  packageName?: string;
  declarationStyle?: "data-class" | "class";
  propertyStyle?: "val" | "var";
}
export interface ResolvedKotlinGeneratorOptions {
  packageName?: string;
  declarationStyle: "data-class" | "class";
  propertyStyle: "val" | "var";
}
export const DEFAULT_KOTLIN_GENERATOR_OPTIONS: ResolvedKotlinGeneratorOptions =
  { declarationStyle: "data-class", propertyStyle: "val" };
export function resolveKotlinGeneratorOptions(
  options: KotlinGeneratorOptions = {},
): ResolvedKotlinGeneratorOptions {
  return {
    declarationStyle: options.declarationStyle ?? "data-class",
    propertyStyle: options.propertyStyle ?? "val",
    ...(options.packageName !== undefined
      ? { packageName: options.packageName }
      : {}),
  };
}
export function validateKotlinGeneratorOptions(
  options: ResolvedKotlinGeneratorOptions,
): string[] {
  const errors: string[] = [];
  if (!["data-class", "class"].includes(options.declarationStyle))
    errors.push('declarationStyle must be "data-class" or "class".');
  if (!["val", "var"].includes(options.propertyStyle))
    errors.push('propertyStyle must be "val" or "var".');
  if (
    options.packageName !== undefined &&
    (!options.packageName ||
      options.packageName
        .split(".")
        .some(
          (segment) => !isIdentifier(segment) || KOTLIN_KEYWORDS.has(segment),
        ))
  )
    errors.push("packageName must be a dot-separated Kotlin package name.");
  return errors;
}
export function prepareKotlinGeneratorOptions(
  options: KotlinGeneratorOptions = {},
): PreparedOptions<ResolvedKotlinGeneratorOptions> {
  const resolved = resolveKotlinGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateKotlinGeneratorOptions(resolved),
  };
}
export function assertSupportedKotlinGeneratorOptions(
  options: ResolvedKotlinGeneratorOptions,
): void {
  const errors = validateKotlinGeneratorOptions(options);
  if (errors.length) {
    const code =
      options.packageName !== undefined &&
      (!options.packageName ||
        options.packageName
          .split(".")
          .some(
            (segment) => !isIdentifier(segment) || KOTLIN_KEYWORDS.has(segment),
          ))
        ? "invalid-kotlin-package"
        : !["data-class", "class"].includes(options.declarationStyle)
          ? "invalid-kotlin-declaration-style"
          : "invalid-kotlin-property-style";
    throw new KotlinGenerationError(
      code,
      `Invalid Kotlin generator options: ${errors.join("; ")}`,
    );
  }
}
export const KOTLIN_KEYWORDS = new Set([
  "as",
  "break",
  "class",
  "continue",
  "do",
  "else",
  "false",
  "for",
  "fun",
  "if",
  "in",
  "interface",
  "is",
  "null",
  "object",
  "package",
  "return",
  "super",
  "this",
  "throw",
  "true",
  "try",
  "typealias",
  "typeof",
  "val",
  "var",
  "when",
  "while",
  "by",
  "catch",
  "constructor",
  "delegate",
  "dynamic",
  "field",
  "file",
  "finally",
  "get",
  "import",
  "init",
  "param",
  "property",
  "receiver",
  "set",
  "setparam",
  "where",
  "actual",
  "abstract",
  "annotation",
  "companion",
  "const",
  "crossinline",
  "data",
  "enum",
  "expect",
  "external",
  "final",
  "infix",
  "inline",
  "inner",
  "internal",
  "lateinit",
  "noinline",
  "open",
  "operator",
  "out",
  "override",
  "private",
  "protected",
  "public",
  "reified",
  "sealed",
  "suspend",
  "tailrec",
  "vararg",
  "by",
  "field",
  "it",
  "get",
  "set",
]);
export function isIdentifier(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value);
}
export function kotlinIdentifier(value: string): string {
  if (!isIdentifier(value))
    throw new KotlinGenerationError(
      "invalid-kotlin-identifier",
      `"${value}" is not a valid Kotlin identifier.`,
    );
  return KOTLIN_KEYWORDS.has(value) ? `\`${value}\`` : value;
}
