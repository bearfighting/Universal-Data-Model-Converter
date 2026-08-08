export type OptionMetadataStage = "parse" | "transform" | "generate";

export type OptionMetadataCategory =
  | "inference"
  | "diagnostics"
  | "selection"
  | "formatting"
  | "output"
  | "semantics"
  | "extension";

export interface OptionMetadataExample {
  title: string;
  input?: string;
  options: Record<string, unknown>;
  output?: string;
  semanticChange?: string;
  diagnostics?: string[];
  explanation: string;
}

export interface OptionValueMetadata {
  value: string | number | boolean | null;
  label: string;
  description: string;
  semanticEffect?: string;
  diagnosticEffect?: string;
  example?: OptionMetadataExample;
}

export interface OptionMetadata {
  key: string;
  label: string;
  description: string;
  category: OptionMetadataCategory;
  defaultValue: unknown;
  valueDescriptions?: OptionValueMetadata[];
  affectedStages: OptionMetadataStage[];
  semanticEffect: string;
  diagnosticEffect: string;
  examples: OptionMetadataExample[];
  supported: boolean;
  experimental?: boolean;
}

export interface OptionCatalog {
  format: string;
  role: "parser" | "transformer" | "generator";
  options: OptionMetadata[];
}
