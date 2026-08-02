import type { OptionCatalog, OptionMetadataExample } from "@aio/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
  details: Pick<
    OptionMetadataExample,
    "input" | "output" | "semanticChange" | "diagnostics"
  > = {},
): OptionMetadataExample => ({ title, options, explanation, ...details });

const values = (
  entries: Array<
    [
      string | number | boolean | null,
      string,
      string,
      string,
      OptionMetadataExample,
    ]
  >,
) =>
  entries.map(([value, label, description, semanticEffect, valueExample]) => ({
    value,
    label,
    description,
    semanticEffect,
    example: valueExample,
  }));

export const jsonParserOptionCatalog: OptionCatalog = {
  format: "json",
  role: "parser",
  options: [
    {
      key: "name",
      label: "Document name",
      description: "Sets the root document name used by downstream generators.",
      category: "output",
      defaultValue: "JsonDocument",
      affectedStages: ["parse", "generate"],
      semanticEffect:
        "Does not change the data shape; it changes the generated root declaration name.",
      diagnosticEffect:
        "Invalid names can be rejected by a target generator's naming validation.",
      supported: true,
      examples: [
        example(
          "Name the generated document",
          { name: "Order" },
          "Use a domain name so generated declarations are meaningful.",
        ),
      ],
    },
    {
      key: "strictness",
      label: "Parser strictness",
      description:
        "Controls acceptance policy for JSON decoding and inference.",
      category: "semantics",
      defaultValue: "strict",
      affectedStages: ["parse"],
      semanticEffect:
        "Strict mode rejects input or options outside the currently supported JSON boundary.",
      diagnosticEffect:
        "Invalid JSON or unsupported option values fail explicitly.",
      supported: true,
      valueDescriptions: [
        {
          value: "strict",
          label: "Strict",
          description: "Use the current strict JSON parsing policy.",
          semanticEffect:
            "Avoids silently accepting invalid or unsupported input.",
          example: example(
            "Strict JSON parsing",
            { strictness: "strict" },
            "Use for predictable input handling.",
          ),
        },
      ],
      examples: [
        example(
          "Strict JSON parsing",
          { strictness: "strict" },
          "Use for predictable input handling.",
        ),
      ],
    },
    {
      key: "schema.numericMode",
      label: "Numeric inference",
      description:
        "Controls whether integer-looking JSON numbers keep integer semantics.",
      category: "inference",
      defaultValue: "distinguish",
      affectedStages: ["parse"],
      semanticEffect: "Controls the scalar node inferred for JSON numbers.",
      diagnosticEffect:
        "Usually silent; downstream targets may report widening when they cannot preserve integers.",
      supported: true,
      valueDescriptions: values([
        [
          "distinguish",
          "Distinguish integers",
          "Infer whole numbers as integer and fractional numbers as number.",
          "Preserves the integer distinction in Shape IR.",
          example(
            "Integer distinction",
            { schema: { numericMode: "distinguish" } },
            "Whole-number samples remain integer semantics.",
            { input: '{"count": 3}', semanticChange: "count: integer" },
          ),
        ],
        [
          "number-only",
          "Use number for all values",
          "Widen integer-looking values to number during inference.",
          "Removes the integer distinction at parse time.",
          example(
            "Number-only inference",
            { schema: { numericMode: "number-only" } },
            "Useful when the target treats integer and number identically.",
            { input: '{"count": 3}', semanticChange: "count: number" },
          ),
        ],
      ]),
      examples: [
        example(
          "Default numeric inference",
          { schema: { numericMode: "distinguish" } },
          "Preserves integer semantics for later reporting.",
          { input: '{"count": 3}', semanticChange: "count: integer" },
        ),
      ],
    },
    {
      key: "schema.emptyArrayMode",
      label: "Empty array inference",
      description:
        "Defines the element type inferred when an array has no observed elements.",
      category: "inference",
      defaultValue: "unknown-array",
      affectedStages: ["parse"],
      semanticEffect:
        "An empty array becomes array<unknown> because no element evidence is available.",
      diagnosticEffect:
        "The unknown evidence can be reported as empty-array-element or empty-array-only-field.",
      supported: true,
      valueDescriptions: values([
        [
          "unknown-array",
          "Unknown elements",
          "Infer an empty array as array<unknown>.",
          "Preserves the fact that the array shape is known but its element type is not.",
          example(
            "Empty array",
            { schema: { emptyArrayMode: "unknown-array" } },
            "The result remains honest without inventing an element type.",
            { input: '{"items": []}', semanticChange: "items: array<unknown>" },
          ),
        ],
      ]),
      examples: [
        example(
          "Empty array",
          { schema: { emptyArrayMode: "unknown-array" } },
          "The result remains honest without inventing an element type.",
          { input: '{"items": []}', semanticChange: "items: array<unknown>" },
        ),
      ],
    },
    {
      key: "schema.mixedTypeMode",
      label: "Mixed-type handling",
      description:
        "Controls how incompatible observed JSON value types are represented.",
      category: "inference",
      defaultValue: "error",
      affectedStages: ["parse"],
      semanticEffect:
        "Chooses between rejecting mixed evidence, preserving it as a union, or widening it to unknown.",
      diagnosticEffect:
        "error fails parsing; union may preserve semantics; unknown records a widening explanation.",
      supported: true,
      valueDescriptions: values([
        [
          "error",
          "Reject mixed types",
          "Fail when incompatible value types are observed.",
          "Keeps the inferred schema strict and avoids implicit widening.",
          example(
            "Strict mixed types",
            { schema: { mixedTypeMode: "error" } },
            "Best when inconsistent input should be fixed rather than inferred.",
            {
              input: '[1,"two"]',
              diagnostics: ["mixed-type"],
              semanticChange: "parse failure",
            },
          ),
        ],
        [
          "union",
          "Preserve a union",
          "Represent incompatible types as a union.",
          "Retains the observed alternatives in Shape IR.",
          example(
            "Union inference",
            { schema: { mixedTypeMode: "union" } },
            "Preserves both observed alternatives.",
            { input: '[1,"two"]', semanticChange: "array<integer | string>" },
          ),
        ],
        [
          "unknown",
          "Widen to unknown",
          "Represent incompatible types as unknown.",
          "Keeps the conversion moving while explicitly losing the precise alternatives.",
          example(
            "Unknown widening",
            { schema: { mixedTypeMode: "unknown" } },
            "Useful for best-effort workflows that can show a caveat.",
            {
              input: '[1,"two"]',
              semanticChange: "array<unknown>",
              diagnostics: ["mixed-types-collapsed"],
            },
          ),
        ],
      ]),
      examples: [
        example(
          "Preserve mixed alternatives",
          { schema: { mixedTypeMode: "union" } },
          "Use union inference when heterogeneous data is intentional.",
          { input: '[1,"two"]', semanticChange: "array<integer | string>" },
        ),
      ],
    },
    {
      key: "schema.nullHandling",
      label: "Null handling",
      description:
        "Controls how null values are represented alongside an inferred type.",
      category: "semantics",
      defaultValue: "nullable",
      affectedStages: ["parse"],
      semanticEffect:
        "Preserves null as explicit nullability rather than treating it as missing data.",
      diagnosticEffect:
        "Usually silent when nullability is representable by the target.",
      supported: true,
      valueDescriptions: values([
        [
          "nullable",
          "Preserve nullability",
          "Represent null alongside the observed value type.",
          "Distinguishes explicit null from optional presence.",
          example(
            "Nullable value",
            { schema: { nullHandling: "nullable" } },
            "A null sample remains part of the field type.",
            { input: '{"name": null}', semanticChange: "name: null" },
          ),
        ],
      ]),
      examples: [
        example(
          "Preserve null",
          { schema: { nullHandling: "nullable" } },
          "Explicit null remains distinct from an absent field.",
          { input: '{"name": null}', semanticChange: "name: null" },
        ),
      ],
    },
    {
      key: "schema.tupleInferenceMode",
      label: "Tuple inference",
      description:
        "Controls whether heterogeneous arrays are inferred as fixed-position tuples.",
      category: "inference",
      defaultValue: "off",
      affectedStages: ["parse"],
      semanticEffect:
        "Changes heterogeneous arrays from homogeneous arrays into ordered tuple positions.",
      diagnosticEffect:
        "May create target-specific tuple rendering requirements.",
      supported: true,
      experimental: true,
      valueDescriptions: values([
        [
          "off",
          "Disable tuple inference",
          "Infer arrays using homogeneous element semantics.",
          "Preserves the ordinary array model.",
          example(
            "Array inference",
            { schema: { tupleInferenceMode: "off" } },
            "Use when array positions are not meaningful.",
            { input: '[1,"two"]', semanticChange: "array<integer | string>" },
          ),
        ],
        [
          "heterogeneous-only",
          "Infer heterogeneous tuples",
          "Promote heterogeneous arrays to fixed-position tuples.",
          "Preserves observed position-specific types and optional trailing positions.",
          example(
            "Tuple inference",
            { schema: { tupleInferenceMode: "heterogeneous-only" } },
            "Use when array position carries meaning.",
            { input: '[1,"two"]', semanticChange: "[integer, string]" },
          ),
        ],
      ]),
      examples: [
        example(
          "Infer tuple positions",
          { schema: { tupleInferenceMode: "heterogeneous-only" } },
          "Preserves position-specific types.",
          { input: '[1,"two"]', semanticChange: "[integer, string]" },
        ),
      ],
    },
    {
      key: "schema.recordInferenceMode",
      label: "Record inference",
      description:
        "Controls whether object keys with a shared value type become a dynamic record.",
      category: "inference",
      defaultValue: "off",
      affectedStages: ["parse"],
      semanticEffect:
        "Changes a fixed-field object into a Record<string, T> when shared-value evidence supports it.",
      diagnosticEffect:
        "May reduce named-field detail while preserving dynamic-key semantics.",
      supported: true,
      experimental: true,
      valueDescriptions: values([
        [
          "off",
          "Keep named fields",
          "Treat observed object keys as explicit fields.",
          "Preserves field names and requiredness.",
          example(
            "Fixed fields",
            { schema: { recordInferenceMode: "off" } },
            "Use when keys themselves are part of the schema.",
            {
              input: '{"en":"Hello","fr":"Bonjour"}',
              semanticChange: "object with en and fr fields",
            },
          ),
        ],
        [
          "shared-value-type",
          "Infer a record",
          "Use Record<string, T> when observed values share a type.",
          "Preserves dynamic-key behavior instead of overfitting to sampled keys.",
          example(
            "Dynamic record",
            { schema: { recordInferenceMode: "shared-value-type" } },
            "Use for dictionaries and translation tables.",
            {
              input: '{"en":"Hello","fr":"Bonjour"}',
              semanticChange: "Record<string, string>",
            },
          ),
        ],
      ]),
      examples: [
        example(
          "Infer a dictionary",
          { schema: { recordInferenceMode: "shared-value-type" } },
          "Avoids treating sampled dictionary keys as a closed field list.",
          {
            input: '{"en":"Hello","fr":"Bonjour"}',
            semanticChange: "Record<string, string>",
          },
        ),
      ],
    },
    {
      key: "diagnostics.preserveSourceInfo",
      label: "Preserve source information",
      description: "Requests source-location evidence for parser diagnostics.",
      category: "diagnostics",
      defaultValue: false,
      affectedStages: ["parse"],
      semanticEffect: "Does not change inferred schema semantics.",
      diagnosticEffect:
        "The true value is not implemented yet and is rejected during option validation.",
      supported: false,
      valueDescriptions: values([
        [
          false,
          "Disabled",
          "Do not attach source-location metadata.",
          "No semantic change.",
          example(
            "Default diagnostics",
            { diagnostics: { preserveSourceInfo: false } },
            "Use the current supported diagnostic mode.",
          ),
        ],
      ]),
      examples: [
        example(
          "Default diagnostics",
          { diagnostics: { preserveSourceInfo: false } },
          "Source-location preservation is currently unavailable.",
        ),
      ],
    },
  ],
};
