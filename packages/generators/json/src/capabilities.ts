import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const jsonGeneratorCapabilities: GeneratorCapabilities = {
  target: "json",
  consumesIr: ["value"],
  entryIr: ["value"],
  supportsCapabilities: ["value-ir"],
};
