import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const jsonSchemaGeneratorCapabilities: GeneratorCapabilities = {
  target: "json-schema",
  consumesIr: ["shape", "constraint"],
  entryIr: ["shape"],
  overlays: ["constraint"],
  supportsCapabilities: [
    "shape-ir",
    "constraint-ir",
    "string-constraints",
    "numeric-constraints",
    "collection-constraints",
    "object-constraints",
    "portable-annotations",
  ],
};
