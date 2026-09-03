import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { javaGeneratorCapabilities } from "./capabilities.js";
import { javaGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateJava } from "./api.js";
import type { JavaGeneratorOptions } from "./options.js";

export const javaGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  JavaGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "java",
  capabilities: javaGeneratorCapabilities,
  options: javaGeneratorOptionCatalog,
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<JavaGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document")
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Java generator requires Shape IR.",
      };
    return tryGenerateJava(input.document, context.options ?? {});
  },
};
