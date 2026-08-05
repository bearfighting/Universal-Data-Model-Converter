import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import ts from "typescript";

export function zodDiagnostic(options: {
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  sourceFile: ts.SourceFile;
  node: ts.Node;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: options.code,
    message: options.message,
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    source: "parser-zod",
    evidence: {
      sourceLocation: sourceLocation(options.sourceFile, options.node),
    },
  };
}

export function zodPolicyNote(options: {
  code: string;
  message: string;
  path?: string[];
  sourceFile: ts.SourceFile;
  node: ts.Node;
}): SchemaSemanticNote {
  return {
    kind: "policy",
    code: options.code,
    message: options.message,
    ...(options.path ? { path: options.path } : {}),
    nodeKind: "object",
    source: "parser-zod",
    layer: "shape",
    evidence: {
      sourceLocation: sourceLocation(options.sourceFile, options.node),
    },
  };
}

export function sourceLocation(
  sourceFile: ts.SourceFile,
  nodeOrStart: ts.Node | number,
  length?: number,
) {
  const startOffset =
    typeof nodeOrStart === "number"
      ? nodeOrStart
      : nodeOrStart.getStart(sourceFile);
  const endOffset =
    typeof nodeOrStart === "number"
      ? startOffset + (length ?? 0)
      : nodeOrStart.getEnd();
  const start = sourceFile.getLineAndCharacterOfPosition(startOffset);
  const end = sourceFile.getLineAndCharacterOfPosition(endOffset);
  return {
    start: {
      offset: startOffset,
      line: start.line + 1,
      column: start.character + 1,
    },
    end: {
      offset: endOffset,
      line: end.line + 1,
      column: end.character + 1,
    },
    length: endOffset - startOffset,
  };
}
