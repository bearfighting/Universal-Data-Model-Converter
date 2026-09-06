import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { kotlinGeneratorCapabilities } from "./capabilities.js";
import { kotlinGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateKotlin } from "./api.js";
import type { KotlinGeneratorOptions } from "./options.js";
export const kotlinGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  KotlinGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "kotlin",
  capabilities: kotlinGeneratorCapabilities,
  options: kotlinGeneratorOptionCatalog,
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<KotlinGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document")
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Kotlin generator requires Shape IR.",
      };
    return tryGenerateKotlin(
      input.document,
      context.options ?? {},
      input.artifacts?.constraints,
    );
  },
};
