import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const jsonParserCapabilities: ParserCapabilities = {
  format: "json",
  producesIr: ["value", "shape"],
  outputs: [{ ir: "value" }, { ir: "shape" }],
  capabilities: ["value-ir", "shape-ir"],
};
