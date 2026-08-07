import type {
  ParseResult,
  SchemaDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { zodParserCapabilities } from "./capabilities.js";
import { zodParserOptionCatalog } from "./option-metadata.js";
import { tryInferZodDocumentWithOptions } from "./api.js";
import type { ZodParseOptions } from "./options.js";

export const zodParserDescriptor: ParserDescriptor<
  SchemaDocument,
  ZodParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "zod",
  capabilities: zodParserCapabilities,
  options: zodParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<ZodParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryInferZodDocumentWithOptions(input, {
      ...((context.options ?? {}) as ZodParseOptions),
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
