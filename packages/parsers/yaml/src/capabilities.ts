import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const yamlParserCapabilities: ParserCapabilities = {
  format: "yaml",
  producesIr: ["value", "shape"],
  capabilities: ["value-ir", "shape-ir"],
};
