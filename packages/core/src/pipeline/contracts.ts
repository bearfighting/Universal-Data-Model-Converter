import type { SchemaDiagnostic, SchemaSemanticNote } from "../schema/types.js";
import type { ConstraintDocument } from "../constraint/types.js";
import type { SchemaDocument } from "../schema/types.js";
import type { ValueDocument } from "../value/types.js";
import type { IrTransformerDescriptor } from "./descriptor-contracts.js";

export type IrKind = "value" | "shape" | "constraint";
export type ValueRootKind = "scalar" | "object" | "array";
export type EntryIrKind = Exclude<IrKind, "constraint">;
export type OverlayIrKind = Extract<IrKind, "constraint">;
export type ConversionIrPreference = "auto" | "value" | "shape";

export type IrDocument = ValueDocument | SchemaDocument | ConstraintDocument;

export interface IrArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}

export interface IrBundle<TDocument extends IrDocument = IrDocument> {
  document: TDocument;
  artifacts?: IrArtifacts;
}

export function isIrBundle(input: unknown): input is IrBundle {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const document = (input as { document?: unknown }).document;
  return (
    typeof document === "object" &&
    document !== null &&
    typeof (document as { kind?: unknown }).kind === "string"
  );
}

export interface ConversionIrSelection {
  requested: ConversionIrPreference;
  selected: Exclude<ConversionIrPreference, "auto">;
  fallback: boolean;
}
export type ConversionCapability =
  | "value-ir"
  | "shape-ir"
  | "constraint-ir"
  | "string-constraints"
  | "numeric-constraints"
  | "collection-constraints"
  | "object-constraints"
  | "portable-annotations";
export type SemanticLossPhase = "parse" | "transform" | "generate";

export interface SemanticLoss {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  phase: SemanticLossPhase;
  lostCapability: ConversionCapability;
  sourcePath?: string[];
  targetFormat?: string;
  evidence?: unknown;
}

export interface ConversionReportStage<TFact> {
  parse?: TFact[];
  transform?: TFact[];
  generate?: TFact[];
  all: TFact[];
}

export interface ConversionEntrySelection {
  mode: "implicit";
  entry: string;
  strategyCode: string;
  source?: string;
  path?: string[];
  evidence?: unknown;
}

export interface ConversionPolicyDecision {
  phase: "parse" | "generate";
  code: string;
  message: string;
  source?: string;
  path?: string[];
  evidence?: unknown;
}

export interface ConversionSemanticCaveat {
  phase: "parse" | "generate";
  kind: Exclude<SchemaSemanticNote["kind"], "policy">;
  code: string;
  message: string;
  source?: string;
  path?: string[];
  layer?: SchemaSemanticNote["layer"];
  evidence?: unknown;
}

export interface ConversionCapabilityRequirement {
  feature: string;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence?: unknown;
}

export interface ConversionLossHotspot {
  code: string;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence?: unknown;
}

export interface ParserCapabilities {
  format: string;
  producesIr: IrKind[];
  outputs?: IrOutputContract[];
  capabilities: ConversionCapability[];
  valueRootKinds?: ValueRootKind[];
}

export interface IrInputContract {
  ir: IrKind;
  valueRootKinds?: ValueRootKind[];
  artifacts?: IrKind[];
}

export interface IrOutputContract {
  ir: IrKind;
  valueRootKinds?: ValueRootKind[];
  artifacts?: IrKind[];
}

export interface IrCompatibilityRequest {
  parserOutputs: IrOutputContract[];
  generatorEntries: IrInputContract[];
  transformers?: readonly IrTransformerDescriptor[];
  preference?: ConversionIrPreference;
}

export interface IrPipelineStage {
  kind: "transform";
  transformerId: string;
  from: IrKind;
  to: IrKind;
}

export interface IrPipelinePlan {
  selectedIr: IrKind;
  stages: IrPipelineStage[];
  requiredArtifacts?: IrKind[];
}

export interface GeneratorCapabilities {
  target: string;
  consumesIr: IrKind[];
  entries?: IrInputContract[];
  entryIr?: EntryIrKind[];
  overlays?: OverlayIrKind[];
  supportsCapabilities: ConversionCapability[];
  valueRootKinds?: ValueRootKind[];
}

export interface SemanticLossAnalysisContext {
  sourceFormat: string;
  targetFormat: string;
  routeCapabilities: ConversionRouteCapabilities;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
}

export interface GeneratorAnalysisHooks {
  collectCapabilityRequirements?(
    document: SchemaDocument,
  ): ConversionCapabilityRequirement[];
  collectLossHotspots?(document: SchemaDocument): ConversionLossHotspot[];
  planSemanticLosses?(context: SemanticLossAnalysisContext): SemanticLoss[];
}

export interface ConversionReport {
  irSelection?: ConversionIrSelection;
  diagnostics?: ConversionReportStage<SchemaDiagnostic>;
  losses?: SemanticLoss[];
  preservedCapabilities?: ConversionCapability[];
  semanticNotes?: ConversionReportStage<SchemaSemanticNote>;
  semanticCaveats?: ConversionSemanticCaveat[];
  capabilityRequirements?: ConversionCapabilityRequirement[];
  lossHotspots?: ConversionLossHotspot[];
  policyDecisions?: ConversionPolicyDecision[];
  entrySelection?: ConversionEntrySelection;
}

export type PipelineExecutionPhase = "parse" | "transform" | "generate";

export interface PipelineExecutionDiagnostics {
  parse?: SchemaDiagnostic[];
  transform?: SchemaDiagnostic[];
  generate?: SchemaDiagnostic[];
  all: SchemaDiagnostic[];
}

export interface PipelineExecutionSemanticNotes {
  parse?: SchemaSemanticNote[];
  transform?: SchemaSemanticNote[];
  generate?: SchemaSemanticNote[];
  all: SchemaSemanticNote[];
}

export interface PipelineExecutionRequest<
  TOutput = unknown,
  TParserOptions = unknown,
  TTransformerOptions = unknown,
  TGeneratorOptions = unknown,
> {
  parser: import("./descriptor-contracts.js").ParserDescriptor<
    IrDocument,
    TParserOptions
  >;
  generator: import("./descriptor-contracts.js").GeneratorDescriptor<
    IrDocument,
    TOutput,
    TGeneratorOptions
  >;
  transformers?: readonly import("./descriptor-contracts.js").IrTransformerDescriptor<
    IrDocument,
    IrDocument,
    TTransformerOptions
  >[];
  plan: IrPipelinePlan;
  input: string;
  parserContext: import("./descriptor-contracts.js").ParserExecutionContext<TParserOptions>;
  transformerContext?: import("./descriptor-contracts.js").TransformerExecutionContext<TTransformerOptions>;
  generatorContext?: import("./descriptor-contracts.js").GeneratorExecutionContext<TGeneratorOptions>;
  sourceFormat: string;
  targetFormat: string;
  routeCapabilities?: ConversionRouteCapabilities;
  lossPlanner?: (context: SemanticLossAnalysisContext) => SemanticLoss[];
}

export interface PipelineExecutionSuccess<TOutput = unknown> {
  ok: true;
  output: TOutput;
  bundle: IrBundle;
  diagnostics?: PipelineExecutionDiagnostics;
  semanticNotes?: PipelineExecutionSemanticNotes;
  losses?: SemanticLoss[];
}

export interface PipelineExecutionFailure {
  ok: false;
  code: string;
  message: string;
  phase: PipelineExecutionPhase;
  plan: IrPipelinePlan;
  bundle?: IrBundle;
  diagnostics?: PipelineExecutionDiagnostics;
  semanticNotes?: PipelineExecutionSemanticNotes;
  losses?: SemanticLoss[];
}

export type PipelineExecutionResult<TOutput = unknown> =
  PipelineExecutionSuccess<TOutput> | PipelineExecutionFailure;

export type PipelineStageKind =
  | "parse-source"
  | "lower-to-value"
  | "infer-shape"
  | "derive-constraints"
  | "transform-ir"
  | "generate-target";

export interface PipelineStage {
  kind: PipelineStageKind;
  from: string;
  to: string;
  ir?: IrKind;
}

export interface ConversionRoute {
  sourceFormat: string;
  targetFormat: string;
  irSequence: IrKind[];
  stages: PipelineStage[];
}

export interface ConversionRouteCapabilities {
  supportsValueIr: boolean;
  supportsShapeIr: boolean;
  supportsConstraintIr: boolean;
  parserCapabilities: ConversionCapability[];
  generatorCapabilities: ConversionCapability[];
  preservedCapabilities: ConversionCapability[];
  potentiallyLostCapabilities: ConversionCapability[];
}
