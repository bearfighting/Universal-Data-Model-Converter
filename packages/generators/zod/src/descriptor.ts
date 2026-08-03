import type { GeneratorDescriptor, GeneratorExecutionContext } from "@aio/core";
import { zodGeneratorCapabilities } from "./capabilities.js";
import { zodGeneratorOptionCatalog } from "./option-metadata.js";
import { tryGenerateZod } from "./api.js";
import type { ZodGeneratorOptions } from "./options.js";

export const zodGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "zod",
  capabilities: zodGeneratorCapabilities,
  options: zodGeneratorOptionCatalog,
  generate(document, context: GeneratorExecutionContext) {
    return tryGenerateZod(document, {
      ...((context.options ?? {}) as ZodGeneratorOptions),
      ...(context.constraints ? { constraints: context.constraints } : {}),
    });
  },
};
