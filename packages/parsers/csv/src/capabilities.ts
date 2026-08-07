import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const csvParserCapabilities: ParserCapabilities = {
  format: "csv",
  producesIr: ["value", "shape"],
  capabilities: ["value-ir", "shape-ir"],
};
