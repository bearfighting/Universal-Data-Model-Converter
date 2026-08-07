import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { inferSchemaDocumentFromValueDocument } from "@schema-transformation-toolkit/core/internal";
import { parseAllDocuments } from "yaml";
import type { YamlParseOptions } from "./options.js";
import { errorMessage, yamlFailure } from "./errors.js";
import { lowerYamlDocument } from "./lower.js";
import { yamlProfile } from "./profile.js";
import { validateYamlProfile } from "./validate-profile.js";

export interface YamlParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type YamlParseFailureResult = ParseFailureResult<string>;
export type YamlParseResult = YamlParseSuccessResult | YamlParseFailureResult;

export interface YamlValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type YamlValueParseResult =
  YamlValueParseSuccessResult | YamlParseFailureResult;

export function tryParseYamlDocument(
  input: string,
  options: YamlParseOptions = {},
): YamlParseResult {
  const parsed = parseYamlDocument(input);
  if (!parsed.ok) return parsed;

  const value = lowerYamlDocument(
    options.name ?? "YamlDocument",
    parsed.document.contents,
  );
  let document: SchemaDocument;
  try {
    document = inferSchemaDocumentFromValueDocument(value);
  } catch (error) {
    return yamlFailure("unsupported-mixed-types", errorMessage(error));
  }

  return {
    ok: true,
    value,
    document,
  };
}

export function tryParseYamlValueDocument(
  input: string,
  options: YamlParseOptions = {},
): YamlValueParseResult {
  const parsed = parseYamlDocument(input);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    document: lowerYamlDocument(
      options.name ?? "YamlDocument",
      parsed.document.contents,
    ),
  };
}

export const tryInferYamlDocument = tryParseYamlDocument;

function parseYamlDocument(
  input: string,
):
  | { ok: true; document: ReturnType<typeof parseAllDocuments>[number] }
  | YamlParseFailureResult {
  let documents: ReturnType<typeof parseAllDocuments>;
  try {
    documents = parseAllDocuments(input, yamlProfile.parse);
  } catch (error) {
    return yamlFailure(
      "invalid-yaml",
      `The YAML input could not be parsed: ${errorMessage(error)}`,
    );
  }

  if (documents.length === 0) {
    return yamlFailure("yaml-empty-document", "The YAML input is empty.");
  }
  if (documents.length !== 1) {
    return yamlFailure(
      "yaml-multiple-documents",
      "The YAML input must contain exactly one document.",
    );
  }

  const document = documents[0];
  if (!document) {
    return yamlFailure("yaml-empty-document", "The YAML input is empty.");
  }

  const parseError = document.errors[0];
  if (parseError) {
    const code =
      parseError.code === "DUPLICATE_KEY"
        ? "yaml-duplicate-key"
        : parseError.code === "MULTIPLE_DOCS"
          ? "yaml-multiple-documents"
          : parseError.code === "NON_STRING_KEY"
            ? "yaml-non-string-key"
            : parseError.code === "BAD_ALIAS" ||
                parseError.code === "RESOURCE_EXHAUSTION"
              ? "yaml-unsupported-alias"
              : "invalid-yaml";
    return yamlFailure(code, parseError.message, parseError.pos);
  }

  const warning = document.warnings[0];
  if (warning) {
    const code =
      warning.code === "TAG_RESOLVE_FAILED"
        ? "yaml-unsupported-tag"
        : "invalid-yaml";
    return yamlFailure(code, warning.message, warning.pos);
  }

  const profileFailure = validateYamlProfile(document.contents);
  if (profileFailure) return profileFailure;

  return { ok: true, document };
}
