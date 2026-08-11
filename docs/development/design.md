# Project Design

This is the durable design reference for the toolkit. It describes boundaries
that should survive individual refactors; current work belongs in
[progress.md](progress.md), and implementation/release rules belong in
[standards.md](standards.md).

## Mission and boundaries

The toolkit transforms serializable data and schema shapes across format
families while making semantic differences explicit. The shared IR is semantic
and schema-oriented, not a TypeScript-shaped AST. The project prefers stable
data concepts—scalars, literals, objects, arrays, tuples, records, unions,
references, nullability, optional presence, and portable constraints—over
format-specific syntax.

Unsupported semantics must fail explicitly or be reported as a structured
loss. A successful conversion must remain truthful about what it preserved,
widened, normalized, or discarded.

The builtin families are JSON, YAML, CSV, TOML, JSON Schema, TypeScript, Zod,
and OpenAPI. Format packages own format policy. Core owns shared semantics and
execution contracts. SDK is the stable consumer boundary and compatibility
facade.

## System shape

```text
format parser → Value IR / Shape IR / Constraint IR → format generator
                         ↑
              planned transformers and validation
```

The core pipeline executes parser, planned transformers, and generator in a
fixed order. It carries the current primary IR document plus supplementary
artifacts, stage diagnostics, semantic notes, and semantic losses. The SDK
resolves a route, adapts public options, invokes the pipeline, and wraps the
result into the public contract; it does not choose transformer order, merge
artifacts, or select generator entry IR.

The dependency direction is:

```text
format packages → core
SDK → core + registered format descriptors
registry generation → format descriptors → SDK bundle
```

Format packages must not call another format's parser or generator. The
OpenAPI adapter is the deliberate exception at the semantic boundary: it
consumes or emits canonical JSON Schema semantics rather than creating a
general format-to-format dependency.

## IR layers and contracts

- **Value IR** represents concrete data: null, boolean, number, string,
  arrays, and objects. JSON, YAML, CSV, and TOML primarily use this layer.
- **Shape IR** represents data structure: scalar and literal nodes, object
  fields, additional properties, arrays, tuples, records, unions, references,
  nullability, and unknown shapes. JSON Schema, TypeScript, Zod, and OpenAPI
  use it as their main entry layer.
- **Constraint IR** is an overlay for portable restrictions such as string,
  numeric, collection, and object constraints. It is retained as an artifact
  when the target needs it and is never silently treated as shape structure.

Primitive representation follows the same boundary: Shape IR keeps the
portable scalar domain (`string`, `integer`, `number`, and `boolean`),
Constraint IR carries portable numeric facets, and optional
`ScalarRepresentationHint` metadata can preserve language-neutral integer or
floating-point representation details. Semantic Shape equivalence ignores
representation hints; representation-aware comparison is available when a
language adapter needs to verify round trips.

Numeric constraints may use finite JavaScript numbers or exact JSON-safe
decimal values. A target must reject or report loss when it cannot emit an
exact decimal value; it must not silently coerce large integers through an
imprecise JavaScript number.

Optional presence and nullable values are distinct. References and recursive
structures remain explicit. Root-shape requirements are descriptor contracts,
not ad-hoc format-pair checks.

Parsers declare their output IR kind and artifacts. Transformers declare input
and output kinds. Generators declare accepted IR kinds, root-shape requirements,
required artifacts, options, and analysis hooks. The pipeline validates these
contracts at runtime with the shared IR guards and `tryValidateIrBundle(...)`.
Static route planning can reject impossible routes early; dynamic root-shape
or document mismatches remain structured runtime failures.

## Execution and evidence

The generic executor follows this sequence:

```text
executeParser
  → merge initial IrBundle
  → execute planned transformers
  → select generator entry IR and required artifacts
  → executeGenerator
  → collect generator losses
```

Diagnostics and semantic notes are grouped by `parse`, `transform`, and
`generate`, with an ordered `all` view. Parser primary and supplementary
artifacts enter the bundle. A transformer replaces the current primary
document while preserving unrelated artifacts and replacing same-kind output.
The generator receives only the planner-selected entry IR and required
artifacts. Failures preserve safe evidence from completed stages and expose a
structured `code`, `message`, `phase`, route plan, diagnostics, notes, and
artifacts rather than leaking descriptor exceptions.

Semantic losses are deduplicated and ordered consistently with the existing
SDK behavior. SDK report fields such as `capabilityRequirements` and
`lossHotspots` remain higher-level interpretation; the pipeline owns actual
loss collection, not product-specific reporting policy.

## Traversal, transformation, and normalization

Shared traversal operates on Shape IR structure, root nodes, definitions, and
references according to an explicit policy. It supports immutable transforms,
reference-preserving behavior, cycle-safe handling, and normalization only
where a cross-format consumer needs it. Format-specific rewriting stays in the
format package. New traversal or IR concepts require pressure from more than
one format or a concrete consumer contract.

## Format-family boundaries

- JSON and YAML are Value-oriented baselines; CSV requires an array root and
  TOML requires an object root.
- JSON Schema, Zod, and OpenAPI carry Shape and, where declared, Constraint
  artifacts. Their constraint behavior and loss reporting must remain explicit.
- TypeScript supports the schema-oriented subset documented by its parser;
  preprocessing and diagnostics are parser concerns, not SDK orchestration.
- OpenAPI remains bounded by canonical JSON Schema-compatible documents; this
  project does not promise full OpenAPI document generation.

These boundaries are descriptor and IR contracts, not a second route matrix in
the SDK.

## Public and extension boundaries

`convert`, route/capability discovery, parser/generator compatibility helpers,
structured diagnostics, semantic notes, losses, artifacts, and report fields
form the stable SDK surface. Ordinary conversion outcomes use discriminated
result values instead of thrown exception strings.

`createConverter(registry)` is the primary custom extension boundary. Builtin
aliases remain for compatibility until a breaking release. Registry metadata
drives discovery and generated builtin registration; downstream consumers
should not hardcode format lists or inspect parser/generator internals.

## Durable decisions

1. Preserve semantic IR boundaries instead of introducing a universal
   format-shaped AST.
2. Prefer explicit incompatibility and structured loss over silent guessing.
3. Keep core generic and SDK-compatible; do not move product report policy into
   core.
4. Keep package dependency direction one-way and generated registry output
   reproducible.
5. Add shared concepts only when they solve a demonstrated cross-format need.
