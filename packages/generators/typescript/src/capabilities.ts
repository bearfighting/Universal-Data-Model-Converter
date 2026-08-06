import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const typeScriptGeneratorCapabilities: GeneratorCapabilities = {
  target: "typescript",
  consumesIr: ["shape"],
  entryIr: ["shape"],
  supportsCapabilities: ["shape-ir"],
};
