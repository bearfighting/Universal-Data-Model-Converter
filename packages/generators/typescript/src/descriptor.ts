import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
} from "@schema-transformation-toolkit/core";
import { typeScriptGeneratorCapabilities } from "./capabilities.js";
import {
  collectTypeScriptCapabilityRequirements,
  collectTypeScriptTargetLossHotspots,
  planTypeScriptSemanticLosses,
} from "./analysis.js";
import { typeScriptGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateTypeScript } from "./api.js";
import type { TypeScriptGeneratorOptions } from "./options.js";

export const typeScriptGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "typescript",
  capabilities: typeScriptGeneratorCapabilities,
  options: typeScriptGeneratorOptionCatalog,
  analysis: {
    collectCapabilityRequirements: collectTypeScriptCapabilityRequirements,
    collectLossHotspots: collectTypeScriptTargetLossHotspots,
    planSemanticLosses: planTypeScriptSemanticLosses,
  },
  generate(document, context: GeneratorExecutionContext) {
    return tryGenerateTypeScript(
      document,
      (context.options ?? {}) as TypeScriptGeneratorOptions,
    );
  },
};
