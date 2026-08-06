import type {
  ConstraintDocument,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { resolveGeneratorDescriptor } from "./registry.js";
import { defaultConversionRegistry } from "./registry.js";
import type {
  ConvertOptions,
  ConversionRegistry,
  ConversionTargetFormat,
} from "./types.js";

export type GeneratedOutput = string | Record<string, unknown> | boolean;

export function generateTarget<TOutput = unknown>(
  document: SchemaDocument | ValueDocument,
  targetFormat: ConversionTargetFormat,
  options: ConvertOptions,
  constraints: ConstraintDocument | undefined,
  registry: ConversionRegistry = defaultConversionRegistry,
): import("@schema-transformation-toolkit/core").GenerateResult<TOutput> {
  const descriptor = resolveGeneratorDescriptor<TOutput>(
    targetFormat,
    registry,
  );
  const context = {
    sourceFormat: options.sourceFormat,
    options: generatorOptionsFor(targetFormat, options),
    ...(constraints ? { constraints } : {}),
  };
  const result = descriptor.generate(document, context);
  return result;
}

function generatorOptionsFor(
  targetFormat: ConversionTargetFormat,
  options: ConvertOptions,
): unknown {
  if (targetFormat === "json-schema") {
    return options.advanced?.generator?.jsonSchema ?? {};
  }
  if (targetFormat === "typescript") {
    return options.advanced?.generator?.typeScript ?? {};
  }
  if (targetFormat === "zod") return options.advanced?.generator?.zod ?? {};
  if (targetFormat === "openapi")
    return options.advanced?.generator?.openapi ?? {};
  return options.extension?.generator ?? {};
}
