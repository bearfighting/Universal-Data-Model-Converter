import type {
  OptionCatalog,
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
  | "unsupported-openapi-composition";
export interface OpenApiParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type OpenApiParseFailureResult = ParseFailureResult<string>;
export type OpenApiParseResult =
  OpenApiParseSuccessResult | OpenApiParseFailureResult;

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
  producesIr: ["shape"],
  capabilities: [
    "shape-ir",
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
  const version = document.openapi;
  if (
    typeof version !== "string" ||
    (!version.startsWith("3.0.") && !version.startsWith("3.1."))
  )
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
  const schemaNames = Object.keys(schemas);
  const entry =
    options.entry ?? (schemaNames.length === 1 ? schemaNames[0] : undefined);
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

  const transformationDiagnostics: SchemaDiagnostic[] = [];
  const definitions = Object.fromEntries(
    schemaNames.map((name) => [
      name,
      normalizeSchema(
        schemas[name],
        ["components", "schemas", name],
        transformationDiagnostics,
      ),
    ]),
  );
  const { [entry]: selectedSchema, ...referencedDefinitions } = definitions;
  const rootSchema = isRecord(selectedSchema) ? selectedSchema : {};
  const jsonSchema = JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: options.name ?? entry,
    $defs: referencedDefinitions,
    ...rootSchema,
  });
  const result = tryInferJsonSchemaDocumentWithOptions(jsonSchema, {
    name: options.name ?? entry,
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
    ...(transformationDiagnostics.length > 0 || rewrittenDiagnostics.length > 0
      ? { diagnostics: [...transformationDiagnostics, ...rewrittenDiagnostics] }
      : {}),
    ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
  };
}

function normalizeSchema(
  value: unknown,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): unknown {
  if (typeof value === "boolean") return value;
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
  const supportedKeys = [
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
  ];
  for (const key of supportedKeys)
    if (key in value) normalized[key] = value[key];
  if (isRecord(value.properties))
    normalized.properties = Object.fromEntries(
      Object.entries(value.properties).map(([name, schema]) => [
        name,
        normalizeSchema(schema, [...path, "properties", name], diagnostics),
      ]),
    );
  if (value.items !== undefined)
    normalized.items = normalizeSchema(
      value.items,
      [...path, "items"],
      diagnostics,
    );
  for (const key of ["oneOf", "anyOf", "prefixItems"] as const)
    if (Array.isArray(value[key]))
      normalized[key] = value[key].map((schema, index) =>
        normalizeSchema(schema, [...path, key, String(index)], diagnostics),
      );
  if (isRecord(value.additionalProperties))
    normalized.additionalProperties = normalizeSchema(
      value.additionalProperties,
      [...path, "additionalProperties"],
      diagnostics,
    );
  if (value.nullable === true) {
    const withoutNullable = { ...normalized };
    normalized.oneOf = [withoutNullable, { type: "null" }];
  }
  if (Array.isArray(value.enum))
    normalized.oneOf = value.enum.map((item) => ({ const: item }));
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
