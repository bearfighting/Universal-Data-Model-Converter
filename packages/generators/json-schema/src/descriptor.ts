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
      return tryGenerateJsonSchema(document, {
        ...((context.options ?? {}) as JsonSchemaGeneratorOptions),
        ...(context.constraints ? { constraints: context.constraints } : {}),
      });
    },
  };
