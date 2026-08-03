import type {
  OptionCatalog,
  ConstraintDocument,
  ParseFailureResult,
  ParseOptions,
  ParseResult,
  ParserCapabilities,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import { tryInferJsonSchemaDocumentWithOptions } from "@aio/parser-json-schema";
import { parse as parseYaml, YAMLParseError } from "yaml";

export interface OpenApiParseOptions extends ParseOptions {
  entry?: string;
}
export type OpenApiParseFailureCode =
  | "invalid-openapi-document"
  | "unsupported-openapi-version"
  | "openapi-schemas-missing"
  | "openapi-entry-required"
  | "openapi-entry-not-found"
  | "unsupported-openapi-keyword"
  | "unsupported-openapi-composition";
export interface OpenApiParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type OpenApiParseFailureResult = ParseFailureResult<string>;
export type OpenApiParseResult =
  OpenApiParseSuccessResult | OpenApiParseFailureResult;

type OpenApiVersion = "3.0" | "3.1";

interface ParsedOpenApiSource {
  ok: true;
  version: OpenApiVersion;
  schemas: Record<string, unknown>;
}

const diagnostic = (
  code: string,
  message: string,
  path?: string[],
  severity: SchemaDiagnostic["severity"] = "error",
): SchemaDiagnostic => ({
  severity,
  code,
  message,
  ...(path ? { path } : {}),
  source: "parser-openapi",
});

export const openApiParserCapabilities: ParserCapabilities = {
  format: "openapi",
  producesIr: ["shape", "constraint"],
  capabilities: [
    "shape-ir",
    "constraint-ir",
    "object-constraints",
    "collection-constraints",
    "string-constraints",
    "numeric-constraints",
    "portable-annotations",
  ],
};

export const openApiParserOptionCatalog: OptionCatalog = {
  format: "openapi",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Schema entry",
      description:
        "Selects the component schema to convert when an OpenAPI document contains multiple schemas.",
      category: "selection",
      defaultValue: undefined,
      affectedStages: ["parse"],
      semanticEffect:
        "Chooses which components.schemas entry becomes the root Shape IR document.",
      diagnosticEffect:
        "An omitted entry is rejected when multiple schemas are present; an unknown entry is rejected explicitly.",
      supported: true,
      examples: [
        {
          title: "Select a component schema",
          options: { entry: "User" },
          explanation: "Convert the User schema as the document root.",
        },
      ],
    },
  ],
};

export const openApiParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "openapi",
  capabilities: openApiParserCapabilities,
  options: openApiParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    return tryParseOpenApiDocument(input, {
      ...((context.options ?? {}) as OpenApiParseOptions),
      name: context.name,
    });
  },
};

export function tryParseOpenApiDocument(
  input: string,
  options: OpenApiParseOptions = {},
): OpenApiParseResult {
  const parsedSource = parseOpenApiSource(input);
  if (!parsedSource.ok) return parsedSource;

  const entryResult = selectSchemaEntry(parsedSource.schemas, options.entry);
  if (!entryResult.ok) return entryResult;

  const transformationDiagnostics: SchemaDiagnostic[] = [];
  const definitions = Object.fromEntries(
    Object.entries(parsedSource.schemas).map(([name, schema]) => [
      name,
      normalizeSchema(
        schema,
        ["components", "schemas", name],
        transformationDiagnostics,
        parsedSource.version,
      ),
    ]),
  );
  const { [entryResult.entry]: selectedSchema, ...referencedDefinitions } =
    definitions;
  const rootSchema = isRecord(selectedSchema) ? selectedSchema : {};
  const jsonSchema = JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: options.name ?? entryResult.entry,
    $defs: referencedDefinitions,
    ...rootSchema,
  });
  const result = tryInferJsonSchemaDocumentWithOptions(jsonSchema, {
    name: options.name ?? entryResult.entry,
  });
  const rewrittenDiagnostics = (result.diagnostics ?? []).map((item) => ({
    ...item,
    source: "parser-openapi",
  }));
  if (!result.ok)
    return {
      ...result,
      diagnostics: [...transformationDiagnostics, ...rewrittenDiagnostics],
    };
  return {
    ok: true,
    document: result.document,
    ...(result.constraints ? { constraints: result.constraints } : {}),
    ...(transformationDiagnostics.length > 0 || rewrittenDiagnostics.length > 0
      ? { diagnostics: [...transformationDiagnostics, ...rewrittenDiagnostics] }
      : {}),
    ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
  };
}

function parseOpenApiSource(
  input: string,
): ParsedOpenApiSource | OpenApiParseFailureResult {
  let document: unknown;
  try {
    document = parseYaml(input);
  } catch (error) {
    const detail =
      error instanceof YAMLParseError ? error.message : "Invalid YAML.";
    return failure(
      "invalid-openapi-document",
      `The OpenAPI input is not valid JSON or YAML: ${detail}`,
    );
  }
  if (!isRecord(document))
    return failure(
      "invalid-openapi-document",
      "An OpenAPI document must be a JSON or YAML object.",
    );
  const version = parseOpenApiVersion(document.openapi);
  if (!version)
    return failure(
      "unsupported-openapi-version",
      "Only OpenAPI versions 3.0.x and 3.1.x are currently supported.",
      ["openapi"],
    );
  const components = isRecord(document.components)
    ? document.components
    : undefined;
  const schemas =
    components && isRecord(components.schemas) ? components.schemas : undefined;
  if (!schemas || Object.keys(schemas).length === 0)
    return failure(
      "openapi-schemas-missing",
      'The OpenAPI document must define at least one schema under "components.schemas".',
      ["components", "schemas"],
    );
  return { ok: true, version, schemas };
}

function parseOpenApiVersion(value: unknown): OpenApiVersion | undefined {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("3.0.")) return "3.0";
  if (value.startsWith("3.1.")) return "3.1";
  return undefined;
}

function selectSchemaEntry(
  schemas: Record<string, unknown>,
  requestedEntry?: string,
): { ok: true; entry: string } | OpenApiParseFailureResult {
  const schemaNames = Object.keys(schemas);
  const entry =
    requestedEntry ?? (schemaNames.length === 1 ? schemaNames[0] : undefined);
  if (!entry)
    return failure(
      "openapi-entry-required",
      `The OpenAPI document contains multiple schemas. Choose one of: ${schemaNames.join(", ")}.`,
      ["components", "schemas"],
    );
  if (!Object.hasOwn(schemas, entry))
    return failure(
      "openapi-entry-not-found",
      `The OpenAPI schema entry "${entry}" was not found. Available entries: ${schemaNames.join(", ")}.`,
      ["components", "schemas", entry],
    );

  return { ok: true, entry };
}

function normalizeSchema(
  value: unknown,
  path: string[],
  diagnostics: SchemaDiagnostic[],
  version: OpenApiVersion,
): unknown {
  if (typeof value === "boolean") {
    if (version === "3.1") return value;
    diagnostics.push(
      diagnostic(
        "invalid-openapi-schema",
        "Boolean schemas are supported only by OpenAPI 3.1.",
        path,
      ),
    );
    return {};
  }
  if (!isRecord(value)) {
    diagnostics.push(
      diagnostic(
        "invalid-openapi-schema",
        "An OpenAPI schema must be an object.",
        path,
      ),
    );
    return {};
  }
  if (typeof value.$ref === "string") {
    const prefix = "#/components/schemas/";
    if (value.$ref.startsWith(prefix))
      return { $ref: `#/$defs/${value.$ref.slice(prefix.length)}` };
    diagnostics.push(
      diagnostic(
        "unsupported-openapi-ref",
        `Only local component schema references are supported: ${value.$ref}.`,
        [...path, "$ref"],
      ),
    );
    return {};
  }
  const normalized: Record<string, unknown> = {};
  const supportedKeys = new Set([
    "$schema",
    "title",
    "description",
    "type",
    "const",
    "properties",
    "required",
    "items",
    "prefixItems",
    "oneOf",
    "anyOf",
    "additionalProperties",
    "pattern",
    "minLength",
    "maxLength",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties",
    "format",
    "default",
    "examples",
    "nullable",
    "enum",
    "allOf",
  ]);
  if (version === "3.0") supportedKeys.delete("prefixItems");
  for (const key of Object.keys(value)) {
    if (key.startsWith("x-") || supportedKeys.has(key)) continue;
    diagnostics.push(
      diagnostic(
        "unsupported-openapi-keyword",
        `The OpenAPI schema keyword "${key}" is not supported by this parser and was ignored.`,
        [...path, key],
        "warning",
      ),
    );
  }
  for (const key of supportedKeys) {
    if (key in value && !["allOf", "enum", "nullable"].includes(key))
      normalized[key] = value[key];
  }
  if (isRecord(value.properties))
    normalized.properties = Object.fromEntries(
      Object.entries(value.properties).map(([name, schema]) => [
        name,
        normalizeSchema(
          schema,
          [...path, "properties", name],
          diagnostics,
          version,
        ),
      ]),
    );
  if (value.items !== undefined)
    normalized.items = normalizeSchema(
      value.items,
      [...path, "items"],
      diagnostics,
      version,
    );
  for (const key of ["oneOf", "anyOf", "prefixItems"] as const)
    if (supportedKeys.has(key) && Array.isArray(value[key]))
      normalized[key] = value[key].map((schema, index) =>
        normalizeSchema(
          schema,
          [...path, key, String(index)],
          diagnostics,
          version,
        ),
      );
  if (isRecord(value.additionalProperties))
    normalized.additionalProperties = normalizeSchema(
      value.additionalProperties,
      [...path, "additionalProperties"],
      diagnostics,
      version,
    );
  normalizeVersionSpecificKeywords(
    value,
    normalized,
    version,
    path,
    diagnostics,
  );
  normalizeNullableAndEnum(value, normalized);
  if ("allOf" in value) {
    diagnostics.push(
      diagnostic(
        "unsupported-openapi-composition",
        'The OpenAPI "allOf" composition is not supported in this parser version and was lowered to an unknown schema.',
        [...path, "allOf"],
        "warning",
      ),
    );
    return {};
  }
  return normalized;
}

function normalizeVersionSpecificKeywords(
  source: Record<string, unknown>,
  normalized: Record<string, unknown>,
  version: OpenApiVersion,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): void {
  if (version !== "3.0") return;
  for (const key of ["exclusiveMinimum", "exclusiveMaximum"] as const) {
    const value = source[key];
    if (typeof value !== "boolean") continue;
    const boundKey = key === "exclusiveMinimum" ? "minimum" : "maximum";
    const bound = source[boundKey];
    delete normalized[key];
    if (value && typeof bound === "number") {
      normalized[key] = bound;
      delete normalized[boundKey];
    } else if (value) {
      diagnostics.push(
        diagnostic(
          "invalid-openapi-schema",
          `OpenAPI 3.0 ${key}: true requires a numeric ${boundKey}.`,
          [...path, key],
        ),
      );
    }
  }
}

function normalizeNullableAndEnum(
  source: Record<string, unknown>,
  normalized: Record<string, unknown>,
): void {
  const enumValues = Array.isArray(source.enum)
    ? source.enum.map((item) => ({ const: item }))
    : undefined;
  const members = enumValues ?? normalized.oneOf;
  if (source.nullable === true) {
    normalized.oneOf = [
      ...(Array.isArray(members) ? members : [{ ...normalized }]),
      { type: "null" },
    ];
    return;
  }
  if (enumValues) normalized.oneOf = enumValues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function failure(
  code: OpenApiParseFailureCode,
  message: string,
  path?: string[],
): OpenApiParseFailureResult {
  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic(code, message, path)],
  };
}
export const openApiParser = openApiParserDescriptor;
