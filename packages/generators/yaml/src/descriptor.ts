import type {
  GeneratorDescriptor,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateYaml } from "./api.js";
import { yamlGeneratorCapabilities } from "./capabilities.js";
import { yamlGeneratorOptionCatalog } from "./option-metadata.js";

export const yamlGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "yaml",
  capabilities: yamlGeneratorCapabilities,
  options: yamlGeneratorOptionCatalog,
  generate(document) {
    if (document.kind !== "value-document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The YAML generator requires Value IR.",
        diagnostics: [
          {
            severity: "error",
            code: "invalid-generator-input",
            message: "The YAML generator requires Value IR.",
            source: "generator-yaml",
          },
        ],
      };
    }
    return tryGenerateYaml(document as ValueDocument);
  },
};
