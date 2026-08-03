import type { OptionCatalog } from "@aio/core";
import {
  resolveGeneratorDescriptor,
  resolveParserDescriptor,
  defaultConversionRegistry,
} from "./registry.js";
import type {
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

export interface ConversionOptionCatalogs {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  parser: OptionCatalog;
  generator: OptionCatalog;
}

export function describeParserOptions(
  format: ConversionSourceFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): OptionCatalog {
  return cloneCatalog(resolveParserDescriptor(format, registry).options);
}

export function describeGeneratorOptions(
  format: ConversionTargetFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): OptionCatalog {
  return cloneCatalog(resolveGeneratorDescriptor(format, registry).options);
}

export function describeConversionOptions(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionOptionCatalogs {
  return {
    sourceFormat,
    targetFormat,
    parser: describeParserOptions(sourceFormat, registry),
    generator: describeGeneratorOptions(targetFormat, registry),
  };
}

export function listOptionCatalogs(
  registry: ConversionRegistry = defaultConversionRegistry,
): OptionCatalog[] {
  return [...registry.listParsers(), ...registry.listGenerators()].map(
    (descriptor) => cloneCatalog(descriptor.options),
  );
}

function cloneCatalog(catalog: OptionCatalog): OptionCatalog {
  return {
    ...catalog,
    options: catalog.options.map((option) => ({
      ...option,
      affectedStages: [...option.affectedStages],
      ...(option.valueDescriptions
        ? {
            valueDescriptions: option.valueDescriptions.map((value) => ({
              ...value,
              ...(value.example
                ? { example: cloneExample(value.example) }
                : {}),
            })),
          }
        : {}),
      examples: option.examples.map((example) => ({
        ...cloneExample(example),
      })),
    })),
  };
}

function cloneExample(
  example: OptionCatalog["options"][number]["examples"][number],
) {
  return {
    ...example,
    options: { ...example.options },
    ...(example.diagnostics ? { diagnostics: [...example.diagnostics] } : {}),
  };
}
