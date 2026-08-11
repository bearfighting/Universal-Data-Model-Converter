import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { rustGeneratorCapabilities } from "./capabilities.js";
import {
  collectRustCapabilityRequirements,
  collectRustLossHotspots,
  planRustSemanticLosses,
} from "./analysis.js";
import { rustGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateRust } from "./api.js";
import type { RustGeneratorOptions } from "./options.js";

export const rustGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  RustGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "rust",
  capabilities: rustGeneratorCapabilities,
  options: rustGeneratorOptionCatalog,
  analysis: {
    collectCapabilityRequirements: collectRustCapabilityRequirements,
    collectLossHotspots: collectRustLossHotspots,
    planSemanticLosses: planRustSemanticLosses,
  },
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<RustGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document")
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Rust generator requires Shape IR.",
      };
    return tryGenerateRust(
      input.document,
      context.options ?? {},
      input.artifacts?.constraints,
    );
  },
};
