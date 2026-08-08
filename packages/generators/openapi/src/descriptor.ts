import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrBundle,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { openApiGeneratorCapabilities } from "./capabilities.js";
import { openApiGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateOpenApi } from "./api.js";
import type { OpenApiGeneratorOptions, OpenApiOutput } from "./options.js";

export const openApiGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  OpenApiOutput,
  OpenApiGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "openapi",
  capabilities: openApiGeneratorCapabilities,
  options: openApiGeneratorOptionCatalog,
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<OpenApiGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The OpenAPI generator requires Shape IR.",
      };
    }
    return tryGenerateOpenApi(input.document, {
      ...(context.options ?? {}),
      ...(input.artifacts?.constraints
        ? { constraints: input.artifacts.constraints }
        : {}),
    });
  },
};
