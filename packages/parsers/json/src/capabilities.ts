import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const jsonParserCapabilities: ParserCapabilities = {
  format: "json",
  producesIr: ["value", "shape"],
  capabilities: ["value-ir", "shape-ir"],
};
