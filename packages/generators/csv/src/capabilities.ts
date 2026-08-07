import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const csvGeneratorCapabilities: GeneratorCapabilities = {
  target: "csv",
  consumesIr: ["value"],
  entryIr: ["value"],
  supportsCapabilities: ["value-ir"],
  valueRootKinds: ["array"],
};
