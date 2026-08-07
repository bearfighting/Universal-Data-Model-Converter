import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const jsonGeneratorCapabilities: GeneratorCapabilities = {
  target: "json",
  consumesIr: ["value"],
  entryIr: ["value"],
  entries: [{ ir: "value" }],
  supportsCapabilities: ["value-ir"],
};
