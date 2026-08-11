export type ConstraintSeverity = "info" | "warning" | "error";

export interface DecimalValue {
  representation: "decimal";
  value: string;
}

export type NumericValue = number | DecimalValue;

export type NumericConstraintKind =
  | "minimum"
  | "maximum"
  | "exclusive-minimum"
  | "exclusive-maximum"
  | "multiple-of";

export interface NumericConstraintSet {
  minimum?: NumericValue;
  maximum?: NumericValue;
  exclusiveMinimum?: NumericValue;
  exclusiveMaximum?: NumericValue;
  multipleOf?: NumericValue;
}

export type ConstraintTargetKind =
  "document" | "root" | "definition" | "field" | "node";

export interface ConstraintTarget {
  kind: ConstraintTargetKind;
  path: string[];
}

export interface Constraint {
  kind: string;
  severity?: ConstraintSeverity;
  message?: string;
  value?: unknown;
  evidence?: Record<string, unknown>;
}

export interface NumericConstraint extends Constraint {
  kind: NumericConstraintKind;
  value: NumericValue;
}

export interface ConstraintEntry {
  target: ConstraintTarget;
  constraints: Constraint[];
}

export type ConstraintClause = ConstraintEntry;

export interface ConstraintDocument {
  kind: "constraint-document";
  name: string;
  entries: ConstraintEntry[];
}
