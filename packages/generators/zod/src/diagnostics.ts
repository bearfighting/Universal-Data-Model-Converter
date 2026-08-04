import type {
  Constraint,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";

export interface ZodSemanticObservations {
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
}

export function createObservations(): ZodSemanticObservations {
  return { diagnostics: [], semanticNotes: [] };
}

export function addPolicyNote(
  observations: ZodSemanticObservations,
  path: string[],
  message: string,
  evidence?: unknown,
): void {
  observations.semanticNotes.push({
    kind: "policy",
    code: "zod-object-policy",
    message,
    path,
    nodeKind: "object",
    source: "generator-zod",
    layer: "target",
    ...(evidence === undefined ? {} : { evidence }),
  });
}

export function addCaveat(
  observations: ZodSemanticObservations,
  code: string,
  message: string,
  path: string[],
  nodeKind: SchemaDiagnostic["nodeKind"],
  evidence?: unknown,
): void {
  observations.diagnostics.push({
    severity: "warning",
    code,
    message,
    path,
    ...(nodeKind === undefined ? {} : { nodeKind }),
    source: "generator-zod",
    ...(evidence === undefined ? {} : { evidence }),
  });
  observations.semanticNotes.push({
    kind: "loss",
    code,
    message,
    path,
    ...(nodeKind === undefined ? {} : { nodeKind }),
    source: "generator-zod",
    layer: "target",
    ...(evidence === undefined ? {} : { evidence }),
  });
}

export function constraintsAt(
  document: ConstraintDocument | undefined,
  path: string[],
): Constraint[] {
  return (document?.entries ?? [])
    .filter(
      (entry) =>
        entry.target.kind === "node" &&
        entry.target.path.length === path.length &&
        entry.target.path.every((segment, index) => segment === path[index]),
    )
    .flatMap((entry) => entry.constraints);
}

export function constraintValue(
  constraints: Constraint[],
  kind: string,
): unknown {
  return constraints.find((constraint) => constraint.kind === kind)?.value;
}
