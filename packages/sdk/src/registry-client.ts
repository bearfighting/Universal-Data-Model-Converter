import type {
  GeneratorDescriptor,
  IrDocument,
  IrTransformerDescriptor,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import {
  resolveGeneratorDescriptor,
  resolveParserDescriptor,
  resolveTransformerDescriptor,
} from "./registry.js";
import type { ConversionFormat, ConversionRegistry } from "./types.js";

export function resolveParserFromRegistry(
  sourceFormat: ConversionFormat,
  registry: ConversionRegistry,
): ParserDescriptor {
  return resolveParserDescriptor(sourceFormat, registry);
}

export function resolveGeneratorFromRegistry<TOutput = unknown>(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry,
): GeneratorDescriptor<IrDocument, TOutput, unknown> {
  return resolveGeneratorDescriptor<TOutput>(targetFormat, registry);
}

export function resolveTransformerFromRegistry(
  id: string,
  registry: ConversionRegistry,
): IrTransformerDescriptor {
  return resolveTransformerDescriptor(id, registry);
}
