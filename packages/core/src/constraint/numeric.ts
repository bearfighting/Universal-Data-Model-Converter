import type {
  Constraint,
  ConstraintDocument,
  NumericConstraint,
  NumericConstraintKind,
  NumericConstraintSet,
  NumericValue,
} from "./types.js";
import {
  isConstraint,
  isNumericConstraint,
  isNumericConstraintKind,
  isNumericValue,
} from "./guards.js";

const KIND_TO_FIELD: Record<NumericConstraintKind, keyof NumericConstraintSet> =
  {
    minimum: "minimum",
    maximum: "maximum",
    "exclusive-minimum": "exclusiveMinimum",
    "exclusive-maximum": "exclusiveMaximum",
    "multiple-of": "multipleOf",
  };

export function validateNumericValue(value: NumericValue): void {
  if (!isNumericValue(value)) {
    throw new Error("Invalid numeric constraint value.");
  }
}

export function validateIntegerNumericValue(value: NumericValue): void {
  validateNumericValue(value);
  if (
    (typeof value === "number" && !Number.isInteger(value)) ||
    (typeof value !== "number" && value.value.includes("."))
  ) {
    throw new Error("Integer constraints require integer numeric values.");
  }
}

export function validateNumericConstraint(constraint: Constraint): void {
  const kind = constraint.kind;
  if (!isNumericConstraint(constraint)) {
    throw new Error(
      `Invalid numeric constraint "${String(kind)}": the value must be a finite number or DecimalValue.`,
    );
  }

  const numericValue = constraint.value;
  if (
    constraint.kind === "multiple-of" &&
    compareNumericValues(numericValue, 0) <= 0
  ) {
    throw new Error("The multiple-of constraint must be greater than zero.");
  }
}

export function compareNumericValues(
  left: NumericValue,
  right: NumericValue,
): number {
  validateNumericValue(left);
  validateNumericValue(right);
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  const leftInteger = a.sign * a.digits * 10n ** BigInt(scale - a.scale);
  const rightInteger = b.sign * b.digits * 10n ** BigInt(scale - b.scale);
  return leftInteger < rightInteger ? -1 : leftInteger > rightInteger ? 1 : 0;
}

/** Compares the semantic value of two numeric constraints, ignoring metadata. */
export function areEquivalentNumericConstraints(
  left: Constraint,
  right: Constraint,
): boolean {
  if (!isNumericConstraint(left) || !isNumericConstraint(right)) return false;
  return (
    left.kind === right.kind &&
    compareNumericValues(left.value, right.value) === 0
  );
}

/** Compares numeric constraint sets without depending on object property order. */
export function areEquivalentNumericConstraintSets(
  left: NumericConstraintSet,
  right: NumericConstraintSet,
): boolean {
  const fields: readonly (keyof NumericConstraintSet)[] = [
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ];

  return fields.every((field) => {
    const leftValue = left[field];
    const rightValue = right[field];
    if (leftValue === undefined || rightValue === undefined) {
      return leftValue === rightValue;
    }
    return compareNumericValues(leftValue, rightValue) === 0;
  });
}

/** Returns a number only when converting a numeric value preserves its canonical value. */
export function numericValueToSafeNumber(
  value: NumericValue,
): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;

  const number = Number(value.value);
  return Number.isFinite(number) && String(number) === value.value
    ? number
    : undefined;
}

export function mergeNumericConstraints(
  constraints: readonly Constraint[],
): NumericConstraintSet {
  const merged: NumericConstraintSet = {};

  for (const candidate of constraints) {
    if (!isConstraint(candidate) || !isNumericConstraintKind(candidate.kind)) {
      continue;
    }
    if (!isNumericConstraint(candidate)) {
      throw new Error(
        `Invalid numeric constraint "${candidate.kind}": the value must be a finite number or DecimalValue.`,
      );
    }
    validateNumericConstraint(candidate);
    const field = KIND_TO_FIELD[candidate.kind as NumericConstraintKind];
    const existing = merged[field];
    const candidateValue = candidate.value;
    if (existing === undefined) {
      merged[field] = candidateValue;
      continue;
    }

    if (candidate.kind === "multiple-of") {
      if (compareNumericValues(existing, candidateValue) !== 0) {
        throw new Error(
          `Conflicting numeric constraints for "${candidate.kind}".`,
        );
      }
      continue;
    }

    const comparison = compareNumericValues(candidateValue, existing);
    const isLowerBound =
      candidate.kind === "minimum" || candidate.kind === "exclusive-minimum";
    if ((isLowerBound && comparison > 0) || (!isLowerBound && comparison < 0)) {
      merged[field] = candidateValue;
    }
  }

  const lower = selectLowerBound(merged);
  const upper = selectUpperBound(merged);
  if (
    lower !== undefined &&
    upper !== undefined &&
    (compareNumericValues(lower.value, upper.value) > 0 ||
      (compareNumericValues(lower.value, upper.value) === 0 &&
        (lower.exclusive || upper.exclusive)))
  ) {
    throw new Error("Numeric minimum cannot be greater than numeric maximum.");
  }

  return merged;
}

function selectLowerBound(
  constraints: NumericConstraintSet,
): { value: NumericValue; exclusive: boolean } | undefined {
  const inclusive = constraints.minimum;
  const exclusive = constraints.exclusiveMinimum;
  if (inclusive === undefined && exclusive === undefined) return undefined;
  if (inclusive === undefined) return { value: exclusive!, exclusive: true };
  if (exclusive === undefined) return { value: inclusive, exclusive: false };

  const comparison = compareNumericValues(inclusive, exclusive);
  return comparison > 0
    ? { value: inclusive, exclusive: false }
    : { value: exclusive, exclusive: true };
}

function selectUpperBound(
  constraints: NumericConstraintSet,
): { value: NumericValue; exclusive: boolean } | undefined {
  const inclusive = constraints.maximum;
  const exclusive = constraints.exclusiveMaximum;
  if (inclusive === undefined && exclusive === undefined) return undefined;
  if (inclusive === undefined) return { value: exclusive!, exclusive: true };
  if (exclusive === undefined) return { value: inclusive, exclusive: false };

  const comparison = compareNumericValues(inclusive, exclusive);
  return comparison < 0
    ? { value: inclusive, exclusive: false }
    : { value: exclusive, exclusive: true };
}

export function getNumericConstraintsAtPath(
  document: ConstraintDocument,
  path: readonly string[],
): NumericConstraint[] {
  return document.entries
    .filter(
      (entry) =>
        entry.target.path.length === path.length &&
        entry.target.path.every((segment, index) => segment === path[index]),
    )
    .flatMap((entry) =>
      entry.constraints.flatMap((constraint) => {
        if (!isNumericConstraintKind(constraint.kind)) return [];
        if (!isNumericConstraint(constraint)) {
          throw new Error(
            `Invalid numeric constraint "${constraint.kind}": the value must be a finite number or DecimalValue.`,
          );
        }
        return [constraint];
      }),
    );
}

function parseDecimal(value: NumericValue): {
  sign: bigint;
  digits: bigint;
  scale: number;
} {
  const raw = expandExponent(
    typeof value === "number" ? String(value) : value.value,
  );
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const parts = unsigned.split(".");
  const integer = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  return {
    sign: negative ? -1n : 1n,
    digits: BigInt(`${integer}${fraction}` || "0"),
    scale: fraction.length,
  };
}

function expandExponent(value: string): string {
  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return value;

  const sign = match[1] ?? "";
  const integer = match[2] ?? "0";
  const fraction = match[3] ?? "";
  const exponentText = match[4] ?? "0";
  const digits = `${integer}${fraction}`;
  const decimalPosition = integer.length + Number(exponentText);

  if (decimalPosition <= 0) {
    return `${sign}0.${"0".repeat(-decimalPosition)}${digits}`;
  }

  if (decimalPosition >= digits.length) {
    return `${sign}${digits}${"0".repeat(decimalPosition - digits.length)}`;
  }

  return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}
