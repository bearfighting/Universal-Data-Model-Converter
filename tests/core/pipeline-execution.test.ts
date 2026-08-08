import { describe, expect, it } from "vitest";
import {
  constraintDocument,
  executePipeline,
  schemaDocument,
  schemaScalarNode,
  type GeneratorDescriptor,
  type IrTransformerDescriptor,
  type ParserDescriptor,
  valueDocument,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";

const valueParser: ParserDescriptor = {
  kind: "parser",
  format: "fixture-value",
  descriptorVersion: "0.1",
  capabilities: {
    format: "fixture-value",
    producesIr: ["value"],
    outputs: [{ ir: "value" }],
    capabilities: ["value-ir"],
  },
  options: { format: "fixture-value", role: "parser", options: [] },
  parse(_input, context) {
    return {
      ok: true,
      document: valueDocument(context.name, valueScalarNode("fixture")),
      diagnostics: [
        {
          severity: "info",
          code: "fixture-parse-diagnostic",
          message: "The parser ran.",
          source: "fixture-parser",
        },
      ],
      semanticNotes: [
        {
          kind: "normalization",
          code: "fixture-parse-note",
          message: "The parser normalized input.",
          layer: "value",
          source: "fixture-parser",
        },
      ],
    };
  },
};

const valueGenerator: GeneratorDescriptor = {
  kind: "generator",
  format: "fixture-value-target",
  descriptorVersion: "0.1",
  capabilities: {
    target: "fixture-value-target",
    consumesIr: ["value"],
    entries: [{ ir: "value" }],
    supportsCapabilities: ["value-ir"],
  },
  options: { format: "fixture-value-target", role: "generator", options: [] },
  generate(input) {
    return {
      ok: true,
      output: input.document.kind,
      diagnostics: [
        {
          severity: "info",
          code: "fixture-generate-diagnostic",
          message: "The generator ran.",
          source: "fixture-generator",
        },
      ],
    };
  },
};

const valueToShape: IrTransformerDescriptor = {
  kind: "transformer",
  id: "fixture-value-to-shape",
  descriptorVersion: "0.1",
  inputIr: "value",
  outputIr: "shape",
  transform(input) {
    return {
      ok: true,
      document: schemaDocument(input.document.name, schemaScalarNode("string")),
      diagnostics: [
        {
          severity: "warning",
          code: "fixture-transform-diagnostic",
          message: "The transformer widened the value.",
          source: "fixture-transformer",
        },
      ],
      semanticNotes: [
        {
          kind: "widening",
          code: "fixture-transform-note",
          message: "The transformer widened the value.",
          layer: "shape",
          source: "fixture-transformer",
        },
      ],
    };
  },
};

const shapeToShape: IrTransformerDescriptor = {
  kind: "transformer",
  id: "fixture-shape-to-shape",
  descriptorVersion: "0.1",
  inputIr: "shape",
  outputIr: "shape",
  transform(input) {
    return { ok: true, document: input.document };
  },
};

const shapeGenerator: GeneratorDescriptor = {
  ...valueGenerator,
  format: "fixture-shape-target",
  capabilities: {
    ...valueGenerator.capabilities,
    target: "fixture-shape-target",
    consumesIr: ["shape"],
    entries: [{ ir: "shape" }],
    supportsCapabilities: ["shape-ir"],
  },
  options: { format: "fixture-shape-target", role: "generator", options: [] },
  generate(input) {
    return { ok: true, output: input.document.kind };
  },
};

const valueWithConstraintParser: ParserDescriptor = {
  ...valueParser,
  format: "fixture-value-with-constraint",
  capabilities: {
    ...valueParser.capabilities,
    format: "fixture-value-with-constraint",
    producesIr: ["value", "constraint"],
    outputs: [{ ir: "value", artifacts: ["constraint"] }, { ir: "constraint" }],
  },
  options: {
    format: "fixture-value-with-constraint",
    role: "parser",
    options: [],
  },
  parse(_input, context) {
    return {
      ok: true,
      document: valueDocument(context.name, valueScalarNode("fixture")),
      artifacts: { constraints: constraintDocument(context.name) },
    };
  },
};

const valueWithConstraintGenerator: GeneratorDescriptor = {
  ...valueGenerator,
  format: "fixture-value-with-constraint-target",
  capabilities: {
    ...valueGenerator.capabilities,
    target: "fixture-value-with-constraint-target",
    entries: [{ ir: "value", artifacts: ["constraint"] }],
  },
  options: {
    format: "fixture-value-with-constraint-target",
    role: "generator",
    options: [],
  },
  generate(input) {
    return {
      ok: true,
      output: input.artifacts?.constraints?.kind ?? "missing",
    };
  },
};

function plan(
  selectedIr: "value" | "shape",
  transformers: IrTransformerDescriptor[] = [],
) {
  return {
    selectedIr,
    stages: transformers.map((transformer) => ({
      kind: "transform" as const,
      transformerId: transformer.id,
      from: transformer.inputIr,
      to: transformer.outputIr,
    })),
  };
}

describe("generic pipeline execution", () => {
  it("executes a direct Value pipeline and groups stage evidence", () => {
    const result = executePipeline({
      parser: valueParser,
      generator: valueGenerator,
      plan: plan("value"),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-value-target",
    });

    expect(result).toMatchObject({ ok: true, output: "value-document" });
    if (!result.ok) return;
    expect(result.diagnostics?.all.map((item) => item.code)).toEqual([
      "fixture-parse-diagnostic",
      "fixture-generate-diagnostic",
    ]);
    expect(result.semanticNotes?.all.map((item) => item.code)).toEqual([
      "fixture-parse-note",
    ]);
    expect(result.bundle.artifacts?.value?.kind).toBe("value-document");
  });

  it("executes a transformer chain and preserves the prior artifact", () => {
    const result = executePipeline({
      parser: valueParser,
      generator: shapeGenerator,
      transformers: [valueToShape],
      plan: plan("shape", [valueToShape]),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-shape-target",
    });

    expect(result).toMatchObject({ ok: true, output: "document" });
    if (!result.ok) return;
    expect(result.bundle.artifacts?.value?.kind).toBe("value-document");
    expect(result.bundle.artifacts?.shape?.kind).toBe("document");
    expect(result.diagnostics?.transform?.[0]?.code).toBe(
      "fixture-transform-diagnostic",
    );
    expect(result.semanticNotes?.transform?.[0]?.code).toBe(
      "fixture-transform-note",
    );
  });

  it("executes more than one planned transformer in order", () => {
    const result = executePipeline({
      parser: valueParser,
      generator: shapeGenerator,
      transformers: [valueToShape, shapeToShape],
      plan: plan("shape", [valueToShape, shapeToShape]),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-shape-target",
    });

    expect(result).toMatchObject({ ok: true, output: "document" });
  });

  it("returns structured failures and retains the last valid bundle", () => {
    const failingGenerator: GeneratorDescriptor = {
      ...shapeGenerator,
      format: "fixture-failing-target",
      capabilities: {
        ...shapeGenerator.capabilities,
        target: "fixture-failing-target",
      },
      options: {
        format: "fixture-failing-target",
        role: "generator",
        options: [],
      },
      generate() {
        throw new Error("internal detail");
      },
    };
    const result = executePipeline({
      parser: valueParser,
      generator: failingGenerator,
      transformers: [valueToShape],
      plan: plan("shape", [valueToShape]),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-failing-target",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid-generator-input",
      phase: "generate",
    });
    if (result.ok) return;
    expect(result.message).not.toContain("internal detail");
    expect(result.bundle?.artifacts?.value?.kind).toBe("value-document");
    expect(result.bundle?.artifacts?.shape?.kind).toBe("document");
    expect(result.diagnostics?.transform?.[0]?.code).toBe(
      "fixture-transform-diagnostic",
    );
    expect(result.diagnostics?.generate?.[0]?.code).toBe(
      "invalid-generator-input",
    );
  });

  it("reports missing required artifacts before generation", () => {
    const result = executePipeline({
      parser: valueParser,
      generator: valueWithConstraintGenerator,
      plan: { ...plan("value"), requiredArtifacts: ["constraint"] },
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-value-with-constraint-target",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "missing-generator-artifact",
      phase: "generate",
    });
  });

  it("passes planner-declared supplementary artifacts to the generator", () => {
    const result = executePipeline({
      parser: valueWithConstraintParser,
      generator: valueWithConstraintGenerator,
      plan: {
        selectedIr: "value",
        stages: [],
        requiredArtifacts: ["constraint"],
      },
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value-with-constraint",
      targetFormat: "fixture-value-with-constraint-target",
    });

    expect(result).toMatchObject({ ok: true, output: "constraint-document" });
  });

  it("rejects a plan whose stages do not match transformer contracts", () => {
    const result = executePipeline({
      parser: valueParser,
      generator: shapeGenerator,
      transformers: [valueToShape],
      plan: {
        selectedIr: "shape",
        stages: [
          {
            kind: "transform",
            transformerId: valueToShape.id,
            from: "shape",
            to: "value",
          },
        ],
      },
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-shape-target",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "pipeline-plan-mismatch",
      phase: "transform",
      diagnostics: {
        transform: [
          expect.objectContaining({ code: "pipeline-plan-mismatch" }),
        ],
      },
    });
  });

  it("adds a diagnostic when generator analysis fails", () => {
    const generator: GeneratorDescriptor = {
      ...shapeGenerator,
      format: "fixture-analysis-failure",
      capabilities: {
        ...shapeGenerator.capabilities,
        target: "fixture-analysis-failure",
      },
      options: {
        format: "fixture-analysis-failure",
        role: "generator",
        options: [],
      },
      analysis: {
        planSemanticLosses() {
          throw new Error("internal detail");
        },
      },
    };
    const result = executePipeline({
      parser: valueParser,
      generator,
      transformers: [valueToShape],
      plan: plan("shape", [valueToShape]),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-value",
      targetFormat: "fixture-analysis-failure",
      routeCapabilities: {
        supportsValueIr: false,
        supportsShapeIr: true,
        supportsConstraintIr: false,
        parserCapabilities: ["value-ir"],
        generatorCapabilities: ["shape-ir"],
        preservedCapabilities: ["shape-ir"],
        potentiallyLostCapabilities: [],
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: "generator-analysis-failed",
      diagnostics: {
        generate: [
          expect.objectContaining({ code: "generator-analysis-failed" }),
        ],
      },
    });
  });

  it("adds a diagnostic when a parser descriptor throws", () => {
    const parser: ParserDescriptor = {
      ...valueParser,
      format: "fixture-parser-failure",
      capabilities: {
        ...valueParser.capabilities,
        format: "fixture-parser-failure",
      },
      options: {
        format: "fixture-parser-failure",
        role: "parser",
        options: [],
      },
      parse() {
        throw new Error("internal detail");
      },
    };
    const result = executePipeline({
      parser,
      generator: valueGenerator,
      plan: plan("value"),
      input: "fixture",
      parserContext: { name: "Fixture" },
      sourceFormat: "fixture-parser-failure",
      targetFormat: "fixture-value-target",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "parser-descriptor-failed",
      phase: "parse",
      diagnostics: {
        parse: [expect.objectContaining({ code: "parser-descriptor-failed" })],
      },
    });
  });
});
