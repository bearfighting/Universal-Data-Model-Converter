# Architecture Layering

This document defines the repository's long-term architecture boundary for format families, IR routing, package roles, and planner behavior.

Use [ir-boundaries.md](ir-boundaries.md) for semantic meaning of each IR layer.
Use [ir-contract.md](ir-contract.md) for the current shared schema contract.
Use [pipeline-refactor-checklist.md](pipeline-refactor-checklist.md) to execute
and validate the staged architecture refactor.

## Format Families

Supported sources and targets should be treated as belonging to one of three families:

- value formats: concrete serialized values such as JSON
- schema and validator definitions: schema documents that mix structure with validation or annotation semantics, such as JSON Schema
- serializable language type definitions: language-native DTO-style declarations such as the current TypeScript subset

The project only targets the serializable data-shape subset of language type systems.

## IR Routing Rule

The architectural rule is:

- value formats primarily target `Value IR`
- serializable type definitions primarily target `Shape IR`
- schema and validator definitions may target `Shape IR` plus `Constraint IR`

Likewise for generation:

- value generators should stay in the `Value IR` lane unless a separate inference step is involved
- type generators usually consume `Shape IR`
- richer schema generators may consume `Shape IR` plus `Constraint IR`

Avoid forcing value concerns or validator-specific concerns directly into `Shape IR`.

## Why Multiple IR Layers Exist

One IR is not enough for the repository's intended scope.

The split exists so that:

- serialized values do not distort reusable schema modeling
- shared structural meaning stays smaller than any one source format
- constraints and annotations do not bloat the core shape model
- route planning can reason explicitly about what each stage consumes and produces

## Current Package Pattern

The repository should keep converging on one simple package-entry pattern:

- `index.ts`: public exports only
- `api.ts`: package runtime entry points and configured defaults
- `options.ts`: option resolution and validation
- focused internal modules: implementation details such as `convert.ts`, `emit.ts`, `report.ts`, or `losses.ts`

The goal is clarity of public surface, not file-count uniformity.

## SDK Boundary

The SDK is a consumer-facing facade over the generic parser/IR/generator
pipeline. It should not become a second semantic home for format-specific
logic or assume which built-in formats exist.

The dependency direction should be:

```text
format components -> core IR contracts
generated registry -> component descriptors
generic pipeline  -> registry + core IR compatibility
SDK               -> generic pipeline interfaces + public options/results
```

The SDK may normalize requests, invoke the pipeline, and assemble the public
result envelope. It must not implement format-to-format rules, root-shape
special cases, parser/generator dispatch switches, or built-in route tables.

The preferred internal split is:

- `types.ts`: public SDK option and result contracts
- `pipeline.ts`: invocation of the generic parse/transform/generate pipeline
- `registry-client.ts`: consumption of the registry interface, not built-in registration
- `report.ts`: result and diagnostic aggregation
- `convert.ts`: public orchestration only

The current `source.ts`, `generate.ts`, `losses.ts`, and built-in imports in
`registry.ts` should be migrated or split behind these boundaries without
changing the Stage 1 public facade in one step.

If logic can live outside `convert.ts`, it should.

Core owns the generic execution boundary for each role:

```text
executeParser(descriptor, input, context)
executeTransformer(descriptor, irBundle, context)
executeGenerator(descriptor, irBundle, context)
```

These executors validate IR bundles, enforce declared IR kinds, preserve
supplementary artifacts, and convert descriptor exceptions into structured
failures. Format packages remain responsible for format-specific validation
and output semantics.

## Registry Responsibilities

The registry core should stay small and do four jobs:

1. register parser, transformer, and generator descriptors
2. validate descriptor contracts and uniqueness
3. resolve descriptors by their declared identities
4. provide one integration surface for pipeline, SDK, CLI, and future service layers

The registry core must not import or assume any built-in parser or generator.
Built-in registration belongs to a generated registry module produced during
the build. Third-party components should use the same descriptor and registry
interfaces through an explicit plugin/build manifest.

The important modeling rule is to keep parser, transformer, and generator roles
explicit and IR dependencies visible without encoding format-pair knowledge.

The generic registry implementation now lives in core and has no knowledge of
builtin packages. Builtin descriptor registration is generated into the SDK
from explicit `schemaTransformationToolkit.registry` package metadata. The
generated module is committed source, while `registry:check` prevents stale
output. Third-party packages use an explicit manifest passed to the same
generator; runtime package scanning is intentionally not part of the contract.

## Two-Stage Processing Boundary

The stable processing API should expose two independent operations:

```text
parse(input, parser, options) -> ParseResult<IRDocument>
generate(irDocument, generator, options) -> GenerateResult<Output>
```

Inference and other IR changes are explicit transformer stages between them:

```text
parser -> IR -> transformer/inference -> IR -> generator
```

A parser owns input syntax and lowering to its declared IR contract. A
generator owns rendering from its declared IR input contract. Neither format
package calls another format package.

The generic IR compatibility layer decides whether a parser output contract can
connect to a generator input contract. It must use declared IR kinds and value
contracts such as root shape, not source/target format names. Static
incompatibility fails during planning; dynamic input constraints remain
runtime IR validation.

The core planner consumes parser output contracts, generator input contracts,
and an explicit transformer catalog. Its default catalog contains the truthful
`Value IR -> Shape IR` inference edge. `Shape IR -> Constraint IR` is not a
universal inference rule: it is available only when a parser already provides
constraints or an explicit transformer declares that edge. This prevents the
planner from inventing constraints merely to make a route appear supported.

The SDK may adapt a generic plan to its public `ConversionRoute` shape, but it
must not recreate the compatibility decision. A route such as CSV to TOML is
rejected because the declared Value root contracts have no intersection, not
because the SDK contains a CSV/TOML special case.

## Runtime Planning Rule

For any requested conversion, the planner should answer:

1. can parser output satisfy generator input truthfully
2. if yes, what route preserves the most semantics with the least extra machinery

At minimum, the planner should track:

- source format
- target format
- parser output IR layers
- generator required IR layers
- optional preserved layers
- route-level capability and loss summaries

## Current Repository Rule

The repository already has descriptor metadata and route planning, but the
current implementation still couples the SDK registry to built-in imports and
route semantics. The refactor should move compatibility and pipeline execution
below the SDK, then generate the built-in registration layer during build.

## Maintenance Rules

- keep this file focused on family classification, routing, and package roles
- move semantic placement questions to [ir-boundaries.md](ir-boundaries.md)
- move result-contract questions to [capabilities-and-loss.md](capabilities-and-loss.md)
- keep build-time discovery deterministic and explicit; do not scan arbitrary
  runtime dependencies
