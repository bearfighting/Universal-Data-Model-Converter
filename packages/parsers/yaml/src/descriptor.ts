import type {
  ParseResult,
  IrDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { yamlParserCapabilities } from "./capabilities.js";
import { tryParseYamlDocument, tryParseYamlValueDocument } from "./api.js";
import { yamlParserOptionCatalog } from "./option-metadata.js";
import type { YamlParseOptions } from "./options.js";

export const yamlParserDescriptor: ParserDescriptor<
  IrDocument,
  YamlParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "yaml",
  capabilities: yamlParserCapabilities,
  options: yamlParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    const options = {
      ...((context.options ?? {}) as YamlParseOptions),
      name: context.name,
    };
    if (context.requestedIr === "value") {
      const result = tryParseYamlValueDocument(input, options);
      if (!result.ok) return result;
      return {
        ok: true,
        document: result.document,
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      };
    }
    const result = tryParseYamlDocument(input, options);
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      artifacts: { value: result.value },
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
    };
  },
};
