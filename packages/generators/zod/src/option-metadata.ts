import type { OptionCatalog } from "@aio/core";

export const zodGeneratorOptionCatalog: OptionCatalog = {
  format: "zod",
  role: "generator",
  options: [
    {
      key: "outputLanguage",
      label: "Output language",
      description:
        "Chooses TypeScript output with inferred types or plain JavaScript output with runtime schemas only.",
      category: "formatting",
      defaultValue: "typescript",
      affectedStages: ["generate"],
      semanticEffect:
        "TypeScript adds a static z.infer declaration; JavaScript does not.",
      diagnosticEffect: "No runtime schema difference is expected.",
      supported: true,
      valueDescriptions: [
        {
          value: "typescript",
          label: "TypeScript",
          description: "Emit schemas and z.infer types.",
          semanticEffect: "Adds static type declarations.",
          example: {
            title: "TypeScript output",
            options: { outputLanguage: "typescript" },
            explanation: "Emit runtime schemas with inferred TypeScript types.",
          },
        },
        {
          value: "javascript",
          label: "JavaScript",
          description: "Emit runtime schemas only.",
          semanticEffect: "Omits TypeScript-only declarations.",
          example: {
            title: "JavaScript output",
            options: { outputLanguage: "javascript" },
            explanation:
              "Emit an ESM JavaScript module with runtime Zod schemas.",
          },
        },
      ],
      examples: [
        {
          title: "JavaScript output",
          options: { outputLanguage: "javascript" },
          explanation:
            "Generate an ESM JavaScript module with runtime Zod schemas.",
        },
      ],
    },
    {
      key: "namingStrategy",
      label: "Naming strategy",
      description:
        "Provides custom functions for rendered schema and field names.",
      category: "extension",
      defaultValue: "default",
      affectedStages: ["generate"],
      semanticEffect:
        "Changes generated identifiers without changing schema semantics.",
      diagnosticEffect: "Rendered name collisions remain generation failures.",
      supported: true,
      experimental: true,
      examples: [
        {
          title: "Default naming",
          options: {},
          explanation:
            "Use normalized schema and field names suitable for generated modules.",
        },
      ],
    },
  ],
};
