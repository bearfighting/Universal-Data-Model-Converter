import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export const kotlinGeneratorCapabilities: GeneratorCapabilities = {
  target: "kotlin",
  consumesIr: ["shape", "constraint"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  overlays: ["constraint"],
  supportsCapabilities: ["shape-ir", "constraint-ir", "collection-constraints"],
};
