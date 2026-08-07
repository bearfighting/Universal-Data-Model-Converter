import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const typeScriptParserCapabilities: ParserCapabilities = {
  format: "typescript",
  producesIr: ["shape"],
  outputs: [{ ir: "shape" }],
  capabilities: ["shape-ir"],
};
