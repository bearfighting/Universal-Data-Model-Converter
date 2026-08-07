import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const yamlGeneratorCapabilities: GeneratorCapabilities = {
  target: "yaml",
  consumesIr: ["value"],
  entryIr: ["value"],
  entries: [{ ir: "value" }],
  supportsCapabilities: ["value-ir"],
};
