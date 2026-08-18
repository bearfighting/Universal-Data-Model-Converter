import type {
  SchemaDocument,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import { renderPythonDocument } from "./emit.js";
import { PythonGenerationError, type PythonGenerateResult } from "./failure.js";
import {
  resolvePythonGeneratorOptions,
  type PythonGeneratorOptions,
} from "./options.js";

export function tryGeneratePython(
  document: SchemaDocument,
  options: PythonGeneratorOptions = {},
): PythonGenerateResult {
  resolvePythonGeneratorOptions(options);
  try {
    return { ok: true, output: renderPythonDocument(document) };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof PythonGenerationError
          ? error.code
          : "unsupported-python-node",
      message:
        error instanceof Error ? error.message : "Python generation failed.",
    };
  }
}

export function generatePython(
  document: SchemaDocument,
  options: PythonGeneratorOptions = {},
): string {
  const result = tryGeneratePython(document, options);
  if (!result.ok)
    throw new Error(
      `Python generation failed [${result.code}]: ${result.message}`,
    );
  return result.output;
}

export function createPythonGenerator(
  options: PythonGeneratorOptions = {},
): SchemaGenerator<string, PythonGeneratorOptions> {
  return {
    target: "python",
    generate(document) {
      return tryGeneratePython(document, options);
    },
  };
}

export const pythonGenerator = createPythonGenerator();
