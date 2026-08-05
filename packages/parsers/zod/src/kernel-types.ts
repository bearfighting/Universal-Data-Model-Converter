import type {
  Constraint,
  ConstraintDocument,
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaNode,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import {
  schemaNullNode,
  schemaUnionNode,
} from "@schema-transformation-toolkit/core";
import ts from "typescript";
import type { ResolvedZodParseOptions } from "./options.js";

export type ExpressionUsage =
  "root" | "definition" | "field" | "tuple-element" | "nested";

export interface ParsedExpression {
  node: SchemaNode;
  presence: "required" | "optional";
  nullable: boolean;
}

export type BindingState = "unvisited" | "visiting" | "converted";

export interface ZodBindingTable {
  bindings: Map<string, ts.Expression>;
  exported: Set<string>;
  zBindingNames: Set<string>;
  importedBindings: Map<string, { source: string; node: ts.Node }>;
  reassignedBindings: Map<string, ts.Identifier>;
}

export interface ConstraintCollection {
  entries: Array<{ path: string[]; constraints: Constraint[] }>;
  add(path: string[], item: Constraint): void;
  replace(path: string[], item: Constraint): boolean;
  document(name: string): ConstraintDocument;
}

export interface ZodParserContext {
  sourceFile: ts.SourceFile;
  options: ResolvedZodParseOptions;
  bindings: ZodBindingTable;
  states: Map<string, BindingState>;
  definitions: SchemaDefinition[];
  constraints: ConstraintCollection;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
  ensureDefinition(name: string, edge: "reference" | "lazy"): void;
}

export type ParseExpression = (
  expression: ts.Expression,
  context: ZodParserContext,
  path: string[],
  usage: ExpressionUsage,
) => ParsedExpression;

export function materializeExpression(parsed: ParsedExpression): SchemaNode {
  if (parsed.nullable && parsed.node.kind !== "null") {
    return schemaUnionNode([parsed.node, schemaNullNode()]);
  }
  return parsed.node;
}
