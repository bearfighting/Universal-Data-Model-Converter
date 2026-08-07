import type {
  ParseResult,
  SchemaDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { jsonSchemaParserCapabilities } from "./capabilities.js";
import { jsonSchemaParserOptionCatalog } from "./option-metadata.js";
import { tryInferJsonSchemaDocumentWithOptions } from "./api.js";
import type { JsonSchemaParseOptions } from "./options.js";

export const jsonSchemaParserDescriptor: ParserDescriptor<
  SchemaDocument,
  JsonSchemaParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "json-schema",
  capabilities: jsonSchemaParserCapabilities,
  options: jsonSchemaParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<JsonSchemaParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryInferJsonSchemaDocumentWithOptions(input, {
      ...((context.options ?? {}) as JsonSchemaParseOptions),
      name: context.name,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      ...(result.constraints
        ? { artifacts: { constraints: result.constraints } }
        : {}),
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
    };
  },
};
