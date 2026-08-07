import type { ValueDocument } from "@schema-transformation-toolkit/core";
import type { GenerateResult } from "@schema-transformation-toolkit/core";
import {
  tryValidateValueDocument,
  valueNodeToJsonCompatible,
} from "@schema-transformation-toolkit/core/internal";

export type JsonOutput = string;

export function generateJson(document: ValueDocument): JsonOutput {
  const result = tryGenerateJson(document);
  if (!result.ok) {
    throw new Error(
      `JSON generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateJson(
  document: ValueDocument,
): GenerateResult<JsonOutput> {
  const validation = tryValidateValueDocument(document);
  if (!validation.ok) {
    const firstDiagnostic = validation.diagnostics[0];
    return {
      ok: false,
      code: firstDiagnostic?.code ?? "invalid-generator-input",
      message: firstDiagnostic?.message ?? "The Value IR is invalid.",
      diagnostics: validation.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        source: "generator-json",
      })),
    };
  }

  return {
    ok: true,
    output: JSON.stringify(valueNodeToJsonCompatible(document.root)),
  };
}
