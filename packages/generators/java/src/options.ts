import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
import { JavaGenerationError } from "./failure.js";

export interface JavaGeneratorOptions extends GenerateOptions {
  rootVisibility?: "public" | "package-private";
  packageName?: string;
  declarationStyle?: "record" | "class";
}

export interface ResolvedJavaGeneratorOptions {
  rootVisibility: "public" | "package-private";
  packageName?: string;
  declarationStyle: "record" | "class";
}

export const DEFAULT_JAVA_GENERATOR_OPTIONS: ResolvedJavaGeneratorOptions = {
  rootVisibility: "public",
  declarationStyle: "record",
};

export function resolveJavaGeneratorOptions(
  options: JavaGeneratorOptions = {},
): ResolvedJavaGeneratorOptions {
  return {
    rootVisibility: options.rootVisibility ?? "public",
    declarationStyle: options.declarationStyle ?? "record",
    ...(options.packageName !== undefined
      ? { packageName: options.packageName }
      : {}),
  };
}

export function validateJavaGeneratorOptions(
  options: ResolvedJavaGeneratorOptions,
): string[] {
  const errors: string[] = [];
  if (
    options.rootVisibility !== "public" &&
    options.rootVisibility !== "package-private"
  )
    errors.push('rootVisibility must be "public" or "package-private".');
  if (
    options.declarationStyle !== "record" &&
    options.declarationStyle !== "class"
  )
    errors.push('declarationStyle must be "record" or "class".');
  if (options.packageName !== undefined) {
    const segments = options.packageName.split(".");
    if (
      !options.packageName ||
      segments.some(
        (segment) =>
          !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment) ||
          JAVA_KEYWORDS.has(segment),
      )
    )
      errors.push("packageName must be a dot-separated Java package name.");
  }
  return errors;
}

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
  "record",
  "sealed",
  "permits",
  "var",
  "true",
  "false",
  "null",
  "_",
]);

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
  if (errors.length) {
    const code =
      options.packageName !== undefined &&
      (options.packageName.length === 0 ||
        options.packageName
          .split(".")
          .some(
            (segment) =>
              !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment) ||
              JAVA_KEYWORDS.has(segment),
          ))
        ? "invalid-java-package"
        : options.declarationStyle !== "record" &&
            options.declarationStyle !== "class"
          ? "invalid-java-declaration-style"
          : "invalid-java-visibility";
    throw new JavaGenerationError(
      code,
      `Invalid Java generator options: ${errors.join("; ")}`,
    );
  }
}
