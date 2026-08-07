import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrBundle,
  SchemaDocument,
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

export const typeScriptGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  TypeScriptGeneratorOptions
> = {
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
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<TypeScriptGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The TypeScript generator requires Shape IR.",
      };
    }
    return tryGenerateTypeScript(input.document, context.options ?? {});
  },
};
