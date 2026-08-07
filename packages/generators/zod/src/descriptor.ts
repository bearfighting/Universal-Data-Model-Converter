import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrBundle,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { zodGeneratorCapabilities } from "./capabilities.js";
import { zodGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateZod } from "./api.js";
import type { ZodGeneratorOptions } from "./options.js";

export const zodGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  ZodGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "zod",
  capabilities: zodGeneratorCapabilities,
  options: zodGeneratorOptionCatalog,
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<ZodGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Zod generator requires Shape IR.",
      };
    }
    return tryGenerateZod(input.document, {
      ...(context.options ?? {}),
      ...(input.artifacts?.constraints
        ? { constraints: input.artifacts.constraints }
        : {}),
    });
  },
};
