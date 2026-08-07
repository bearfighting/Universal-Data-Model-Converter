import type {
  ParseResult,
  SchemaDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { typeScriptParserCapabilities } from "./capabilities.js";
import { typeScriptParserOptionCatalog } from "./option-metadata.js";
import { tryInferTypeScriptDocumentWithOptions } from "./api.js";
import type { TypeScriptParseOptions } from "./options.js";

export const typeScriptParserDescriptor: ParserDescriptor<
  SchemaDocument,
  TypeScriptParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "typescript",
  capabilities: typeScriptParserCapabilities,
  options: typeScriptParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<TypeScriptParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryInferTypeScriptDocumentWithOptions(input, {
      ...((context.options ?? {}) as TypeScriptParseOptions),
      name: context.name,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
    };
  },
};
