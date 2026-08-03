import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@aio/core";
import type { ConversionFormat, ConversionRegistry } from "./types.js";
import { defaultConversionRegistry } from "./registry.js";

export type ConsumerSurfaceFormat = ConversionFormat;

export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}

export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  capabilities: ConversionCapability[];
}

export interface FormatSupportSummary {
  format: ConsumerSurfaceFormat;
  parser?: ParserSupportSummary;
  generator?: GeneratorSupportSummary;
  sharedShapeKinds: string[];
  constraintFamilies: string[];
  notableLimitations: string[];
  experimentalAreas: string[];
}

const SHARED_SHAPE_KINDS = [
  "scalar",
  "literal",
  "object",
  "array",
  "tuple",
  "record",
  "union",
  "local-reference",
  "null",
  "optional-presence",
  "unknown",
] as const;

const CONSTRAINT_FAMILIES = [
  "string-constraints",
  "numeric-constraints",
  "collection-constraints",
  "object-constraints",
  "portable-annotations",
] as const;

const FORMAT_LIMITATIONS: Record<string, string[]> = {
  json: [
    "JSON inference is intentionally conservative and is not a universal schema inference engine.",
    "Mixed-type handling depends on parser inference options rather than one always-on widening rule.",
  ],
  "json-schema": [
    "JSON Schema support is limited to the current IR-aligned Draft 2020-12 subset.",
    "Validation-heavy and document-system features such as external references remain unsupported.",
    "Mixed fixed-field objects plus typed additionalProperties are not currently supported as one shared shape.",
  ],
  typescript: [
    "TypeScript support is limited to schema-oriented declarations rather than the full language.",
    "Single-file parsing is the current boundary, so imported or cross-file type resolution is unsupported.",
    "Function types, conditional types, mapped types, and intersection types are outside the current supported subset.",
    "TypeScript generation widens integer semantics to number and does not preserve constraint families directly.",
  ],
  zod: [
    "Zod output targets Zod 4 and assumes the consuming project installs zod.",
    "JavaScript output provides runtime schemas only; TypeScript output additionally emits z.infer types.",
    "Object openness without explicit IR evidence uses a strict-object target policy and reports a policy note.",
  ],
};

const FORMAT_EXPERIMENTAL_AREAS: Record<string, string[]> = {
  json: ["tuple-inference-modes", "record-inference-modes"],
  "json-schema": ["constraint-round-trip-through-shared-ir"],
  typescript: [
    "implicit-entry-selection",
    "enum-lowering-within-schema-subset",
  ],
  zod: ["javascript-output", "constraint-refinement-rendering"],
};

export function describeFormatSupport(
  format: ConsumerSurfaceFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary {
  const parser = findParser(format, registry);
  const generator = findGenerator(format, registry);
  return {
    format,
    ...(parser ? { parser: toParserSupportSummary(parser.capabilities) } : {}),
    ...(generator
      ? { generator: toGeneratorSupportSummary(generator.capabilities) }
      : {}),
    sharedShapeKinds: [...SHARED_SHAPE_KINDS],
    constraintFamilies: format === "json" ? [] : [...CONSTRAINT_FAMILIES],
    notableLimitations: [...(FORMAT_LIMITATIONS[format] ?? [])],
    experimentalAreas: [...(FORMAT_EXPERIMENTAL_AREAS[format] ?? [])],
  };
}

export function listFormatSupports(
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary[] {
  const formats = new Set<string>();
  for (const descriptor of registry.listParsers())
    formats.add(descriptor.format);
  for (const descriptor of registry.listGenerators())
    formats.add(descriptor.format);
  return [...formats].map((format) => describeFormatSupport(format, registry));
}

function findParser(format: string, registry: ConversionRegistry) {
  return registry
    .listParsers()
    .find((descriptor) => descriptor.format === format);
}

function findGenerator(format: string, registry: ConversionRegistry) {
  return registry
    .listGenerators()
    .find((descriptor) => descriptor.format === format);
}

function toParserSupportSummary(
  parserCapabilities: ParserCapabilities,
): ParserSupportSummary {
  return {
    producesIr: [...parserCapabilities.producesIr],
    capabilities: [...parserCapabilities.capabilities],
  };
}

function toGeneratorSupportSummary(
  generatorCapabilities: GeneratorCapabilities,
): GeneratorSupportSummary {
  return {
    consumesIr: [...generatorCapabilities.consumesIr],
    capabilities: [...generatorCapabilities.supportsCapabilities],
  };
}
