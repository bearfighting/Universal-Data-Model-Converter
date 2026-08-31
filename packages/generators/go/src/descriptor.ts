import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { goGeneratorCapabilities } from "./capabilities.js";
import {
  collectGoCapabilityRequirements,
  collectGoLossHotspots,
  planGoSemanticLosses,
} from "./analysis.js";
import { goGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateGo } from "./api.js";
import type { GoGeneratorOptions } from "./options.js";
export const goGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  GoGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "go",
  capabilities: goGeneratorCapabilities,
  options: goGeneratorOptionCatalog,
  analysis: {
    collectCapabilityRequirements: collectGoCapabilityRequirements,
    collectLossHotspots: collectGoLossHotspots,
    planSemanticLosses: planGoSemanticLosses,
  },
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<GoGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document")
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Go generator requires Shape IR.",
      };
    return tryGenerateGo(
      input.document,
      context.options ?? {},
      input.artifacts?.constraints,
    );
  },
};
