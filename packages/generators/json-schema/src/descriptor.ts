import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
} from "@schema-transformation-toolkit/core";
import { jsonSchemaGeneratorCapabilities } from "./capabilities.js";
import { jsonSchemaGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateJsonSchema } from "./api.js";
import type { JsonSchemaGeneratorOptions } from "./options.js";
import type { JsonSchemaOutput } from "./options.js";

export const jsonSchemaGeneratorDescriptor: GeneratorDescriptor<JsonSchemaOutput> =
  {
    kind: "generator",
    descriptorVersion: "0.1",
    format: "json-schema",
    capabilities: jsonSchemaGeneratorCapabilities,
    options: jsonSchemaGeneratorOptionCatalog,
    generate(document, context: GeneratorExecutionContext) {
      if (document.kind !== "document") {
        return {
          ok: false,
          code: "invalid-generator-input",
          message: "The JSON Schema generator requires Shape IR.",
        };
      }
      return tryGenerateJsonSchema(document, {
        ...((context.options ?? {}) as JsonSchemaGeneratorOptions),
        ...(context.constraints ? { constraints: context.constraints } : {}),
      });
    },
  };
