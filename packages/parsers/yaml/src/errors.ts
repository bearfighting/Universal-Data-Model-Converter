import type {
  ParseFailureResult,
  SchemaDiagnostic,
} from "@schema-transformation-toolkit/core";

export const yamlParserSource = "parser-yaml";

export function yamlFailure(
  code: string,
  message: string,
  evidence?: unknown,
): ParseFailureResult<string> {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    source: yamlParserSource,
    ...(evidence === undefined ? {} : { evidence }),
  };

  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic],
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
