import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const javaGeneratorCapabilities: GeneratorCapabilities = {
  target: "java",
  consumesIr: ["shape"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  supportsCapabilities: ["shape-ir"],
};
