import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const yamlGeneratorCapabilities: GeneratorCapabilities = {
  target: "yaml",
  consumesIr: ["value"],
  entryIr: ["value"],
  supportsCapabilities: ["value-ir"],
};
