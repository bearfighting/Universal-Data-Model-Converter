import type { SchemaDocument } from "@aio/core";
import { tryGenerateJsonSchema } from "@aio/generator-json-schema";
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import type { OpenApiGenerateResult } from "./failure.js";
import {
  type ConfiguredOpenApiGenerator,
  DEFAULT_OPENAPI_GENERATOR_OPTIONS,
  type OpenApiGeneratorOptions,
  type OpenApiOutput,
  prepareOpenApiGeneratorOptions,
  resolveOpenApiGeneratorOptions,
  type ResolvedOpenApiGeneratorOptions,
} from "./options.js";

type JsonSchemaValue = JsonSchemaOutput | JsonSchemaValue[];

const defaultConfiguredOpenApiGenerator = configureOpenApiGenerator();

export function generateOpenApi(
  document: SchemaDocument,
  options: OpenApiGeneratorOptions = {},
): OpenApiOutput {
  const result = tryGenerateOpenApi(document, options);
  if (!result.ok)
    throw new Error(
      `OpenAPI generation failed [${result.code}]: ${result.message}`,
    );
  return result.output;
}

export function tryGenerateOpenApi(
  document: SchemaDocument,
  options: OpenApiGeneratorOptions = {},
): OpenApiGenerateResult {
  return renderOpenApiDocumentResult(
    document,
    resolveOpenApiGeneratorOptions(options),
  );
}

export function createOpenApiGenerator(
  options: OpenApiGeneratorOptions = {},
): ConfiguredOpenApiGenerator["generator"] {
  return configureOpenApiGenerator(options).generator;
}

export function configureOpenApiGenerator(
  options: OpenApiGeneratorOptions = {},
): ConfiguredOpenApiGenerator {
  const prepared = prepareOpenApiGeneratorOptions(options);
  if (prepared.errors.length > 0)
    throw new Error(
      `Invalid OpenAPI generator options: ${prepared.errors.join("; ")}`,
    );
  return {
    prepared,
    generator: {
      target: "openapi",
      generate(document, runtimeOptions) {
        return renderOpenApiDocumentResult(
          document,
          resolveOpenApiGeneratorOptions({ ...options, ...runtimeOptions }),
        );
      },
    },
  };
}

export const openApiGenerator = defaultConfiguredOpenApiGenerator.generator;
export const preparedOpenApiGeneratorOptions =
  defaultConfiguredOpenApiGenerator.prepared;
export { DEFAULT_OPENAPI_GENERATOR_OPTIONS };

function renderOpenApiDocumentResult(
  document: SchemaDocument,
  options: ResolvedOpenApiGeneratorOptions,
): OpenApiGenerateResult {
  const jsonSchemaResult = tryGenerateJsonSchema(document, {
    includeSchemaUri: true,
    ...(options.constraints ? { constraints: options.constraints } : {}),
  });

  if (!jsonSchemaResult.ok) {
    return {
      ok: false,
      code: "openapi-schema-generation-failed",
      message: `The JSON Schema adapter failed [${jsonSchemaResult.code}]: ${jsonSchemaResult.message}`,
      diagnostics: rewriteDiagnostics(jsonSchemaResult.diagnostics),
    };
  }

  const output = convertJsonSchemaToOpenApi(document, jsonSchemaResult.output);
  if (!output.ok) return output;

  return {
    ok: true,
    output: output.output,
    ...(jsonSchemaResult.diagnostics
      ? { diagnostics: rewriteDiagnostics(jsonSchemaResult.diagnostics) }
      : {}),
    ...(jsonSchemaResult.semanticNotes
      ? { semanticNotes: rewriteSemanticNotes(jsonSchemaResult.semanticNotes) }
      : {}),
  };
}

function convertJsonSchemaToOpenApi(
  document: SchemaDocument,
  generated: JsonSchemaOutput,
): OpenApiGenerateResult {
  const rootName = document.name.source;
  const rootAndDefinitions =
    typeof generated === "boolean"
      ? { root: generated, definitions: {} }
      : splitJsonSchemaDocument(generated);

  let rootSchema: JsonSchemaValue = rootAndDefinitions.root;
  const rootDefinition = rootAndDefinitions.definitions[rootName];
  if (rootDefinition !== undefined) {
    if (!isRecord(rootSchema) || rootSchema.$ref !== `#/$defs/${rootName}`)
      return {
        ok: false,
        code: "openapi-definition-name-conflict",
        message: `The OpenAPI root schema name "${rootName}" conflicts with a reusable definition.`,
      };
    rootSchema = rootDefinition;
  }

  const definitions = Object.entries(rootAndDefinitions.definitions)
    .filter(([name]) => name !== rootName)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, schema]) => [
      name,
      canonicalizeJsonValue(rewriteReferences(schema)),
    ]);
  const schemas = Object.fromEntries([
    ...definitions,
    [rootName, canonicalizeJsonValue(rewriteReferences(rootSchema))],
  ]);

  return {
    ok: true,
    output: {
      openapi: "3.1.0",
      info: {
        title: rootName,
        version: "0.1.0",
      },
      components: {
        schemas,
      },
    },
  };
}

function splitJsonSchemaDocument(generated: Record<string, unknown>): {
  root: JsonSchemaOutput;
  definitions: Record<string, JsonSchemaValue>;
} {
  const root = { ...generated };
  const $defs = root.$defs;
  delete root.$schema;
  delete root.$id;
  delete root.$defs;
  delete root.title;
  const definitions: Record<string, JsonSchemaValue> = isRecord($defs)
    ? (Object.fromEntries(
        Object.entries($defs).filter(([, value]) => isJsonSchemaValue(value)),
      ) as Record<string, JsonSchemaValue>)
    : {};
  return {
    root: root as JsonSchemaOutput,
    definitions,
  };
}

function rewriteReferences(value: JsonSchemaValue): JsonSchemaValue {
  if (Array.isArray(value)) return value.map(rewriteReferences);
  if (typeof value === "boolean") return value;
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === "$ref" &&
      typeof child === "string" &&
      child.startsWith("#/$defs/")
        ? `#/components/schemas/${encodePointerSegment(child.slice("#/$defs/".length))}`
        : isJsonSchemaValue(child)
          ? rewriteReferences(child)
          : child,
    ]),
  ) as JsonSchemaOutput;
}

function canonicalizeJsonValue(value: JsonSchemaValue): JsonSchemaValue {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (typeof value === "boolean") return value;
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [
        key,
        isJsonSchemaValue(child) ? canonicalizeJsonValue(child) : child,
      ]),
  ) as JsonSchemaOutput;
}

function encodePointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isJsonSchemaValue(value: unknown): value is JsonSchemaValue {
  return typeof value === "boolean" || Array.isArray(value) || isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rewriteDiagnostics(
  diagnostics: import("@aio/core").SchemaDiagnostic[] | undefined,
) {
  return (diagnostics ?? []).map((diagnostic) => ({
    ...diagnostic,
    source: "generator-openapi",
  }));
}

function rewriteSemanticNotes(notes: import("@aio/core").SchemaSemanticNote[]) {
  return notes.map((note) => ({
    ...note,
    source: "generator-openapi",
  }));
}
