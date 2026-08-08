import {
  valueDocument,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";

export const fixtureParserDescriptor = {
  kind: "parser",
  format: "fixture-source",
  descriptorVersion: "0.1",
  capabilities: {
    format: "fixture-source",
    producesIr: ["value"],
    outputs: [{ ir: "value" }],
    capabilities: ["value-ir"],
  },
  options: { format: "fixture-source", role: "parser", options: [] },
  parse(_input, context) {
    return {
      ok: true,
      document: valueDocument(context.name, valueScalarNode("fixture")),
    };
  },
};
