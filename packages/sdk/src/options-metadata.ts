import type {
  OptionCatalog,
  OptionMetadata,
} from "@schema-transformation-toolkit/core";
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
  irPreference: OptionMetadata;
}

export const conversionIrPreferenceMetadata: OptionMetadata = {
  key: "irPreference",
  label: "Intermediate representation preference",
  description:
    "Selects whether the conversion should prefer Value IR, Shape IR, or the automatic route choice.",
  category: "selection",
  defaultValue: "auto",
  valueDescriptions: [
    {
      value: "auto",
      label: "Automatic",
      description:
        "Prefer Value IR when the route supports it, otherwise use Shape IR.",
    },
    {
      value: "value",
      label: "Value IR",
      description:
        "Require a Value IR route and fail if the route cannot consume it.",
    },
    {
      value: "shape",
      label: "Shape IR",
      description:
        "Require a Shape IR route and fail if the route cannot consume it.",
    },
  ],
  affectedStages: ["parse", "transform", "generate"],
  semanticEffect:
    "Controls the selected intermediate representation without changing the target format.",
  diagnosticEffect:
    "Unavailable forced preferences produce an unsupported-ir-preference failure.",
  examples: [
    {
      title: "Force Value IR for a JSON round-trip",
      input: '[1,"a"]',
      options: { irPreference: "value" },
      output: '[1,"a"]',
      explanation:
        "The route skips schema inference and serializes the Value IR directly.",
    },
  ],
  supported: true,
};

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
    irPreference: { ...conversionIrPreferenceMetadata },
  };
}

export function listOptionCatalogs(
  registry: ConversionRegistry = defaultConversionRegistry,
): OptionCatalog[] {
  return [...registry.listParsers(), ...registry.listGenerators()]
    .sort(
      (left, right) =>
        (left.options.role === "parser" ? 0 : 1) -
          (right.options.role === "parser" ? 0 : 1) ||
        left.options.format.localeCompare(right.options.format),
    )
    .map((descriptor) => cloneCatalog(descriptor.options));
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
