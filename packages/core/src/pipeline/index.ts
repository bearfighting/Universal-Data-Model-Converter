export type {
  ConversionCapabilityRequirement,
  EntryIrKind,
  ConversionIrPreference,
  ConversionIrSelection,
  ConversionEntrySelection,
  ConversionLossHotspot,
  ConversionPolicyDecision,
  ConversionReport,
  ConversionSemanticCaveat,
  ConversionCapability,
  GeneratorCapabilities,
  IrArtifacts,
  IrBundle,
  IrCompatibilityRequest,
  IrDocument,
  IrInputContract,
  IrOutputContract,
  IrPipelinePlan,
  IrPipelineStage,
  OverlayIrKind,
  GeneratorAnalysisHooks,
  ParserCapabilities,
  ValueRootKind,
  ConversionRoute,
  ConversionRouteCapabilities,
  IrKind,
  PipelineStage,
  PipelineStageKind,
  SemanticLoss,
  SemanticLossPhase,
  SemanticLossAnalysisContext,
} from "./contracts.js";
export { isIrBundle } from "./contracts.js";
export {
  IrCompatibilityError,
  generatorEntriesFromCapabilities,
  parserOutputsFromCapabilities,
  planIrPipeline,
} from "./planner.js";
export {
  defaultIrTransformers,
  valueToShapeTransformer,
} from "./transformers.js";
export { executeGenerator, executeParser } from "./execution.js";
export {
  executeIrTransformer,
  tryValidateIrBundle,
  tryValidateIrDocument,
} from "./validation.js";
export type {
  IrValidationFailure,
  IrValidationResult,
  IrValidationSuccess,
} from "./validation.js";
export type {
  DescriptorVersion,
  GenerateFailureResult,
  GenerateResult,
  GenerateSuccessResult,
  GeneratorDescriptor,
  GeneratorExecutionContext,
  IrTransformerDescriptor,
  ParseFailureResult,
  ParseResult,
  ParseSuccessResult,
  TransformResult,
  TransformSuccessResult,
  TransformerExecutionContext,
  ParserDescriptor,
  ParserExecutionContext,
} from "./descriptor-contracts.js";
