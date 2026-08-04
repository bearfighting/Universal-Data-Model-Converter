import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
} from "@schema-transformation-toolkit/core";
import { openApiGeneratorCapabilities } from "./capabilities.js";
import { openApiGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateOpenApi } from "./api.js";
import type { OpenApiGeneratorOptions, OpenApiOutput } from "./options.js";

export const openApiGeneratorDescriptor: GeneratorDescriptor<OpenApiOutput> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "openapi",
  capabilities: openApiGeneratorCapabilities,
  options: openApiGeneratorOptionCatalog,
  generate(document, context: GeneratorExecutionContext) {
    return tryGenerateOpenApi(document, {
      ...((context.options ?? {}) as OpenApiGeneratorOptions),
      ...(context.constraints ? { constraints: context.constraints } : {}),
    });
  },
};
