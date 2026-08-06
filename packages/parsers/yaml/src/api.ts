import type {
  ConstraintDocument,
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import {
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryParseJsonValueDocumentWithOptions,
} from "@schema-transformation-toolkit/parser-json";
import { isAlias, isMap, isScalar, isSeq, parseAllDocuments } from "yaml";
import type { ParsedNode } from "yaml";
import type { YamlParseOptions } from "./options.js";

export interface YamlParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
  constraints?: ConstraintDocument;
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

const parserSource = "parser-yaml";

function diagnostic(
  code: string,
  message: string,
  evidence?: unknown,
): SchemaDiagnostic {
  return {
    severity: "error",
    code,
    message,
    source: parserSource,
    ...(evidence === undefined ? {} : { evidence }),
  };
}

function failure(
  code: string,
  message: string,
  evidence?: unknown,
): YamlParseFailureResult {
  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic(code, message, evidence)],
  };
}

export function tryParseYamlDocument(
  input: string,
  options: YamlParseOptions = {},
): YamlParseResult {
  return tryParseYamlDocumentInternal(input, options, true) as YamlParseResult;
}

export function tryParseYamlValueDocument(
  input: string,
  options: YamlParseOptions = {},
): YamlValueParseResult {
  return tryParseYamlDocumentInternal(
    input,
    options,
    false,
  ) as YamlValueParseResult;
}

function tryParseYamlDocumentInternal(
  input: string,
  options: YamlParseOptions,
  inferShape: boolean,
): YamlParseResult | YamlValueParseResult {
  let documents;
  try {
    documents = parseAllDocuments(input, {
      schema: "core",
      version: "1.2",
      uniqueKeys: true,
      merge: false,
      resolveKnownTags: false,
      prettyErrors: true,
    });
  } catch (error) {
    return failure(
      "invalid-yaml",
      `The YAML input could not be parsed: ${errorMessage(error)}`,
    );
  }

  if (documents.length === 0) {
    return failure("yaml-empty-document", "The YAML input is empty.");
  }
  if (documents.length !== 1) {
    return failure(
      "yaml-multiple-documents",
      "The YAML input must contain exactly one document.",
    );
  }

  const document = documents[0];
  if (!document) {
    return failure("yaml-empty-document", "The YAML input is empty.");
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
    return failure(code, parseError.message, parseError.pos);
  }
  const warning = document.warnings[0];
  if (warning) {
    const code =
      warning.code === "TAG_RESOLVE_FAILED"
        ? "yaml-unsupported-tag"
        : "invalid-yaml";
    return failure(code, warning.message, warning.pos);
  }

  const nodeFailure = inspectYamlNode(document.contents, false);
  if (nodeFailure) return nodeFailure;

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0, mapAsMap: false });
  } catch (error) {
    const message = errorMessage(error);
    return failure(
      message.toLowerCase().includes("alias")
        ? "yaml-cyclic-alias"
        : "yaml-non-json-value",
      `The YAML value is not supported: ${message}`,
    );
  }

  const valueResult = tryParseJsonValueDocumentWithOptions(
    JSON.stringify(value),
    { name: options.name ?? "YamlDocument" },
  );
  if (!valueResult.ok) {
    return failure(
      "yaml-non-json-value",
      `The YAML value is not JSON-compatible: ${valueResult.message}`,
    );
  }

  if (!inferShape) {
    return {
      ok: true,
      document: valueResult.document,
    };
  }

  const shapeResult = tryInferJsonDocumentFromValueDocumentWithOptions(
    valueResult.document,
    { name: options.name ?? "YamlDocument" },
  );
  if (!shapeResult.ok) return shapeResult;

  return {
    ok: true,
    value: valueResult.document,
    document: shapeResult.document,
    ...(shapeResult.diagnostics
      ? { diagnostics: shapeResult.diagnostics }
      : {}),
  };
}

export const tryInferYamlDocument = tryParseYamlDocument;

function inspectYamlNode(
  node: ParsedNode | null | undefined,
  inMapKey: boolean,
): YamlParseFailureResult | undefined {
  if (!node) return undefined;
  if (node.tag) {
    return failure(
      "yaml-unsupported-tag",
      "Explicit YAML tags are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }
  if (isAlias(node)) {
    return failure(
      "yaml-unsupported-alias",
      "YAML aliases are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }
  if ("anchor" in node && node.anchor) {
    return failure(
      "yaml-unsupported-anchor",
      "YAML anchors are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      const key = pair.key;
      if (isScalar(key) && key.value === "<<") {
        return failure(
          "yaml-unsupported-merge",
          "YAML merge keys are outside the strict JSON-compatible YAML profile.",
          key.range,
        );
      }
      if (!isScalar(key) || typeof key.value !== "string") {
        return failure(
          "yaml-non-string-key",
          "YAML mapping keys must be strings.",
          key?.range,
        );
      }
      const keyFailure = inspectYamlNode(key, true);
      if (keyFailure) return keyFailure;
      const valueFailure = inspectYamlNode(pair.value, false);
      if (valueFailure) return valueFailure;
    }
    return undefined;
  }
  if (isSeq(node)) {
    for (const item of node.items) {
      const itemFailure = inspectYamlNode(item, false);
      if (itemFailure) return itemFailure;
    }
    return undefined;
  }
  if (inMapKey && typeof node.value !== "string") {
    return failure(
      "yaml-non-string-key",
      "YAML mapping keys must be strings.",
      node.range,
    );
  }
  if (
    isScalar(node) &&
    node.value !== null &&
    typeof node.value !== "string" &&
    typeof node.value !== "number" &&
    typeof node.value !== "boolean"
  ) {
    return failure(
      "yaml-non-json-value",
      "The YAML scalar is not JSON-compatible.",
      node.range,
    );
  }
  if (
    isScalar(node) &&
    typeof node.value === "number" &&
    !Number.isFinite(node.value)
  ) {
    return failure(
      "yaml-non-json-value",
      "The YAML number is not JSON-compatible.",
      node.range,
    );
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
