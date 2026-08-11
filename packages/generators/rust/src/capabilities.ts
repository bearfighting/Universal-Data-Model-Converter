import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const rustGeneratorCapabilities: GeneratorCapabilities = {
  target: "rust",
  consumesIr: ["shape", "constraint"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  overlays: ["constraint"],
  supportsCapabilities: ["shape-ir", "constraint-ir", "numeric-constraints"],
};
