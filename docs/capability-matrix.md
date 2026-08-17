# Capability Matrix

This document describes the current supported boundary for the public SDK. It
is a human-readable compatibility guide, not a promise that every pair in the
format list is available. Use `listConversionRoutes()` and
`describeConversionRouteCapabilities(...)` for the runtime source of truth.

## Format capabilities

| Format      | Primary semantics  | Typical input/output                           | Important boundary                                                                  |
| ----------- | ------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| JSON        | Value              | concrete data and normalized JSON              | sample data does not encode every schema rule                                       |
| YAML        | Value              | strict YAML data and YAML output               | JSON-compatible single document only                                                |
| CSV         | Value              | flat object arrays                             | header-based; cells become strings; array root required                             |
| TOML        | Value              | object-root TOML data                          | object root required; dates, non-finite numbers, and unsafe integers rejected       |
| JSON Schema | Shape + Constraint | schema documents                               | current IR-aligned subset; not a full JSON Schema platform                          |
| TypeScript  | Shape              | schema-oriented declarations                   | supported subset only; not a full TypeScript front-end                              |
| Zod         | Shape + Constraint | static Zod 4 expressions and generated modules | supported static expressions only; consuming project needs Zod 4 for runtime output |
| OpenAPI     | Shape + Constraint | canonical schema-compatible documents          | bounded OpenAPI schema boundary; not full document generation                       |
| Rust        | Shape + Constraint | structs, unit enums, string-keyed maps         | serializable data-model subset; no data-carrying enums, Serde, aliases, or generics |

## Validated route families

The following route families are currently covered by end-to-end tests and
shared pipeline execution:

| Source      | Targets                                     | Route character                          |
| ----------- | ------------------------------------------- | ---------------------------------------- |
| JSON        | JSON, YAML, TypeScript, JSON Schema, Zod    | Value direct or Value-to-Shape inference |
| YAML        | YAML, TypeScript, JSON Schema               | Value direct or Value-to-Shape inference |
| CSV         | CSV and compatible Value routes             | flat array-root Value                    |
| TOML        | TOML and compatible Value routes            | object-root Value                        |
| JSON Schema | JSON Schema, TypeScript, Zod, OpenAPI       | Shape, often with Constraint artifacts   |
| TypeScript  | TypeScript, JSON Schema, Zod                | Shape subset                             |
| Zod         | Zod, TypeScript, JSON Schema, OpenAPI       | Shape + Constraint subset                |
| OpenAPI     | schema-compatible OpenAPI targets           | explicit JSON Schema adapter boundary    |
| Rust        | Rust, TypeScript, JSON Schema, Zod, OpenAPI | structs, unit enums, maps, numeric hints |

The exact route set can vary with registry contents and descriptor capabilities.
Do not infer support for a route merely because both format names appear in
this table.

## Shared semantic support

| Capability                    | Value routes                | Shape routes                                   | Notes                                              |
| ----------------------------- | --------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| Scalars and literals          | supported                   | supported                                      | representable scalar kinds only                    |
| Objects and fields            | supported                   | supported                                      | optional presence is distinct from nullability     |
| Arrays and tuples             | supported                   | supported                                      | tuple inference depends on source evidence/options |
| Records/additional properties | limited by format           | supported where declared                       | target may widen or reject the construct           |
| Unions                        | inferred only with evidence | supported in the current subset                | overlapping branches may produce caveats           |
| References/definitions        | not a Value concept         | supported where parser/generator declares it   | document-level reference semantics remain bounded  |
| Constraints                   | not present in raw values   | supported through Constraint IR where declared | constraints can be lost or normalized              |
| Semantic-loss reporting       | supported                   | supported                                      | inspect losses and caveats on success              |
| Supplementary artifacts       | route-dependent             | route-dependent                                | request `includeArtifacts` when needed             |

## Root-shape and representation rules

- Value IR represents concrete data and is suitable for JSON/YAML/CSV/TOML
  routes when the target's root requirements are satisfied.
- Shape IR represents schema structure and is used by JSON Schema, TypeScript,
  Zod, and OpenAPI routes.
- Constraint IR is an overlay, not a replacement for Shape IR.
- CSV generation requires an array-root Value document and currently targets
  flat object rows.
- TOML generation requires an object-root Value document.
- YAML generation consumes Value IR and therefore cannot create a concrete
  example directly from a schema-only source.
- Explicit `irPreference: "value"` or `"shape"` fails when that route cannot
  satisfy the requested representation.

## Output and fidelity expectations

The toolkit preserves semantic meaning where the shared IR can represent it.
It does not promise source-text preservation. Depending on the route, output
may normalize:

- whitespace and formatting;
- quote or escape spelling;
- number lexemes;
- comments;
- duplicate keys;
- source-only annotations or document metadata.

Successful conversions may still contain semantic caveats or losses. Treat
`report.semanticCaveats`, `report.losses`, and `report.lossHotspots` as part of
the output contract when fidelity matters.

## Failure categories

| Situation                               | Expected behavior                                   |
| --------------------------------------- | --------------------------------------------------- |
| Unknown format or unsupported route     | route-planning failure before execution             |
| Malformed source input                  | structured `parse` failure                          |
| Unsupported source semantics            | structured parser failure, usually with diagnostics |
| Transformer incompatibility             | structured `transform` failure                      |
| Dynamic root-shape mismatch             | structured runtime failure                          |
| Missing required artifact               | structured `generate` failure                       |
| Generator rejection or analysis failure | structured `generate` failure                       |

Failures retain safe diagnostics and artifacts from completed stages when
available. This distinction is useful when building editor, CLI, or batch
processing integrations.

## Discovery APIs

For dynamic product surfaces, use:

- `listSourceFormatSupports()`
- `listTargetFormatSupports()`
- `listFormatSupports()`
- `listConversionRoutes()`
- `describeConversionRouteCapabilities(source, target)`
- `describeFormatSupport(format)`
- `describeConversionOptions(source, target)`

These APIs are preferable to copying this document into application logic.
This document explains the boundary for people; the registry describes the
actual installed capability set for machines.

## Compatibility status

The SDK public result shape, failure phases, diagnostics, semantic notes,
losses, and artifacts are compatibility-sensitive. Lower-level parser and
generator internals are not the recommended consumer contract. See the
[development progress](development/progress.md) for current maturity and
[CHANGELOG](../CHANGELOG.md) for release history.
