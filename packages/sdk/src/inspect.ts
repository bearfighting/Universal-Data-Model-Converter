import {
  analyzeImplicitEntryFromSource,
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "./typescript-compatibility.js";

export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};

export function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis {
  return analyzeImplicitEntryFromSource(input);
}
