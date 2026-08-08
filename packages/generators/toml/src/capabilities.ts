import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const tomlGeneratorCapabilities: GeneratorCapabilities = {
  target: "toml",
  consumesIr: ["value"],
  entryIr: ["value"],
  entries: [{ ir: "value", valueRootKinds: ["object"] }],
  overlays: [],
  supportsCapabilities: ["value-ir"],
  valueRootKinds: ["object"],
};
