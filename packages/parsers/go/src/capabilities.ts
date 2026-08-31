import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export const goParserCapabilities: ParserCapabilities = {
  format: "go",
  producesIr: ["shape"],
  outputs: [{ ir: "shape" }],
  capabilities: ["shape-ir"],
};
