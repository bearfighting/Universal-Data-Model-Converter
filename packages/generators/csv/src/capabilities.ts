import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const csvGeneratorCapabilities: GeneratorCapabilities = {
  target: "csv",
  consumesIr: ["value"],
  entryIr: ["value"],
  entries: [{ ir: "value", valueRootKinds: ["array"] }],
  supportsCapabilities: ["value-ir"],
  valueRootKinds: ["array"],
};
