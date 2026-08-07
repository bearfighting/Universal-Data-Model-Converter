# Current Status

This is the only repository-level status page.
It should stay short and answer:

- what the project can do today
- what is the next highest-leverage work
- what is intentionally deferred
- when the current state was last verified

## Current State

The repository is past architecture validation and has a stable-enough conversion kernel:

- multi-layer IR with `Value IR`, `Shape IR`, `Constraint IR`, and `IrModel`
- parser and generator packages for JSON, strict JSON-compatible YAML, strict header-based CSV, strict TOML v1, JSON Schema, TypeScript, OpenAPI 3.1, and Zod 4, including a static Zod source parser
- the Zod parser now uses a split static-analysis kernel with strict import, reference-cycle, presence, constraint-path, and diagnostic boundaries
- Zod static enums lower to literal unions, portable metadata is preserved through Constraint IR, and default input-presence caveats are reported explicitly
- structured diagnostics, semantic notes, capability declarations, and semantic-loss reporting
- an SDK planner that derives routes and route summaries from registries
- an SDK report layer that now includes higher-level `capabilityRequirements` and `lossHotspots` analysis for `typescript` targets
- shared semantic fixtures, generator contract helpers, cross-parser equivalence smoke, and a real-world corpus
- a shared `Shape IR` traversal helper in `@schema-transformation-toolkit/core` that now backs core schema validation plus generator diagnostics and validation passes
- a shared immutable `Shape IR` transform layer in `@schema-transformation-toolkit/core`
- a dedicated shape-normalization exit in `@schema-transformation-toolkit/core` built on top of the shared transform layer
- a descriptor-driven SDK registry with isolated custom parser/generator registration
- generic generator output typing, descriptor analysis hooks, versioned registration errors, and shared descriptor contract helpers

Shared normalization coverage currently includes:

- union flattening and deduplication
- single-member union collapse
- unknown-evidence canonicalization
- `IdentifierName.words` metadata canonicalization for documents, definitions, and fields

The main structural risk is no longer missing tests, obvious parser or generator correctness bugs, or duplicated first-pass `Shape IR` traversal mechanics.
The sharper next risks are:

- keeping the new traversal contract stable while the IR evolves
- keeping transform and normalization semantics just as disciplined as traversal semantics
- deciding which future shared shape rewrites belong in normalization rather than in parsers or generators
- continuing to expand shared semantics only when pressure is truly cross-format
- freezing a small consumer-facing SDK contract and presentation layer without coupling downstream product layers to internals
- publishing stable consumer-facing capability summaries instead of forcing downstream surfaces to scrape prose docs

## Supported Routes

Validated end-to-end routes today:

- `json -> value -> shape -> typescript`
- `json -> value -> shape -> json-schema`
- `json -> value -> json`
- `yaml -> value -> yaml`
- `yaml -> value -> shape -> typescript/json-schema`
- `json -> value -> yaml`
- `csv -> value -> json/yaml/csv`
- `json/yaml -> value -> csv`
- `csv -> value -> shape -> typescript/json-schema`
- `toml -> value -> shape -> typescript/json-schema`
- `toml -> value -> json/yaml/typescript/json-schema/zod/openapi/toml`
- `json/yaml -> value -> toml` when the parsed Value root is an object
- `json-schema -> shape -> typescript`
- `json-schema -> shape + constraint -> json-schema`
- `typescript -> shape -> typescript`
- `typescript -> shape -> json-schema`
- `json -> shape -> zod`
- `json-schema -> shape + constraint -> zod`
- `typescript -> shape -> zod`
- `json -> shape -> openapi`
- `json-schema -> shape + constraint -> openapi`
- `typescript -> shape -> openapi`
- `openapi -> shape + constraint -> openapi`
- `zod -> shape + constraint -> json-schema/typescript/zod/openapi`

Shared shape semantics currently cover:

- scalar
- literal
- object
- fixed fields with typed additional properties
- array
- tuple
- record or map
- union
- local references and reusable definitions
- safe object-only `allOf` composition
- `null`
- optional presence
- `unknown`

Shared constraint and annotation coverage currently includes:

- string constraints: `pattern`, `minLength`, `maxLength`, `format`
- numeric constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- collection constraints: `minItems`, `maxItems`, `uniqueItems`
- object constraints: `closed-object`, `minProperties`, `maxProperties`
- portable annotations: `default`, `description`, `examples`, `readOnly`, `writeOnly`

## Current Priorities

Recommended order for the next repository slice:

1. finish the remaining documented pre-Web blockers in [consumer-surface-checklist.md](consumer-surface-checklist.md):
   - explicitly freeze the Stage 1 `@schema-transformation-toolkit/sdk` consumer contract
   - expand and settle the new small product-scenario matrix
   - keep the already-implemented machine-readable route and format surface documented as the downstream source of truth
2. keep traversal, transform, normalization, and reporting stable while downstream consumer surfaces start depending on `@schema-transformation-toolkit/sdk`
3. treat release notes, richer diagnostic-location guidance, and Worker-oriented integration notes as urgent follow-up work, but not reasons to block the first downstream Web iteration
4. keep the public SDK contract and UI-friendly diagnostic model small and stable
5. complete the planned format-layer convergence review across JSON, YAML, CSV, and TOML before adding another parser/generator family

The first additional target families are now implemented as `@schema-transformation-toolkit/generator-zod`
and `@schema-transformation-toolkit/generator-openapi`. OpenAPI generation is intentionally limited to
canonical 3.1 schema documents; full API document generation remains deferred.

TOML is now implemented as the first additional strict Value format after CSV.
Its generator intentionally requires an object root. Statically incompatible
array/object routes such as CSV to TOML are rejected during planning, while
dynamically unconstrained JSON/YAML routes validate the concrete root during
generation rather than applying an implicit wrapper.

This page is intentionally only a short status summary.
Use [consumer-surface-checklist.md](consumer-surface-checklist.md) as the single detailed readiness checklist instead of duplicating its task breakdown here.
See [architecture-assessment.md](architecture-assessment.md) for the current
project-level review of interface stability, coupling, duplication, and
refactoring priorities.
The staged execution checklist is in
[pipeline-refactor-checklist.md](pipeline-refactor-checklist.md).

## What Is Deferred

The repository should not prioritize these yet:

- broad new parser families
- many new generators in parallel
- property-based expansion before the current shared traversal layer and first consumer-facing contract have settled
- TypeScript type-system ambition beyond the current schema-oriented subset
- format-local options that weaken the shared semantic contract

The next new format slice, once the current consumer-surface blockers are cleared, should still be a generator rather than another parser family.

## Recent Completed Work

As of July 23, 2026, the latest completed slice includes:

- shared semantic fixtures and helpers for diagnostics, generator contracts, capability coverage, and corpus execution
- first `typescript <-> json-schema` cross-parser equivalence smoke
- TypeScript syntax validation and JSON Schema structural validation in generator contract tests
- generator truthfulness assertions for `integer`, `unknown`, and `unknown`-absorbing unions
- route-local integration shrinkage away from duplicate full payload snapshots
- real-world corpus expansion from 6 to 10 cases
- first shared `Shape IR` traversal extraction in `@schema-transformation-toolkit/core`
- migration of core schema validation and both generator diagnostics and validation passes onto the shared walker
- focused traversal contract tests for path rules, reference-follow behavior, cycle guards, and traversal context metadata
- public API snapshot updates for the new traversal exports
- first shared immutable `Shape IR` transform extraction in `@schema-transformation-toolkit/core`
- explicit transform entry semantics aligned with traversal across structure, root, and definitions modes
- explicit transform reference policy for root-reachable definition rewriting
- first dedicated `normalizeSchema...` exit built on top of transform, currently covering union flattening, union deduplication, single-member union collapse, unknown-evidence canonicalization, and identifier-word metadata canonicalization
- focused normalization tests covering structure-wide, root-reachable, and definitions-only normalization behavior
- first traversal-policy-backed `sdk` report analysis fields for `capabilityRequirements` and `lossHotspots`
- development documentation for interpreting higher-level `sdk` report analysis
- a package-local `@schema-transformation-toolkit/sdk` README with `convert(...)` and report-reading guidance
- a report-contract test that keeps the documented `sdk` analysis example aligned with real output
- an examples walkthrough and runnable script for higher-level `@schema-transformation-toolkit/sdk` report interpretation
- public `@schema-transformation-toolkit/sdk` contract schemas and a UI-friendly diagnostic normalization helper for downstream consumers
- a first dedicated SDK product-scenario matrix covering `success`, `caveat`, `unsupported`, and `invalid-input` flows, plus `typescript -> typescript`, `json-schema -> json-schema`, and source-range-bearing parser failures
- a first dedicated Web integration note for wiring format discovery, route discovery, conversion execution, and normalized diagnostics together
- a first non-npm release path with version-sync scripts, annotated tags, tag-driven GitHub Releases, and attached package tarballs

The resulting maturity is now:

- traversal: stable enough for current shared analysis consumers
- transform: usable but intentionally narrow
- normalization: real and already reused by test equivalence helpers, but still early enough that new rules should be added selectively
- registry extensibility: built-in discovery is descriptor-driven; third-party registration is explicit and runtime package scanning remains intentionally deferred

The first pipeline-contract refactor slice is now implemented: core exposes
typed `IrDocument`, `IrArtifacts`, `IrBundle`, parser/generator execution
contexts, transformer descriptors, and generic parser/generator capability
contracts. Existing descriptors use bundle inputs and canonical parse results;
SDK route selection remains intentionally unchanged until the later registry
and two-stage pipeline phases.

A follow-up contract-hardening slice now validates IR bundles and artifacts at
the pipeline boundary, validates transformer input/output kinds, preserves
parser failure mappings, and covers malformed bundle and transformer-output
cases in core tests. Canonical descriptor contracts now live under the core
pipeline boundary, and registry capability registration rejects inconsistent
legacy/new IR declarations before route planning. Core also owns generic parser
and generator execution boundaries, including exception conversion and
artifact-preserving SDK adaptation.

Phase 2 generic compatibility planning is now implemented: core owns IR-kind
and Value root-shape compatibility, exposes the default Value-to-Shape
transformer, and the SDK adapts generic plans without format-pair rules.
CSV-to-TOML and TOML-to-CSV are rejected from route discovery because their
declared array/object Value contracts do not intersect; the current builtin
route count is 46. Shape-to-Constraint remains explicit rather than being
invented by generic inference.

The Phase 0 baseline is now recorded in
[pipeline-refactor-checklist.md](pipeline-refactor-checklist.md): 849 tests,
46 builtin routes, passing package/API boundary checks, and the intentional
beta contract changes for Phase 1/2. The current Phase 1/2 worktree must be
committed as a clean boundary before Phase 3 generated-registry work begins.

This slice did not expose a blocking parser, IR, generator, or public-surface regression.
It moved shared traversal extraction from the next refactor into implemented repository infrastructure.

## Verification

The latest full local verification pass completed on August 7, 2026 and included:

- `./node_modules/.bin/vitest run` (71 test files, 849 passing tests)
- `./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/eslint .`
- `./node_modules/.bin/prettier --check .`
- `node scripts/check-boundaries.mjs`
- `node scripts/check-api-snapshots.mjs`
- `git diff --check`
- direct `tsup` builds for the TOML parser, TOML generator, and SDK

The workspace `pnpm build` wrapper still cannot run in this environment because
pnpm cannot open its database; the equivalent affected package builds passed
directly through `tsup`.

A prior broader verification pass completed on July 22, 2026 and included:

- `pnpm check:api`
- `pnpm typecheck`
- `pnpm test`

That pass was green with `39` test files and `520` passing tests.

A targeted verification pass completed on July 23, 2026 and included:

- `./node_modules/.bin/vitest run tests/sdk/report.test.ts tests/sdk/api-contract.test.ts tests/generators/typescript/analysis.test.ts`
- `./node_modules/.bin/tsc --noEmit`

That targeted pass was green and covered the new `sdk` report-analysis surfaces plus their public examples.

## Reading Order

For active implementation work:

- read [test_plan.md](test_plan.md) for the current testing strategy
- read [consumer-surface-checklist.md](consumer-surface-checklist.md) before deciding whether more core work should block downstream product integration
- read [architecture-assessment.md](architecture-assessment.md) before making project-wide interface or structural refactors
- read [release-process.md](release-process.md) when cutting a GitHub-tagged engine release without npm publication
- read [web-integration-notes.md](web-integration-notes.md) when wiring the first downstream Web surface onto `@schema-transformation-toolkit/sdk`
- read [schema-traversal.md](schema-traversal.md) before changing shared IR traversal, transform, or normalization behavior
- read [ir-evolution.md](ir-evolution.md) before proposing new shared IR concepts or nodes
- read [sdk-report-analysis.md](sdk-report-analysis.md) or [../../packages/sdk/README.md](../../packages/sdk/README.md) when changing higher-level `sdk` report interpretation or examples
- read [typescript-parser-cases.md](typescript-parser-cases.md) and [typescript-parser-preprocess.md](typescript-parser-preprocess.md) only when touching the TypeScript parser boundary
