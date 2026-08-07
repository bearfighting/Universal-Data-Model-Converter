import { stringify } from "smol-toml";
import type {
  GenerateResult,
  SchemaDiagnostic,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { validateTomlValue } from "./validate.js";
import type { TomlGeneratorOptions } from "./options.js";

export type TomlOutput = string;

export function generateToml(
  document: ValueDocument,
  options: TomlGeneratorOptions = {},
): TomlOutput {
  const result = tryGenerateToml(document, options);
  if (!result.ok) {
    throw new Error(
      `TOML generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateToml(
  document: ValueDocument,
  options: TomlGeneratorOptions = {},
): GenerateResult<TomlOutput> {
  const validation = validateTomlValue(document, options);
  if (!validation.ok) {
    const diagnostic: SchemaDiagnostic = {
      severity: "error",
      code: validation.code,
      message: validation.message,
      source: "generator-toml",
    };
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
      diagnostics: [diagnostic],
    };
  }

  try {
    return { ok: true, output: stringify(validation.value) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: "toml-unsupported-value",
      message: `The Value IR could not be represented as TOML: ${message}`,
      diagnostics: [
        {
          severity: "error",
          code: "toml-unsupported-value",
          message: `The Value IR could not be represented as TOML: ${message}`,
          source: "generator-toml",
        },
      ],
    };
  }
}
