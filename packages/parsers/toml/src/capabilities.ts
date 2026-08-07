import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const tomlParserCapabilities: ParserCapabilities = {
  format: "toml",
  producesIr: ["value", "shape"],
  capabilities: ["value-ir", "shape-ir"],
  valueRootKinds: ["object"],
};
