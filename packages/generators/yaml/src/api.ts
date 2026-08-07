import type {
  GenerateResult,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import {
  tryValidateValueDocument,
  valueNodeToJsonCompatible,
} from "@schema-transformation-toolkit/core/internal";
import { stringify } from "yaml";
import { yamlProfile } from "./profile.js";

export type YamlOutput = string;

export function generateYaml(document: ValueDocument): YamlOutput {
  const result = tryGenerateYaml(document);
  if (!result.ok) {
    throw new Error(
      `YAML generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateYaml(
  document: ValueDocument,
): GenerateResult<YamlOutput> {
  const validation = tryValidateValueDocument(document);
  if (!validation.ok) {
    const firstDiagnostic = validation.diagnostics[0];
    const code =
      firstDiagnostic?.code === "invalid-value-number"
        ? "yaml-non-json-value"
        : (firstDiagnostic?.code ?? "invalid-generator-input");
    const message = firstDiagnostic?.message ?? "The Value IR is invalid.";
    return {
      ok: false,
      code,
      message,
      diagnostics: validation.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        source: "generator-yaml",
        code:
          diagnostic.code === "invalid-value-number"
            ? "yaml-non-json-value"
            : diagnostic.code,
      })),
    };
  }

  try {
    return {
      ok: true,
      output: stringify(
        valueNodeToJsonCompatible(document.root),
        yamlProfile.stringify,
      ),
    };
  } catch (error) {
    const message = `The YAML value could not be serialized: ${errorMessage(error)}`;
    return {
      ok: false,
      code: "yaml-generation-failed",
      message,
      diagnostics: [
        {
          severity: "error",
          code: "yaml-generation-failed",
          message,
          source: "generator-yaml",
        },
      ],
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
