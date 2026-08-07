import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrBundle,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { jsonSchemaGeneratorCapabilities } from "./capabilities.js";
import { jsonSchemaGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateJsonSchema } from "./api.js";
import type { JsonSchemaGeneratorOptions } from "./options.js";
import type { JsonSchemaOutput } from "./options.js";

export const jsonSchemaGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "json-schema",
  capabilities: jsonSchemaGeneratorCapabilities,
  options: jsonSchemaGeneratorOptionCatalog,
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<JsonSchemaGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The JSON Schema generator requires Shape IR.",
      };
    }
    return tryGenerateJsonSchema(input.document, {
      ...(context.options ?? {}),
      ...(input.artifacts?.constraints
        ? { constraints: input.artifacts.constraints }
        : {}),
    });
  },
};
