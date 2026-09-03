import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { parseJavaSyntax } from "./syntax.js";
import { mapJavaFile } from "./semantic.js";
import {
  JavaSemanticError,
  JavaSyntaxError,
  type JavaPosition,
} from "./failure.js";
import {
  assertSupportedJavaParseOptions,
  prepareJavaParseOptions,
  resolveJavaParseOptions,
  type JavaParseOptions,
} from "./options.js";
import type {
  JavaParseFailureResult,
  JavaParserFailureCode,
} from "./failure.js";

export interface JavaParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type JavaParseResult = JavaParseSuccessResult | JavaParseFailureResult;

export function tryParseJava(
  input: string,
  options: JavaParseOptions = {},
): JavaParseResult {
  const resolved = resolveJavaParseOptions(options);
  try {
    assertSupportedJavaParseOptions(resolved);
    const result = mapJavaFile(
      parseJavaSyntax(input),
      resolved.name,
      resolved.entry,
    );
    return {
      ok: true,
      document: result.document,
      ...(result.semanticNotes.length
        ? { semanticNotes: result.semanticNotes }
        : {}),
    };
  } catch (error) {
    return javaFailure(error, input);
  }
}

export function parseJava(
  input: string,
  options: JavaParseOptions = {},
): SchemaDocument {
  const result = tryParseJava(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}

export const javaParser = {
  format: "java" as const,
  parse(input: string, options: JavaParseOptions = {}) {
    return tryParseJava(input, options);
  },
};

export const preparedJavaParserOptions = prepareJavaParseOptions();

function javaFailure(error: unknown, input: string): JavaParseFailureResult {
  const syntax = error instanceof JavaSyntaxError ? error : undefined;
  const semantic = error instanceof JavaSemanticError ? error : undefined;
  const code = semantic?.code ?? syntax?.code ?? "unsupported-java-parser-v1";
  const message =
    error instanceof Error ? error.message : "Java parser failed.";
  return {
    ok: false,
    code: code as JavaParserFailureCode,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-java",
        ...((syntax?.position ?? semantic?.position)
          ? {
              evidence: {
                position: syntax?.position ?? semantic?.position,
                sourceLength: input.length,
              },
            }
          : {}),
      },
    ],
  };
}

export type { JavaPosition };
