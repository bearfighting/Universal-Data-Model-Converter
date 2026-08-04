import {
  analyzeImplicitEntryFromSource,
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "@schema-transformation-toolkit/parser-typescript";

export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};

export function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis {
  return analyzeImplicitEntryFromSource(input);
}
