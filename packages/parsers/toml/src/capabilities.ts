import type { ParserCapabilities } from "@schema-transformation-toolkit/core";

export const tomlParserCapabilities: ParserCapabilities = {
  format: "toml",
  producesIr: ["value", "shape"],
  outputs: [{ ir: "value", valueRootKinds: ["object"] }, { ir: "shape" }],
  capabilities: ["value-ir", "shape-ir"],
  valueRootKinds: ["object"],
};
