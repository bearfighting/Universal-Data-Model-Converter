import type {
  GeneratorCapabilities,
  IrCompatibilityRequest,
  IrInputContract,
  IrKind,
  IrOutputContract,
  IrPipelinePlan,
  IrPipelineStage,
  ParserCapabilities,
  ValueRootKind,
} from "./contracts.js";
import type { IrTransformerDescriptor } from "./descriptor-contracts.js";

export class IrCompatibilityError extends Error {
  readonly code: "unsupported-route" | "unsupported-ir-preference";

  constructor(
    code: "unsupported-route" | "unsupported-ir-preference",
    message: string,
  ) {
    super(message);
    this.name = "IrCompatibilityError";
    this.code = code;
  }
}

export function planIrPipeline(
  request: IrCompatibilityRequest,
): IrPipelinePlan {
  const preference = request.preference ?? "auto";
  const outputs = deduplicateContracts(request.parserOutputs);
  const entries = deduplicateContracts(request.generatorEntries);
  validateContracts(outputs, entries);
  const transformers = request.transformers ?? [];

  const directValue = findDirectPath(outputs, entries, "value");
  const directShape = findDirectPath(outputs, entries, "shape");
  const directConstraint = findDirectPath(outputs, entries, "constraint");
  const transformedShape = findTransformerPath(
    outputs,
    entries,
    "shape",
    transformers,
  );
  const transformedConstraint = findTransformerPath(
    outputs,
    entries,
    "constraint",
    transformers,
  );

  const selected =
    preference === "value"
      ? directValue
      : preference === "shape"
        ? (directShape ?? transformedShape)
        : (directValue ??
          directShape ??
          transformedShape ??
          directConstraint ??
          transformedConstraint);

  if (selected) return selected;

  const otherAvailable =
    preference === "value"
      ? (directShape ?? transformedShape)
      : preference === "shape"
        ? directValue
        : undefined;
  if (otherAvailable) {
    throw new IrCompatibilityError(
      "unsupported-ir-preference",
      `IR preference "${preference}" is not available for the requested contracts.`,
    );
  }
  throw new IrCompatibilityError(
    "unsupported-route",
    "No compatible IR pipeline exists for the requested parser and generator contracts.",
  );
}

export function parserOutputsFromCapabilities(
  capabilities: ParserCapabilities,
): IrOutputContract[] {
  return (
    capabilities.outputs?.map((output) => ({
      ...output,
      ...(output.ir === "value" &&
      !output.valueRootKinds &&
      capabilities.valueRootKinds
        ? { valueRootKinds: capabilities.valueRootKinds }
        : {}),
    })) ??
    capabilities.producesIr.map((ir) => ({
      ir,
      ...(ir === "value" && capabilities.valueRootKinds
        ? { valueRootKinds: capabilities.valueRootKinds }
        : {}),
    }))
  );
}

export function generatorEntriesFromCapabilities(
  capabilities: GeneratorCapabilities,
): IrInputContract[] {
  if (capabilities.entries) {
    return capabilities.entries.map((entry) => ({
      ...entry,
      ...(entry.ir === "value" &&
      !entry.valueRootKinds &&
      capabilities.valueRootKinds
        ? { valueRootKinds: capabilities.valueRootKinds }
        : {}),
    }));
  }

  const entries =
    capabilities.entryIr ??
    capabilities.consumesIr.filter((ir) => ir === "value" || ir === "shape");
  return entries.map((ir) => ({
    ir,
    ...(ir === "value" && capabilities.valueRootKinds
      ? { valueRootKinds: capabilities.valueRootKinds }
      : {}),
  }));
}

function findDirectPath(
  outputs: IrOutputContract[],
  entries: IrInputContract[],
  ir: IrKind,
): IrPipelinePlan | undefined {
  for (const output of outputs) {
    if (output.ir !== ir) continue;
    for (const entry of entries) {
      if (entry.ir !== ir) continue;
      if (!rootKindsIntersect(output.valueRootKinds, entry.valueRootKinds)) {
        continue;
      }
      if (!hasArtifacts(outputs, entry.artifacts, entry.ir)) continue;
      return {
        selectedIr: ir,
        stages: [],
        ...(entry.artifacts?.length
          ? { requiredArtifacts: [...entry.artifacts] }
          : {}),
      };
    }
  }
  return undefined;
}

function findTransformerPath(
  outputs: IrOutputContract[],
  entries: IrInputContract[],
  targetIr: IrKind,
  transformers: readonly IrTransformerDescriptor[],
): IrPipelinePlan | undefined {
  const targetEntries = entries.filter((entry) => entry.ir === targetIr);
  if (targetEntries.length === 0) return undefined;

  for (const output of outputs) {
    for (const entry of targetEntries) {
      const primaryPath =
        output.ir === targetIr
          ? []
          : findTransformerChain(output.ir, targetIr, transformers);
      if (!primaryPath) continue;
      let path = primaryPath;
      let valid = true;
      const available = new Set<IrKind>([
        ...outputs.map((candidate) => candidate.ir),
        ...outputs.flatMap((candidate) => candidate.artifacts ?? []),
        output.ir,
        ...path.map((stage) => stage.to),
      ]);
      for (const artifact of entry.artifacts ?? []) {
        if (available.has(artifact)) continue;
        const artifactPath = findTransformerChain(
          targetIr,
          artifact,
          transformers,
        );
        if (!artifactPath) {
          valid = false;
          break;
        }
        path = [...path, ...artifactPath];
        artifactPath.forEach((stage) => available.add(stage.to));
      }
      if (!valid) continue;
      return {
        selectedIr: targetIr,
        stages: path,
        ...(entry.artifacts?.length
          ? { requiredArtifacts: [...entry.artifacts] }
          : {}),
      };
    }
  }
  return undefined;
}

function findTransformerChain(
  from: IrKind,
  to: IrKind,
  transformers: readonly IrTransformerDescriptor[],
): IrPipelineStage[] | undefined {
  const queue: Array<{ kind: IrKind; path: IrPipelineStage[] }> = [
    { kind: from, path: [] },
  ];
  const visited = new Set<IrKind>([from]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const transformer of transformers) {
      if (transformer.inputIr !== current.kind) continue;
      const stage: IrPipelineStage = {
        kind: "transform",
        transformerId: transformer.id,
        from: transformer.inputIr,
        to: transformer.outputIr,
      };
      const path = [...current.path, stage];
      if (transformer.outputIr === to) return path;
      if (!visited.has(transformer.outputIr)) {
        visited.add(transformer.outputIr);
        queue.push({ kind: transformer.outputIr, path });
      }
    }
  }
  return undefined;
}

function hasArtifacts(
  outputs: IrOutputContract[],
  required: IrKind[] | undefined,
  primary?: IrKind,
): boolean {
  return (
    !required ||
    required.every(
      (kind) =>
        kind === primary ||
        outputs.some(
          (output) =>
            output.ir === kind || output.artifacts?.includes(kind) === true,
        ),
    )
  );
}

function rootKindsIntersect(
  left: ValueRootKind[] | undefined,
  right: ValueRootKind[] | undefined,
): boolean {
  if (!left || !right) return true;
  return left.some((kind) => right.includes(kind));
}

function deduplicateContracts<
  T extends {
    ir: IrKind;
    valueRootKinds?: ValueRootKind[];
    artifacts?: IrKind[];
  },
>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.ir,
      item.valueRootKinds?.join(",") ?? "*",
      item.artifacts?.join(",") ?? "*",
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateContracts(
  outputs: IrOutputContract[],
  entries: IrInputContract[],
): void {
  for (const contract of [...outputs, ...entries]) {
    if (!isIrKind(contract.ir)) {
      throw new IrCompatibilityError(
        "unsupported-route",
        `Unknown IR kind: ${String(contract.ir)}.`,
      );
    }
    if (contract.artifacts?.some((artifact) => !isIrKind(artifact))) {
      throw new IrCompatibilityError(
        "unsupported-route",
        `IR contract "${contract.ir}" contains an unknown artifact kind.`,
      );
    }
    if (contract.artifacts?.includes(contract.ir)) {
      throw new IrCompatibilityError(
        "unsupported-route",
        `IR contract "${contract.ir}" must not repeat its primary document as an artifact.`,
      );
    }
    if (
      contract.valueRootKinds?.some((root) => !isValueRootKind(root)) ||
      (contract.valueRootKinds && contract.ir !== "value")
    ) {
      throw new IrCompatibilityError(
        "unsupported-route",
        `IR contract "${contract.ir}" contains invalid Value root-shape metadata.`,
      );
    }
    if (
      contract.artifacts &&
      new Set(contract.artifacts).size !== contract.artifacts.length
    ) {
      throw new IrCompatibilityError(
        "unsupported-route",
        `IR contract "${contract.ir}" contains duplicate artifacts.`,
      );
    }
  }
}

function isIrKind(value: unknown): value is IrKind {
  return value === "value" || value === "shape" || value === "constraint";
}

function isValueRootKind(value: unknown): value is ValueRootKind {
  return value === "scalar" || value === "object" || value === "array";
}
