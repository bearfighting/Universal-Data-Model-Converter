import { describe, expect, it } from "vitest";
import {
  areEquivalentSchemaNodes,
  areEquivalentSchemaNodesWithRepresentation,
  areEquivalentNumericConstraintSets,
  areEquivalentNumericConstraints,
  constraint,
  compareNumericValues,
  decimalValue,
  getNumericConstraintsAtPath,
  integerRangeConstraint,
  isDecimalValue,
  isNumericConstraint,
  mergeNumericConstraints,
  numericConstraint,
  numberRangeConstraint,
  schemaScalarNode,
  tryValidateSchemaDocument,
  tryValidateIrDocument,
  validateNumericConstraint,
} from "@schema-transformation-toolkit/core";

describe("primitive IR extensions", () => {
  it("keeps representation hints optional and separate from semantic equivalence", () => {
    const plain = schemaScalarNode("integer");
    const unsignedByte = schemaScalarNode("integer", {
      representation: {
        family: "integer",
        signedness: "unsigned",
        widthBits: 8,
      },
    });

    expect(areEquivalentSchemaNodes(plain, unsignedByte)).toBe(true);
    expect(
      areEquivalentSchemaNodesWithRepresentation(plain, unsignedByte),
    ).toBe(false);
    expect(
      areEquivalentSchemaNodesWithRepresentation(unsignedByte, {
        ...unsignedByte,
        representation: {
          widthBits: 8,
          signedness: "unsigned",
          family: "integer",
        },
      }),
    ).toBe(true);
    expect(
      areEquivalentSchemaNodesWithRepresentation(unsignedByte, {
        ...unsignedByte,
        representation: { ...unsignedByte.representation!, widthBits: 16 },
      }),
    ).toBe(false);
  });

  it("rejects incompatible scalar representation hints", () => {
    expect(() =>
      schemaScalarNode("string", {
        representation: {
          family: "integer",
          signedness: "unsigned",
          widthBits: 8,
        },
      }),
    ).toThrow(/Invalid scalar representation hint/);

    expect(() =>
      schemaScalarNode("number", {
        representation: { family: "float", signedness: "signed" },
      }),
    ).toThrow(/Invalid scalar representation hint/);

    expect(
      schemaScalarNode("integer", {
        representation: { family: "integer", widthBits: 32 },
      }),
    ).toEqual({
      kind: "scalar",
      scalar: "integer",
      representation: { family: "integer", widthBits: 32 },
    });
  });

  it("normalizes and validates exact decimal values", () => {
    expect(decimalValue("0001")).toEqual({
      representation: "decimal",
      value: "1",
    });
    expect(decimalValue("-12.3400")).toEqual({
      representation: "decimal",
      value: "-12.34",
    });
    expect(isDecimalValue(decimalValue("18446744073709551615"))).toBe(true);
    expect(() => decimalValue("1e3")).toThrow(/canonical decimal string/);
    expect(isDecimalValue({ representation: "decimal", value: "1.0" })).toBe(
      false,
    );
    expect(compareNumericValues(decimalValue("1"), 1)).toBe(0);
    expect(() => compareNumericValues(Number.NaN, 1)).toThrow(
      /Invalid numeric constraint value/,
    );
  });

  it("creates and merges typed numeric constraints", () => {
    const constraints = integerRangeConstraint({
      minimum: decimalValue("0"),
      maximum: decimalValue("255"),
    });

    expect(constraints).toHaveLength(2);
    expect(constraints.every(isNumericConstraint)).toBe(true);
    expect(mergeNumericConstraints(constraints)).toEqual({
      minimum: { representation: "decimal", value: "0" },
      maximum: { representation: "decimal", value: "255" },
    });

    expect(
      mergeNumericConstraints([
        numericConstraint("minimum", 0),
        numericConstraint("minimum", 5),
        numericConstraint("maximum", 100),
        numericConstraint("maximum", 80),
      ]),
    ).toEqual({ minimum: 5, maximum: 80 });

    expect(() =>
      integerRangeConstraint({ minimum: decimalValue("0.5") }),
    ).toThrow(/Integer constraints require/);
    expect(numberRangeConstraint({ minimum: decimalValue("0.5") })).toEqual([
      numericConstraint("minimum", decimalValue("0.5")),
    ]);
  });

  it("compares numeric constraints by semantic value", () => {
    expect(
      areEquivalentNumericConstraints(
        numericConstraint("minimum", 1, { message: "left" }),
        numericConstraint("minimum", decimalValue("1"), {
          message: "right",
        }),
      ),
    ).toBe(true);
    expect(
      areEquivalentNumericConstraints(
        numericConstraint("minimum", 1),
        numericConstraint("exclusive-minimum", 1),
      ),
    ).toBe(false);
    expect(
      areEquivalentNumericConstraintSets(
        { maximum: decimalValue("10"), minimum: 1 },
        { minimum: decimalValue("1"), maximum: 10 },
      ),
    ).toBe(true);
  });

  it("compares numeric values without losing large integer precision", () => {
    expect(
      mergeNumericConstraints([
        numericConstraint("minimum", decimalValue("18446744073709551615")),
        numericConstraint("maximum", decimalValue("18446744073709551615")),
      ]),
    ).toEqual({
      minimum: { representation: "decimal", value: "18446744073709551615" },
      maximum: { representation: "decimal", value: "18446744073709551615" },
    });
  });

  it("reports conflicting numeric constraints", () => {
    expect(
      mergeNumericConstraints([
        numericConstraint("minimum", 1),
        numericConstraint("minimum", 2),
      ]),
    ).toEqual({ minimum: 2 });

    expect(() =>
      validateNumericConstraint(numericConstraint("multiple-of", 0)),
    ).toThrow(/greater than zero/);

    expect(() =>
      mergeNumericConstraints([
        numericConstraint("minimum", 5),
        numericConstraint("exclusive-maximum", 5),
      ]),
    ).toThrow(/Numeric minimum cannot be greater/);

    expect(() =>
      mergeNumericConstraints([constraint("minimum", { value: "invalid" })]),
    ).toThrow(/Invalid numeric constraint/);

    expect(() =>
      mergeNumericConstraints([
        numericConstraint("exclusive-minimum", 5),
        numericConstraint("maximum", 5),
      ]),
    ).toThrow(/Numeric minimum cannot be greater/);
  });

  it("finds numeric constraints at a node path", () => {
    const document = {
      kind: "constraint-document" as const,
      name: "User",
      entries: [
        {
          target: { kind: "field" as const, path: ["root", "id"] },
          constraints: [constraint("minimum", { value: 0 })],
        },
      ],
    };

    expect(getNumericConstraintsAtPath(document, ["root", "id"])).toHaveLength(
      1,
    );
    expect(getNumericConstraintsAtPath(document, ["root", "name"])).toEqual([]);
  });

  it("validates representation hints on directly constructed documents", () => {
    const result = tryValidateSchemaDocument({
      version: "0.1",
      kind: "document",
      name: { source: "Invalid", words: ["Invalid"] },
      definitions: [],
      root: {
        kind: "scalar",
        scalar: "string",
        representation: {
          family: "integer",
          widthBits: 8,
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: "invalid-scalar-representation" }],
    });
  });

  it("validates known numeric constraints while preserving unknown values", () => {
    expect(
      tryValidateIrDocument({
        kind: "constraint-document",
        name: "Legacy",
        entries: [
          {
            target: { kind: "node", path: ["root"] },
            constraints: [constraint("custom", { value: { arbitrary: true } })],
          },
        ],
      }),
    ).toEqual({ ok: true });

    expect(
      tryValidateIrDocument({
        kind: "constraint-document",
        name: "Invalid",
        entries: [
          {
            target: { kind: "node", path: ["root"] },
            constraints: [constraint("minimum", { value: "invalid" })],
          },
        ],
      }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: "invalid-numeric-constraint" }],
    });
  });
});
