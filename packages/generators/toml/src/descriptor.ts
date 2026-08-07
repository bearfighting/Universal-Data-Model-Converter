import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateToml } from "./api.js";
import { tomlGeneratorCapabilities } from "./capabilities.js";
import { tomlGeneratorOptionCatalog } from "./option-metadata.js";
import type { TomlGeneratorOptions } from "./options.js";

export const tomlGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "toml",
  capabilities: tomlGeneratorCapabilities,
  options: tomlGeneratorOptionCatalog,
  generate(document, context: GeneratorExecutionContext) {
    if (!isValueDocument(document)) {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The TOML generator requires Value IR.",
        diagnostics: [
          {
            severity: "error",
            code: "invalid-generator-input",
            message: "The TOML generator requires Value IR.",
            source: "generator-toml",
          },
        ],
      };
    }
    return tryGenerateToml(
      document as ValueDocument,
      (context.options ?? {}) as TomlGeneratorOptions,
    );
  },
};

function isValueDocument(document: unknown): document is ValueDocument {
  return (
    typeof document === "object" &&
    document !== null &&
    !Array.isArray(document) &&
    (document as { kind?: unknown }).kind === "value-document"
  );
}
