import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const zodParserCapabilities: ParserCapabilities = {
  format: "zod",
  producesIr: ["shape", "constraint"],
  outputs: [{ ir: "shape" }, { ir: "constraint" }],
  capabilities: [
    "shape-ir",
    "constraint-ir",
    "string-constraints",
    "numeric-constraints",
    "collection-constraints",
    "object-constraints",
    "portable-annotations",
  ],
};
