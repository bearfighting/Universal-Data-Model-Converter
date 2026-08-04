import type {
  ConstraintDocument,
  ConversionCapability,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";

export type SemanticFixtureFormatId = "json" | "json-schema" | "typescript";
export type SemanticFixtureCoverageSubject =
  | SemanticFixtureFormatId
  | "generator:json-schema"
  | "generator:typescript"
  | "generator:zod";
export type SemanticFixtureGeneratorId =
  "generator:json-schema" | "generator:typescript" | "generator:zod";
export type SemanticFixtureRouteId =
  `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`;

export type SemanticFixtureSupportLevel =
  | "exact"
  | "normalized"
  | "inferred"
  | "lowered"
  | "lossy"
  | "unsupported"
  | "not-applicable";

export interface TypeScriptSemanticFixtureSource {
  input: string;
  options?: TypeScriptParseOptions;
}

export interface JsonSchemaSemanticFixtureSource {
  input: unknown;
  options?: JsonSchemaParseOptions;
}

export interface JsonSemanticFixtureSource {
  input: string;
  options?: JsonParseOptions;
}

export interface SemanticFixtureGeneratorExpectation {
  diagnosticCodes?: string[];
  semanticNoteCodes?: string[];
}

export interface SemanticFixtureValidationExamples {
  valid: unknown[];
  invalid: unknown[];
}

export interface SemanticFixtureConversionExpectation {
  semanticCaveatCodes?: string[];
  semanticLosses?: Array<{
    lostCapability: ConversionCapability;
    sourcePath: string[];
  }>;
}

export interface SemanticFixture {
  id: string;
  description: string;
  validationExamples?: SemanticFixtureValidationExamples;
  canonicalShape: SchemaDocument;
  canonicalConstraints?: ConstraintDocument;
  sources: Partial<{
    json: JsonSemanticFixtureSource;
    "json-schema": JsonSchemaSemanticFixtureSource;
    typescript: TypeScriptSemanticFixtureSource;
  }>;
  support: Partial<
    Record<SemanticFixtureFormatId, SemanticFixtureSupportLevel>
  >;
  capabilityCoverage?: Partial<
    Record<SemanticFixtureCoverageSubject, ConversionCapability[]>
  >;
  generatorExpectations?: Partial<
    Record<SemanticFixtureGeneratorId, SemanticFixtureGeneratorExpectation>
  >;
  conversionExpectations?: Partial<
    Record<SemanticFixtureRouteId, SemanticFixtureConversionExpectation>
  >;
}
