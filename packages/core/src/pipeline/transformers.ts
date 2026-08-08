import { inferSchemaDocumentFromValueDocument } from "../value/internal.js";
import type { SchemaDocument } from "../schema/types.js";
import type { ValueDocument } from "../value/types.js";
import type { IrTransformerDescriptor } from "./descriptor-contracts.js";

export const valueToShapeTransformer: IrTransformerDescriptor<
  ValueDocument,
  SchemaDocument
> = {
  kind: "transformer",
  id: "value-to-shape",
  descriptorVersion: "0.1",
  inputIr: "value",
  outputIr: "shape",
  transform(input) {
    try {
      const shape = inferSchemaDocumentFromValueDocument(input.document);
      const previousArtifacts = { ...input.artifacts };
      delete previousArtifacts.shape;
      return {
        ok: true,
        document: shape,
        artifacts: {
          ...previousArtifacts,
          value: input.document,
        },
      };
    } catch {
      return {
        ok: false,
        code: "invalid-transformer-input",
        message: "Value IR could not be transformed into Shape IR.",
      };
    }
  },
};

export const defaultIrTransformers: readonly IrTransformerDescriptor[] = [
  valueToShapeTransformer,
];
