import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintSeverity,
  ConstraintTarget,
  ConstraintTargetKind,
  DecimalValue,
  NumericConstraint,
  NumericConstraintKind,
  NumericConstraintSet,
  NumericValue,
} from "./types.js";
import { validateIntegerNumericValue } from "./numeric.js";

export function decimalValue(value: string): DecimalValue {
  validateDecimalString(value);
  return { representation: "decimal", value: normalizeDecimalString(value) };
}

export function numericConstraint(
  kind: NumericConstraintKind,
  value: NumericValue,
  options?: Omit<Parameters<typeof constraint>[1], "value">,
): NumericConstraint {
  return {
    ...constraint(kind, { ...options, value }),
    kind,
    value,
  };
}

export function integerRangeConstraint(
  range: Pick<NumericConstraintSet, "minimum" | "maximum">,
  options?: Omit<Parameters<typeof constraint>[1], "value">,
): NumericConstraint[] {
  if (range.minimum !== undefined) validateIntegerNumericValue(range.minimum);
  if (range.maximum !== undefined) validateIntegerNumericValue(range.maximum);
  return [
    ...(range.minimum === undefined
      ? []
      : [numericConstraint("minimum", range.minimum, options)]),
    ...(range.maximum === undefined
      ? []
      : [numericConstraint("maximum", range.maximum, options)]),
  ];
}

export function numberRangeConstraint(
  range: Pick<NumericConstraintSet, "minimum" | "maximum">,
  options?: Omit<Parameters<typeof constraint>[1], "value">,
): NumericConstraint[] {
  return [
    ...(range.minimum === undefined
      ? []
      : [numericConstraint("minimum", range.minimum, options)]),
    ...(range.maximum === undefined
      ? []
      : [numericConstraint("maximum", range.maximum, options)]),
  ];
}

function validateDecimalString(value: string): void {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(
      `Invalid decimal value "${value}". Use a canonical decimal string without exponent notation.`,
    );
  }
}

function normalizeDecimalString(value: string): string {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer = "0", fraction] = unsigned.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  const normalizedFraction = fraction?.replace(/0+$/, "");
  const normalized = normalizedFraction
    ? `${normalizedInteger}.${normalizedFraction}`
    : normalizedInteger;
  return normalized === "0" ? "0" : negative ? `-${normalized}` : normalized;
}

export function constraintTarget(
  kind: ConstraintTargetKind,
  path: string[] = [],
): ConstraintTarget {
  return {
    kind,
    path,
  };
}

export function constraint(
  kind: string,
  options?: {
    severity?: Constraint["severity"];
    message?: string;
    value?: unknown;
    evidence?: Record<string, unknown>;
  },
): Constraint {
  return {
    kind,
    ...(options?.severity ? { severity: options.severity } : {}),
    ...(options?.message ? { message: options.message } : {}),
    ...(options && "value" in options ? { value: options.value } : {}),
    ...(options?.evidence ? { evidence: options.evidence } : {}),
  };
}

export function constraintEntry(
  target: ConstraintTarget,
  constraints: Constraint[],
): ConstraintEntry {
  return {
    target,
    constraints,
  };
}

export function constraintClause(
  kind: string,
  path: string[],
  message: string,
  severity: ConstraintSeverity = "info",
  evidence?: Record<string, unknown>,
): ConstraintClause {
  return constraintEntry(constraintTarget("node", path), [
    constraint(kind, {
      message,
      severity,
      ...(evidence ? { evidence } : {}),
    }),
  ]);
}

export function constraintDocument(
  name: string,
  entries: ConstraintEntry[] = [],
): ConstraintDocument {
  return {
    kind: "constraint-document",
    name,
    entries,
  };
}
