import type {
  GeneratorDescriptor,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { jsonGeneratorCapabilities } from "./capabilities.js";
import { jsonGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateJson } from "./api.js";

export const jsonGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "json",
  capabilities: jsonGeneratorCapabilities,
  options: jsonGeneratorOptionCatalog,
  generate(document) {
    if (document.kind !== "value-document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The JSON generator requires Value IR.",
      };
    }
    return tryGenerateJson(document as ValueDocument);
  },
};
