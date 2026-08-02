import type { OptionCatalog } from "@aio/core";
import { jsonSchemaGeneratorOptionCatalog } from "@aio/generator-json-schema";
import { typeScriptGeneratorOptionCatalog } from "@aio/generator-typescript";
import { zodGeneratorOptionCatalog } from "@aio/generator-zod";
import { jsonParserOptionCatalog } from "@aio/parser-json";
import { jsonSchemaParserOptionCatalog } from "@aio/parser-json-schema";
import { typeScriptParserOptionCatalog } from "@aio/parser-typescript";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

const parserCatalogs: Record<ConversionSourceFormat, OptionCatalog> = {
  json: jsonParserOptionCatalog,
  "json-schema": jsonSchemaParserOptionCatalog,
  typescript: typeScriptParserOptionCatalog,
};

const generatorCatalogs: Record<ConversionTargetFormat, OptionCatalog> = {
  "json-schema": jsonSchemaGeneratorOptionCatalog,
  typescript: typeScriptGeneratorOptionCatalog,
  zod: zodGeneratorOptionCatalog,
};

export interface ConversionOptionCatalogs {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  parser: OptionCatalog;
  generator: OptionCatalog;
}

export function describeParserOptions(
  format: ConversionSourceFormat,
): OptionCatalog {
  return cloneCatalog(parserCatalogs[format]);
}

export function describeGeneratorOptions(
  format: ConversionTargetFormat,
): OptionCatalog {
  return cloneCatalog(generatorCatalogs[format]);
}

export function describeConversionOptions(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionOptionCatalogs {
  return {
    sourceFormat,
    targetFormat,
    parser: describeParserOptions(sourceFormat),
    generator: describeGeneratorOptions(targetFormat),
  };
}

export function listOptionCatalogs(): OptionCatalog[] {
  return [
    ...Object.values(parserCatalogs),
    ...Object.values(generatorCatalogs),
  ].map(cloneCatalog);
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
