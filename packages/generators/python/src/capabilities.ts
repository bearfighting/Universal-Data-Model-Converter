import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const pythonGeneratorCapabilities: GeneratorCapabilities = {
  target: "python",
  consumesIr: ["shape"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  supportsCapabilities: ["shape-ir"],
};
