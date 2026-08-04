import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const openApiGeneratorCapabilities: GeneratorCapabilities = {
  target: "openapi",
  consumesIr: ["shape", "constraint"],
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
