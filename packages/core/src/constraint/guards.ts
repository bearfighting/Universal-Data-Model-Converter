import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintTarget,
  DecimalValue,
  NumericConstraintKind,
  NumericConstraint,
  NumericValue,
} from "./types.js";

const NUMERIC_CONSTRAINT_KINDS: readonly NumericConstraintKind[] = [
  "minimum",
  "maximum",
  "exclusive-minimum",
  "exclusive-maximum",
  "multiple-of",
];

export function isNumericConstraintKind(
  kind: string,
): kind is NumericConstraintKind {
  return NUMERIC_CONSTRAINT_KINDS.includes(kind as NumericConstraintKind);
}

export function isDecimalValue(value: unknown): value is DecimalValue {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { representation?: unknown }).representation === "decimal" &&
    typeof (value as { value?: unknown }).value === "string" &&
    /^-?(?:0|[1-9]\d*)(?:\.[0-9]*[1-9])?$/.test(
      (value as { value: string }).value,
    )
  );
}

export function isNumericValue(value: unknown): value is NumericValue {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    isDecimalValue(value)
  );
}

export function isConstraintTarget(value: unknown): value is ConstraintTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "path" in value
  );
}

export function isConstraint(value: unknown): value is Constraint {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

export function isNumericConstraint(
  value: unknown,
): value is NumericConstraint {
  return (
    isConstraint(value) &&
    isNumericConstraintKind(value.kind) &&
    isNumericValue(value.value)
  );
}

export function isConstraintEntry(value: unknown): value is ConstraintEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "target" in value &&
    "constraints" in value
  );
}

export function isConstraintClause(value: unknown): value is ConstraintClause {
  return isConstraintEntry(value);
}

export function isConstraintDocument(
  value: unknown,
): value is ConstraintDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind?: unknown }).kind === "constraint-document" &&
    "name" in value &&
    "entries" in value
  );
}
