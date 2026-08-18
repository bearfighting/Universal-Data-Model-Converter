import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { pythonGeneratorCapabilities } from "./capabilities.js";
import {
  collectPythonTargetLossHotspots,
  planPythonSemanticLosses,
} from "./analysis.js";
import { tryGeneratePython } from "./api.js";
import { pythonGeneratorOptionCatalog } from "./option-metadata.js";
import type { PythonGeneratorOptions } from "./options.js";

export const pythonGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  PythonGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "python",
  capabilities: pythonGeneratorCapabilities,
  options: pythonGeneratorOptionCatalog,
  analysis: {
    collectLossHotspots: collectPythonTargetLossHotspots,
    planSemanticLosses: planPythonSemanticLosses,
  },
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<PythonGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document")
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The Python generator requires Shape IR.",
      };
    return tryGeneratePython(input.document, context.options ?? {});
  },
};
