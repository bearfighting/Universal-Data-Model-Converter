import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export const kotlinGeneratorOptionCatalog: OptionCatalog = {
  format: "kotlin",
  role: "generator",
  options: [
    {
      key: "declarationStyle",
      label: "Declaration style",
      description:
        "Generates object shapes as data classes or structural classes.",
      category: "formatting",
      defaultValue: "data-class",
      affectedStages: ["generate"],
      semanticEffect: "Controls the Kotlin declaration keyword.",
      diagnosticEffect: "Invalid styles fail generation.",
      supported: true,
      examples: [
        {
          title: "Class output",
          options: { declarationStyle: "class" },
          explanation: "Generate structural Kotlin classes.",
        },
      ],
    },
    {
      key: "propertyStyle",
      label: "Property style",
      description: "Controls whether generated properties use val or var.",
      category: "formatting",
      defaultValue: "val",
      affectedStages: ["generate"],
      semanticEffect: "Controls generated property mutability.",
      diagnosticEffect: "Invalid styles fail generation.",
      supported: true,
      examples: [
        {
          title: "Mutable properties",
          options: { propertyStyle: "var" },
          explanation: "Generate var properties.",
        },
      ],
    },
    {
      key: "packageName",
      label: "Package name",
      description: "Adds a Kotlin package declaration to generated source.",
      category: "formatting",
      defaultValue: undefined,
      affectedStages: ["generate"],
      semanticEffect:
        "Controls generated package text without changing Shape IR.",
      diagnosticEffect: "Invalid package names fail generation.",
      supported: true,
      examples: [
        {
          title: "Kotlin package",
          options: { packageName: "com.example.models" },
          explanation: "Emit a package declaration.",
        },
      ],
    },
  ],
};
