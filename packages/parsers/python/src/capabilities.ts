import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const pythonParserCapabilities: ParserCapabilities = {
  format: "python",
  producesIr: ["shape"],
  outputs: [{ ir: "shape" }],
  capabilities: ["shape-ir"],
};
