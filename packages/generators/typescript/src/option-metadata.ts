import type { OptionCatalog, OptionMetadataExample } from "@aio/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
): OptionMetadataExample => ({ title, options, explanation });

export const typeScriptGeneratorOptionCatalog: OptionCatalog = {
  format: "typescript",
  role: "generator",
  options: [
    {
      key: "rootObjectMode",
      label: "Root object style",
      description:
        "Chooses whether a root object is emitted as an interface or a type alias.",
      category: "formatting",
      defaultValue: "interface",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes TypeScript declaration syntax without changing the represented object shape.",
      diagnosticEffect:
        "No semantic loss is expected; naming collisions are validated in either mode.",
      supported: true,
      valueDescriptions: [
        {
          value: "interface",
          label: "Interface",
          description: "Emit the root object as an exported interface.",
          semanticEffect: "Uses interface declaration syntax.",
          example: example(
            "Interface output",
            { rootObjectMode: "interface" },
            "Suitable for object-shaped public declarations.",
          ),
        },
        {
          value: "type",
          label: "Type alias",
          description: "Emit the root object as an exported type alias.",
          semanticEffect:
            "Uses type-alias syntax and composes naturally with unions.",
          example: example(
            "Type alias output",
            { rootObjectMode: "type" },
            "Suitable when a consistent type-alias style is preferred.",
          ),
        },
      ],
      examples: [
        example(
          "Choose type aliases",
          { rootObjectMode: "type" },
          "Switches only the declaration style of root objects.",
        ),
      ],
    },
    {
      key: "arrayStyle",
      label: "Array syntax",
      description:
        "Controls whether arrays use compact bracket syntax or generic Array<T> syntax.",
      category: "formatting",
      defaultValue: "smart",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes TypeScript surface syntax without changing array semantics.",
      diagnosticEffect: "No semantic loss is expected.",
      supported: true,
      valueDescriptions: [
        {
          value: "smart",
          label: "Smart",
          description:
            "Use compact syntax where it is unambiguous and generic syntax where needed.",
          semanticEffect: "Selects readable syntax based on the element type.",
          example: example(
            "Smart arrays",
            { arrayStyle: "smart" },
            "Default style for readable output.",
          ),
        },
        {
          value: "compact",
          label: "Compact",
          description: "Prefer T[] syntax.",
          semanticEffect: "Uses bracket array syntax where supported.",
          example: example(
            "Compact arrays",
            { arrayStyle: "compact" },
            "Produces output such as string[].",
          ),
        },
        {
          value: "generic",
          label: "Generic",
          description: "Use Array<T> syntax.",
          semanticEffect: "Uses generic array syntax consistently.",
          example: example(
            "Generic arrays",
            { arrayStyle: "generic" },
            "Produces output such as Array<string>.",
          ),
        },
      ],
      examples: [
        example(
          "Use generic arrays",
          { arrayStyle: "generic" },
          "Useful when a project standardizes on Array<T>.",
        ),
      ],
    },
    {
      key: "namingStrategy",
      label: "Naming strategy",
      description:
        "Provides custom functions for rendering document, definition, and field names.",
      category: "extension",
      defaultValue: "default strategy",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes emitted identifiers and property names, not the underlying schema meaning.",
      diagnosticEffect:
        "Invalid names and rendered-name collisions fail generation with structured diagnostics.",
      supported: true,
      examples: [
        example(
          "Custom naming",
          { namingStrategy: "custom function pair" },
          "Use a custom strategy when generated names must follow a project convention.",
        ),
      ],
    },
  ],
};
