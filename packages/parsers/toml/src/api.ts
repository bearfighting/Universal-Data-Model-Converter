import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { classifyTomlParseError, tomlFailure } from "./errors.js";
import { lowerTomlValue } from "./lower.js";
import { parseTomlDocument } from "./parse.js";
import { inferTomlShape } from "./profile.js";
import type { TomlParseOptions } from "./options.js";

export interface TomlParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type TomlParseFailureResult = ParseFailureResult<string>;
export type TomlParseResult = TomlParseSuccessResult | TomlParseFailureResult;

export interface TomlValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type TomlValueParseResult =
  TomlValueParseSuccessResult | TomlParseFailureResult;

export function tryParseTomlDocument(
  input: string,
  options: TomlParseOptions = {},
): TomlParseResult {
  const valueResult = parseAndLower(input, options.name ?? "TomlDocument");
  return inferTomlShape(valueResult);
}

export function tryParseTomlValueDocument(
  input: string,
  options: TomlParseOptions = {},
): TomlValueParseResult {
  return parseAndLower(input, options.name ?? "TomlDocument");
}

export const tryInferTomlDocument = tryParseTomlDocument;

function parseAndLower(input: string, name: string): TomlValueParseResult {
  let parsed: unknown;
  try {
    parsed = parseTomlDocument(input);
  } catch (error) {
    const classified = classifyTomlParseError(error);
    return tomlFailure(
      classified.code,
      `The TOML input could not be parsed: ${classified.message}`,
      classified.evidence,
    );
  }

  return lowerTomlValue(name, parsed);
}
