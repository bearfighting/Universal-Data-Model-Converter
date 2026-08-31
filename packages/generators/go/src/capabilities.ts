import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export const goGeneratorCapabilities: GeneratorCapabilities = {
  target: "go",
  consumesIr: ["shape"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  supportsCapabilities: ["shape-ir"],
};
