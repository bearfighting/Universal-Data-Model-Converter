import type { ConstraintDocument, SchemaDocument } from "@aio/core";
import {
  tryGenerateJsonSchema,
  type JsonSchemaOutput,
} from "@aio/generator-json-schema";
import { tryGenerateTypeScript } from "@aio/generator-typescript";
import { tryGenerateZod } from "@aio/generator-zod";
import type { ConvertOptions, ConversionTargetFormat } from "./types.js";

export type GeneratedOutput = string | JsonSchemaOutput;

export function generateTarget(
  document: SchemaDocument,
  targetFormat: ConversionTargetFormat,
  options: ConvertOptions,
  constraints?: ConstraintDocument,
) {
  if (targetFormat === "typescript") {
    return tryGenerateTypeScript(
      document,
      options.advanced?.generator?.typeScript ?? {},
    );
  }

  if (targetFormat === "zod") {
    return tryGenerateZod(document, {
      ...(options.advanced?.generator?.zod ?? {}),
      ...(constraints ? { constraints } : {}),
    });
  }

  return tryGenerateJsonSchema(document, {
    ...(options.advanced?.generator?.jsonSchema ?? {}),
    ...(constraints ? { constraints } : {}),
  });
}
