import type { OptionCatalog, OptionMetadataExample } from "@aio/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
): OptionMetadataExample => ({ title, options, explanation });

export const jsonSchemaGeneratorOptionCatalog: OptionCatalog = {
  format: "json-schema",
  role: "generator",
  options: [
    {
      key: "includeSchemaUri",
      label: "Include schema URI",
      description:
        "Controls whether the Draft 2020-12 $schema declaration is emitted.",
      category: "output",
      defaultValue: true,
      affectedStages: ["generate"],
      semanticEffect:
        "Adds an output-document declaration without changing the schema shape.",
      diagnosticEffect: "No semantic loss is expected.",
      supported: true,
      valueDescriptions: [
        {
          value: true,
          label: "Include",
          description: "Emit the Draft 2020-12 schema URI.",
          semanticEffect:
            "Makes the target draft explicit to validators and consumers.",
          example: example(
            "Explicit draft",
            { includeSchemaUri: true },
            "Recommended for standalone schemas.",
          ),
        },
        {
          value: false,
          label: "Omit",
          description: "Do not emit the schema URI.",
          semanticEffect:
            "Leaves draft identification to the consuming context.",
          example: example(
            "Omit draft",
            { includeSchemaUri: false },
            "Useful when another wrapper supplies the schema declaration.",
          ),
        },
      ],
      examples: [
        example(
          "Emit the draft declaration",
          { includeSchemaUri: true },
          "Keep the target draft explicit.",
        ),
      ],
    },
    {
      key: "includeId",
      label: "Include schema ID",
      description:
        "Controls whether an $id is emitted for the generated document.",
      category: "output",
      defaultValue: false,
      affectedStages: ["generate"],
      semanticEffect:
        "Adds document identity metadata without changing validation shape.",
      diagnosticEffect: "No semantic loss is expected.",
      supported: true,
      valueDescriptions: [
        {
          value: true,
          label: "Include",
          description: "Emit an $id based on the document name.",
          semanticEffect:
            "Provides an identifier for schema resolution contexts.",
          example: example(
            "Add an ID",
            { includeId: true },
            "Useful for registries or reference-aware consumers.",
          ),
        },
        {
          value: false,
          label: "Omit",
          description: "Do not emit an $id.",
          semanticEffect:
            "Keeps the document free of generated identity metadata.",
          example: example(
            "Omit ID",
            { includeId: false },
            "Default for portable anonymous output.",
          ),
        },
      ],
      examples: [
        example(
          "Add a schema ID",
          { includeId: true },
          "Give the generated document a stable identity.",
        ),
      ],
    },
    {
      key: "unknownStrategy",
      label: "Unknown rendering",
      description:
        "Controls how unknown Shape IR nodes are represented in JSON Schema.",
      category: "semantics",
      defaultValue: "true",
      affectedStages: ["generate"],
      semanticEffect:
        "Unknown is rendered as the widest valid JSON Schema so generation remains truthful.",
      diagnosticEffect:
        "Unknown evidence may appear as a widening caveat; only the current true strategy is supported.",
      supported: true,
      valueDescriptions: [
        {
          value: "true",
          label: "Any value",
          description: "Render unknown as the boolean schema true.",
          semanticEffect:
            "Accepts any JSON value without inventing constraints.",
          example: example(
            "Render unknown",
            { unknownStrategy: "true" },
            "Preserves uncertainty honestly.",
          ),
        },
      ],
      examples: [
        example(
          "Render unknown safely",
          { unknownStrategy: "true" },
          "Use the widest valid schema for unresolved meaning.",
        ),
      ],
    },
    {
      key: "objectAdditionalPropertiesMode",
      label: "Object additional properties",
      description:
        "Controls whether ordinary object nodes explicitly close additional properties.",
      category: "semantics",
      defaultValue: "omit",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes whether unlisted object keys are allowed in generated JSON Schema.",
      diagnosticEffect:
        "Closing objects is a target policy and can produce a policy caveat.",
      supported: true,
      valueDescriptions: [
        {
          value: "omit",
          label: "Leave unspecified",
          description: "Do not emit additionalProperties for ordinary objects.",
          semanticEffect: "Keeps ordinary objects open by default.",
          example: example(
            "Open objects",
            { objectAdditionalPropertiesMode: "omit" },
            "Preserves the current permissive target policy.",
          ),
        },
        {
          value: "false",
          label: "Close objects",
          description: "Emit additionalProperties: false for ordinary objects.",
          semanticEffect:
            "Rejects keys not listed in the generated properties.",
          diagnosticEffect:
            "May narrow runtime acceptance compared with an open object.",
          example: example(
            "Closed objects",
            { objectAdditionalPropertiesMode: "false" },
            "Use when the target schema should reject unknown keys.",
          ),
        },
      ],
      examples: [
        example(
          "Close generated objects",
          { objectAdditionalPropertiesMode: "false" },
          "Use for strict object validation.",
        ),
      ],
    },
    {
      key: "unionComposition",
      label: "Union composition",
      description:
        "Selects oneOf or anyOf when rendering shared union semantics.",
      category: "semantics",
      defaultValue: "oneOf",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes the JSON Schema composition keyword used for unions.",
      diagnosticEffect:
        "Composition choice is reported as target policy when it changes validation behavior.",
      supported: true,
      valueDescriptions: [
        {
          value: "oneOf",
          label: "Exactly one",
          description: "Render unions with oneOf.",
          semanticEffect: "Requires exactly one branch to validate.",
          example: example(
            "Exclusive union",
            { unionComposition: "oneOf" },
            "Default when branches are expected to be mutually exclusive.",
          ),
        },
        {
          value: "anyOf",
          label: "At least one",
          description: "Render unions with anyOf.",
          semanticEffect:
            "Requires at least one branch to validate and permits overlap.",
          example: example(
            "Overlapping union",
            { unionComposition: "anyOf" },
            "Use when union branches may overlap.",
          ),
        },
      ],
      examples: [
        example(
          "Allow overlapping branches",
          { unionComposition: "anyOf" },
          "Use anyOf when branch overlap is intentional.",
        ),
      ],
    },
    {
      key: "constraints",
      label: "Constraint document",
      description:
        "Supplies portable validation constraints and annotations to the target generator.",
      category: "semantics",
      defaultValue: null,
      affectedStages: ["generate"],
      semanticEffect:
        "Adds representable string, numeric, collection, object, and annotation constraints.",
      diagnosticEffect:
        "Unsupported or target-specific constraints are reported rather than silently discarded.",
      supported: true,
      examples: [
        example(
          "Add constraints",
          { constraints: { root: { description: "A user profile" } } },
          "Use advanced constraints when validation requirements are available separately from Shape IR.",
        ),
      ],
    },
  ],
};
