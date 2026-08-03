import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@aio/core";
import { validateSchemaDocument } from "@aio/core";
import { resolveParserDescriptor } from "./registry.js";
import { defaultConversionRegistry } from "./registry.js";
import type {
  ConvertFailureResult,
  ConvertOptions,
  ConversionSourceFormat,
  ConversionTargetFormat,
  ConversionRegistry,
} from "./types.js";

export interface ParseSourceSuccessResult {
  ok: true;
  value?: ValueDocument;
  shape: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
}

export type ParseSourceResult = ParseSourceSuccessResult | ConvertFailureResult;

export function parseSource(
  input: string,
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  name: string,
  options: ConvertOptions,
  registry: ConversionRegistry = defaultConversionRegistry,
): ParseSourceResult {
  const descriptor = resolveParserDescriptor(sourceFormat, registry);
  let parseResult;
  try {
    parseResult = descriptor.parse(input, {
      name,
      targetFormat,
      options: parserOptionsFor(sourceFormat, options),
    });
  } catch {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-descriptor-failed",
      "The source parser failed while producing its result.",
    );
  }

  if (!parseResult.ok) {
    return {
      ok: false,
      code: parseResult.code,
      message: parseResult.message,
      phase: "parse",
      plan: {
        sourceFormat,
        targetFormat,
        irSequence: [],
        stages: [],
      },
      ...(parseResult.diagnostics
        ? { diagnostics: parseResult.diagnostics }
        : {}),
    };
  }

  try {
    validateSchemaDocument(parseResult.document);
  } catch {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-invalid-shape",
      "The source parser produced an invalid Shape IR document.",
    );
  }

  if (
    parseResult.value &&
    !descriptor.capabilities.producesIr.includes("value")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Value IR without declaring it.",
    );
  }
  if (
    parseResult.constraints &&
    !descriptor.capabilities.producesIr.includes("constraint")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Constraint IR without declaring it.",
    );
  }

  return {
    ok: true,
    shape: parseResult.document,
    diagnostics: parseResult.diagnostics ?? [],
    semanticNotes: parseResult.semanticNotes ?? [],
    ...(parseResult.value ? { value: parseResult.value } : {}),
    ...(parseResult.constraints
      ? { constraints: parseResult.constraints }
      : {}),
  };
}

function createParserFailure(
  sourceFormat: string,
  targetFormat: string,
  code: string,
  message: string,
): ConvertFailureResult {
  return {
    ok: false,
    code,
    message,
    phase: "parse",
    plan: {
      sourceFormat,
      targetFormat,
      irSequence: [],
      stages: [],
    },
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: `parser-${sourceFormat}`,
      },
    ],
  };
}

function parserOptionsFor(
  sourceFormat: ConversionSourceFormat,
  options: ConvertOptions,
): unknown {
  if (sourceFormat === "json") return options.advanced?.parser?.json ?? {};
  if (sourceFormat === "json-schema") {
    return options.advanced?.parser?.jsonSchema ?? {};
  }
  if (sourceFormat === "typescript") {
    return options.advanced?.parser?.typeScript ?? {};
  }
  return options.extension?.parser ?? {};
}
