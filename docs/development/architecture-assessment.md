# Architecture Assessment

This document records the current project-level architecture assessment. It is
intended to make structural risks explicit before more format families or
downstream consumers are added.

Assessment date: 2026-08-07

## Executive Summary

The repository has a sound architectural direction:

- `Value IR`, `Shape IR`, and `Constraint IR` have distinct purposes.
- Parsers and generators are connected through descriptor capabilities rather
  than format-specific route code.
- The SDK is an orchestration boundary rather than the semantic home of every
  format.
- YAML, CSV, and TOML now lower through shared core value helpers instead of calling
  another format parser.
- TOML now declares Value root-shape capabilities, so array-root CSV to
  object-root TOML routes are rejected during planning rather than exposed as
  executable routes.
- Tests cover the current routes, package contracts, diagnostics, and public
  API snapshots broadly.

The project is suitable for continued beta development and early downstream
integration. It should not yet promise a fully stable SDK contract without
addressing the runtime validation and capability-reporting issues below.

The TOML slice completed the runtime-validation part of this assessment and
added root-shape compatibility to Value route planning. Incompatible array and
object routes now fail before parsing or generation, without implicit wrapping.

## Current Maturity

| Area                        | Assessment            | Comment                                                                                       |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| IR boundaries               | Strong                | The Value/Shape/Constraint split is explicit and documented.                                  |
| Parser/generator separation | Strong                | Format packages mostly depend on core, not on each other.                                     |
| Route planning              | Stronger              | Descriptor-driven planning now includes Value root-shape compatibility.                       |
| Public SDK surface          | Beta-stable           | The main entry points are clear, but several contracts are duplicated manually.               |
| Runtime input validation    | Improved              | Shared validation and TOML descriptor guards reject malformed runtime input structurally.     |
| Diagnostics                 | Good foundation       | Structured diagnostics exist, but code and location contracts are not fully typed or uniform. |
| Maintainability             | Good but concentrated | `registry.ts`, `convert.ts`, and core traversal/transform modules are hotspots.               |

## Priority Risks

### P1 — Value IR validation is not a complete runtime boundary (mostly resolved)

The shared implementation in
[`packages/core/src/value/internal.ts`](../../packages/core/src/value/internal.ts)
now validates the principal runtime cases:

- unknown `node.kind` values;
- malformed documents and missing roots;
- malformed scalar, array, object, and field nodes;
- duplicate object field names and non-finite numbers.

This matters because generator APIs are exposed to JavaScript consumers and
custom integrations, not only to TypeScript callers. A malformed Value IR
should consistently become an `invalid-generator-input`-style result.

Remaining direction:

1. Make recursive conversion helpers return structured failures at every
   public boundary rather than relying on callers to validate first.
2. Keep explicit diagnostics such as `invalid-value-kind` and
   `invalid-value-document` aligned across all generators.
3. Make recursive conversion helpers exhaustive after validation, or return a
   structured failure rather than assuming a valid discriminated union.
4. Add malformed-runtime-input tests that call the public `try*` APIs through
   `unknown` or JavaScript-shaped objects.

### P1 — `convert()` does not consistently return structured route failures

[`packages/sdk/src/convert.ts`](../../packages/sdk/src/convert.ts) handles an
unsupported IR preference as a result, but an unknown source or target format
can still escape as `ConversionRouteError`.

This is especially important because `ConversionFormat` intentionally accepts
extension strings. The public execution API should have one predictable rule:

- `planConversion()` may throw for an invalid planning request;
- `convert()` should return a discriminated failure for an unsupported route.

If throwing from `convert()` is retained, it must be documented as a stable
exception contract and covered separately from parse/generate failures. The
current mixed behavior is harder for SDK consumers to handle safely.

### P1 — Route capability field semantics are now aligned

In [`packages/sdk/src/registry.ts`](../../packages/sdk/src/registry.ts),
`supportsShapeIr` and `supportsConstraintIr` describe the intersection of
source and target capabilities, while `supportsValueIr` now checks parser Value
output, generator Value entry, and compatible Value root shapes.

Routes such as `json -> typescript` now report `supportsValueIr: false`, while
Value-only routes report it only when the target can consume Value IR. Optional
root-shape metadata also prevents statically incompatible array/object routes
from being advertised.

## Public Interface Stability

### What is already stable enough

The following are good candidates for the Stage 1 consumer boundary:

- `convert()`;
- `planConversion()`;
- `listConversionRoutes()`;
- `describeConversionRouteCapabilities()`;
- `describeFormatSupport()`;
- `collectUserFacingDiagnostics()`;
- the discriminated conversion result envelope;
- public API snapshots and runtime contract schemas.

The route and result contracts are tested and documented better than most
internal APIs in the repository.

### Main stability risks

#### Two names for the same Shape IR model

`ShapeDocument` is currently an alias of `SchemaDocument`, and the core exports
both `shape*` and `schema*` types and factories through
[`packages/core/src/shape/index.ts`](../../packages/core/src/shape/index.ts).

This is technically compatible but creates a long-term vocabulary problem:
downstream code cannot tell whether “schema” means the shared Shape IR or a
source format such as JSON Schema.

Recommended direction:

- choose one canonical public vocabulary, preferably `Shape*` for the IR layer;
- retain the other vocabulary as documented deprecated aliases;
- use the canonical vocabulary in new code and documentation.

Do not perform a breaking rename while the SDK is beta; settle the policy first.

#### Public contract schemas are intentionally shallow

`publicConvertResultSchema` validates the result envelope, but artifacts are
still `unknown` and output is a broad union of string, record, and boolean.
This is reasonable for extensibility, but it means the schema does not fully
validate Value IR, Shape IR, or target-specific output semantics.

The documentation should explicitly call this a shallow envelope contract, or
the project should later add optional IR-specific schemas. A second complete
runtime schema system should not be introduced casually because it would create
another source of truth beside core TypeScript models and core validators.

#### Error codes are mostly untyped strings

Diagnostic and result codes are machine-consumable by convention, but most
public result types use `string`. This preserves extension flexibility but
weakens discoverability and prevents the compiler from catching code drift.

Recommended compromise:

- keep SDK-wide result codes open as `string`;
- add package-local unions for stable parser/generator codes;
- test code catalogs or document the stable codes per package;
- avoid one giant global error-code union.

## Duplication and Coupling

### Repeated format registration metadata

Adding one format currently requires editing multiple independent locations:

- SDK builtin format unions;
- public Zod enums;
- registry lists;
- parser and generator option dispatch;
- support matrix exceptions;
- option metadata tests;
- route tests and API snapshots.

This is manageable for the current number of formats but is the clearest
metadata drift risk.

The SDK-internal builtin format catalog now provides the common format
enumeration. Keep format-specific descriptions and options in their own
packages, and continue deriving registry and common discovery metadata from
that catalog where practical.

### `registry.ts` is a maintenance hotspot

[`packages/sdk/src/registry.ts`](../../packages/sdk/src/registry.ts) currently
combines registration, descriptor validation, capability normalization,
descriptor lookup, route planning, route stage construction, and capability
summaries.

The behavior is coherent, but the file is now large enough that unrelated
changes compete in one module. A future refactor should split these concerns
without changing the public exports.

Suggested internal split:

```text
registry/
  registration.ts
  descriptor-validation.ts
  route-planning.ts
  capability-summary.ts
  builtin-registry.ts
```

### Value IR compatibility must own root-shape route validity

The CSV/TOML boundary exposed an important layering rule. CSV produces an
array-root Value document, while TOML generation accepts an object-root Value
document. The inverse has the opposite mismatch. This is not a special
`csv -> toml` or `toml -> csv` rule and must not be hardcoded by format name in
the SDK.

The shared contract should be:

```text
parser Value capability
  -> Value IR root-shape contract
  -> generator Value entry constraint
  -> shared IR compatibility check
  -> SDK route planning
```

Parser and generator descriptors may declare supported Value root kinds, but
the compatibility algorithm belongs to the shared IR/pipeline layer. The SDK
should only consume that result. Statically disjoint routes must fail during
planning; dynamically unconstrained formats such as JSON and YAML may remain
plannable and let the generator validate the concrete Value root at runtime.

Do not introduce implicit wrapping, array-to-table coercion, or a CSV-specific
Table IR to make incompatible roots appear convertible.

### Descriptor boilerplate

Parser and generator descriptors repeatedly cast `context.options`, check IR
kind, and translate package results into the shared descriptor result shape.
This is not yet harmful duplication, but it increases the chance that one
format forgets a capability check or uses a different failure code.

Small shared helpers are appropriate for Value-only parser dispatch, requiring
Value IR or Shape IR in a generator, and common invalid-input result
construction. Format policy, lowering, inference, and target validation should
remain local.

### OpenAPI-to-JSON-Schema coupling

The OpenAPI parser depends on the JSON Schema parser and the OpenAPI generator
depends on the JSON Schema generator. This is defensible because OpenAPI 3.1
embeds JSON Schema semantics, but it is the only notable format-to-format
coupling in the current package graph.

Keep it as an explicit, documented adapter boundary. Avoid allowing more
format packages to call one another merely for convenience. If this dependency
grows, move the reusable JSON Schema conversion kernel into a core internal
module rather than creating a parser/generator chain.

## What Should Not Be Refactored Yet

The following changes would likely add risk without solving a current problem:

- introducing a new Table IR for CSV;
- merging Value, Shape, and Constraint IR into one universal node tree;
- making every parser support every output target;
- creating a global diagnostic ontology before current codes stabilize;
- extracting every small descriptor function into generic abstractions;
- replacing the current registry with dynamic package scanning;
- adding more format families before the SDK contract settles.

The existing semantic boundaries are more valuable than maximum abstraction.

## Recommended Work Order

1. Move Value root-shape compatibility calculation from SDK registry code into
   the shared core pipeline contract while preserving descriptor compatibility.
2. Settle the `convert()` unsupported-route failure contract.
3. Decide the canonical `Schema` versus `Shape` vocabulary.
4. Split the registry internally while preserving its public exports.
5. Add small descriptor helpers and package-local error-code unions.
6. Improve public artifact validation only when a real consumer requires it.

## Verification Baseline

The assessment was performed against the current workspace after the CSV
parser/generator work. The current validation baseline is green:

- 809 tests;
- TypeScript typecheck;
- ESLint;
- Prettier check;
- package boundary check;
- API snapshot check;
- workspace build.

Passing validation does not eliminate the risks above; it confirms that the
current behavior is internally consistent enough to refactor incrementally.

## Maintenance Rule

Update this document when one of the priority risks is resolved, when a public
contract changes, or when a new format introduces a new cross-format coupling.
Keep implementation plans and detailed semantic contracts in their existing
specialized documents rather than turning this assessment into a second
roadmap.
