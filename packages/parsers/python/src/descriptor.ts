import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { pythonParserCapabilities } from "./capabilities.js";
import { pythonParserOptionCatalog } from "./option-metadata.js";
import { tryParsePython } from "./api.js";
import type { PythonParseOptions } from "./options.js";

export const pythonParserDescriptor: ParserDescriptor<
  SchemaDocument,
  PythonParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "python",
  capabilities: pythonParserCapabilities,
  options: pythonParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<PythonParseOptions>,
  ): ParseResult<SchemaDocument> {
    return tryParsePython(input, {
      ...(context.options ?? {}),
      name: context.name,
    });
  },
};
