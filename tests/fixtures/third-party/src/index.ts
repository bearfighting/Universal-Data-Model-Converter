import {
  schemaDocument,
  schemaScalarNode,
  valueDocument,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  IrTransformerDescriptor,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";

const emptyParserOptions = {
  format: "fixture-source",
  role: "parser" as const,
  options: [],
};

const emptyGeneratorOptions = {
  format: "fixture-target",
  role: "generator" as const,
  options: [],
};

export const fixtureParserDescriptor: ParserDescriptor = {
  kind: "parser",
  format: "fixture-source",
  descriptorVersion: "0.1",
  capabilities: {
    format: "fixture-source",
    producesIr: ["value"],
    outputs: [{ ir: "value", valueRootKinds: ["scalar"] }],
    capabilities: ["value-ir"],
  },
  options: emptyParserOptions,
  parse(_input, context) {
    return {
      ok: true,
      document: valueDocument(context.name, valueScalarNode("fixture")),
    };
  },
};

export const fixtureTransformerDescriptor: IrTransformerDescriptor = {
  kind: "transformer",
  id: "fixture-value-to-shape",
  descriptorVersion: "0.1",
  inputIr: "value",
  outputIr: "shape",
  transform(input) {
    return {
      ok: true,
      document: schemaDocument(input.document.name, schemaScalarNode("string")),
    };
  },
};

export const fixtureGeneratorDescriptor: GeneratorDescriptor = {
  kind: "generator",
  format: "fixture-target",
  descriptorVersion: "0.1",
  capabilities: {
    target: "fixture-target",
    consumesIr: ["shape"],
    supportsCapabilities: ["shape-ir"],
  },
  options: emptyGeneratorOptions,
  generate(input) {
    if (input.document.kind !== "document") {
      return {
        ok: false,
        code: "fixture-invalid-input",
        message: "Expected Shape IR.",
      };
    }
    return { ok: true, output: `fixture:${input.document.name.source}` };
  },
};
