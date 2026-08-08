import { executeGenerator } from "@schema-transformation-toolkit/core";
import type {
  ConstraintDocument,
  IrBundle,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { resolveGeneratorDescriptor } from "./registry.js";
import { defaultConversionRegistry } from "./registry.js";
import { generatorOptionsFor } from "./component-options.js";
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
    options: generatorOptionsFor(descriptor, options),
  });
  return result as import("@schema-transformation-toolkit/core").GenerateResult<TOutput>;
}
