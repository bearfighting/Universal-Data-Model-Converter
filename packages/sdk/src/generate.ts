import { executeGenerator } from "@schema-transformation-toolkit/core";
import type {
  ConstraintDocument,
  IrBundle,
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
  const input: IrBundle = {
    document,
    ...(constraints ? { artifacts: { constraints } } : {}),
  };
  const result = executeGenerator(descriptor, input, {
    options: generatorOptionsFor(targetFormat, options),
  });
  return result as import("@schema-transformation-toolkit/core").GenerateResult<TOutput>;
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
  if (targetFormat === "yaml") return options.advanced?.generator?.yaml ?? {};
  if (targetFormat === "csv") return options.advanced?.generator?.csv ?? {};
  if (targetFormat === "toml") return options.advanced?.generator?.toml ?? {};
  return options.extension?.generator ?? {};
}
