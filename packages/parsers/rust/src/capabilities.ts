import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const rustParserCapabilities: ParserCapabilities = {
  format: "rust",
  producesIr: ["shape", "constraint"],
  outputs: [{ ir: "shape" }, { ir: "constraint" }],
  capabilities: ["shape-ir", "constraint-ir", "numeric-constraints"],
};
