import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrBundle,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateToml } from "./api.js";
import { tomlGeneratorCapabilities } from "./capabilities.js";
import { tomlGeneratorOptionCatalog } from "./option-metadata.js";
import type { TomlGeneratorOptions } from "./options.js";

export const tomlGeneratorDescriptor: GeneratorDescriptor<
  ValueDocument,
  string,
  TomlGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "toml",
  capabilities: tomlGeneratorCapabilities,
  options: tomlGeneratorOptionCatalog,
  generate(
    input: IrBundle<ValueDocument>,
    context: GeneratorExecutionContext<TomlGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || !isValueDocument(input.document)) {
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
    return tryGenerateToml(input.document, context.options ?? {});
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
