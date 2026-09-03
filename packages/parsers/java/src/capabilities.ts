import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const javaParserCapabilities: ParserCapabilities = {
  format: "java",
  producesIr: ["shape"],
  outputs: [{ ir: "shape" }],
  capabilities: ["shape-ir"],
};
