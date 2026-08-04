import type {
  SchemaDocument,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import { createObservations } from "./diagnostics.js";
import { renderZodDocument } from "./emit.js";
import type { ZodGenerateResult } from "./failure.js";
import {
  type ConfiguredZodGenerator,
  DEFAULT_ZOD_GENERATOR_OPTIONS,
  prepareZodGeneratorOptions,
  resolveZodGeneratorOptions,
  type ResolvedZodGeneratorOptions,
  type ZodGeneratorOptions,
} from "./options.js";
import { validateZodDocument } from "./validate.js";

const defaultConfiguredZodGenerator = configureZodGenerator();
const defaultZodGenerator = defaultConfiguredZodGenerator.generator;

export function generateZod(
  doc: SchemaDocument,
  options: ZodGeneratorOptions = {},
): string {
  const result = tryGenerateZod(doc, options);
  if (!result.ok)
    throw new Error(
      `Zod generation failed [${result.code}]: ${result.message}`,
    );
  return result.output;
}

export function tryGenerateZod(
  doc: SchemaDocument,
  options: ZodGeneratorOptions = {},
): ZodGenerateResult {
  return renderZodDocumentResult(doc, resolveZodGeneratorOptions(options));
}

export function createZodGenerator(
  options: ZodGeneratorOptions = {},
): SchemaGenerator<string, ZodGeneratorOptions, ZodGenerateResult> {
  return configureZodGenerator(options).generator;
}

export function configureZodGenerator(
  options: ZodGeneratorOptions = {},
): ConfiguredZodGenerator {
  const prepared = prepareZodGeneratorOptions(options);
  if (prepared.errors.length > 0)
    throw new Error(
      `Invalid Zod generator options: ${prepared.errors.join("; ")}`,
    );
  return {
    prepared,
    generator: {
      target: "zod",
      generate(document, runtimeOptions) {
        return renderZodDocumentResult(
          document,
          resolveZodGeneratorOptions({ ...options, ...runtimeOptions }),
        );
      },
    },
  };
}

export const zodGenerator: SchemaGenerator<
  string,
  ZodGeneratorOptions,
  ZodGenerateResult
> = defaultZodGenerator;
export const preparedZodGeneratorOptions =
  defaultConfiguredZodGenerator.prepared;
export { DEFAULT_ZOD_GENERATOR_OPTIONS };

function renderZodDocumentResult(
  doc: SchemaDocument,
  options: ResolvedZodGeneratorOptions,
): ZodGenerateResult {
  const validationFailure = validateZodDocument(doc, options);
  if (validationFailure !== null) return validationFailure;
  const observations = createObservations();
  const output = renderZodDocument(doc, options, observations);
  return {
    ok: true,
    output,
    ...(observations.diagnostics.length > 0
      ? { diagnostics: observations.diagnostics }
      : {}),
    ...(observations.semanticNotes.length > 0
      ? { semanticNotes: observations.semanticNotes }
      : {}),
  };
}
