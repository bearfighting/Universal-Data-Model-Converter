# Parser / IR / Generator Pipeline Refactor Checklist

This checklist tracks the staged refactor described in
[architecture-layering.md](architecture-layering.md). Each phase must pass its
validation gate before the next phase starts.

## Phase 0 — Baseline and freeze

- [x] Record the current test count, route count, public API snapshots, and package boundaries.
- [x] Confirm JSON, YAML, CSV, and TOML normal conversion fixtures are green.
- [x] Confirm no new parser/generator family is added during this refactor.
- [x] Record intentional public API changes for the Phase 1/2 implementation boundary.

Phase 0 baseline record (2026-08-07):

- Reference branch: `refactorings`.
- Last committed baseline before the current Phase 1/2 worktree: `847fcbb`.
- Current verification: 71 test files, 849 passing tests; TypeScript,
  ESLint, Prettier, package boundaries, API snapshots, and `git diff --check`
  all pass.
- Current builtin route count: 46. Static `csv -> toml` and `toml -> csv`
  routes are intentionally absent.
- Public API snapshots are tracked for core, SDK, and all affected parser and
  generator packages.
- The current worktree contains the Phase 1/2 implementation and is not yet a
  clean release boundary. Phase 3 must begin from a committed clean baseline.

Intentional beta API changes recorded for Phase 1/2:

- Core exposes generic IR bundle, compatibility planner, transformer contract,
  and default Value-to-Shape transformer exports.
- Core contracts add parser output and generator input artifact metadata and
  allow `IrPipelinePlan.selectedIr` to represent any `IrKind`.
- SDK registry accepts optional transformer registration and lookup methods.
- SDK conversion failures add `phase: "transform"`.
- SDK conversion reports can expose transform diagnostics and semantic notes.
- Legacy descriptor fields (`entryIr`, `overlays`, and top-level root metadata)
  and existing format package entry points remain as compatibility aliases.

Validation gate:

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
git diff --check
```

## Phase 1 — Core descriptor and result contracts

- [x] Define generic `IrDocument` and typed parser/generator result contracts.
- [x] Define `IrTransformerDescriptor` and `TransformResult`.
- [x] Define parser output and generator input contracts, including Value root shapes.
- [x] Keep core free of concrete parser/generator imports.
- [x] Add descriptor contract fixtures for parser, transformer, and generator roles.
- [x] Add core parser and generator execution boundaries with structured failures.
- [x] Validate primary IR documents and supplementary artifacts at execution boundaries.
- [x] Preserve all canonical artifacts when adapting results to the current SDK facade.
- [x] Update core API snapshots intentionally.

Validation gate:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run packages/core tests/core
node scripts/check-api-snapshots.mjs
node scripts/check-boundaries.mjs
```

Exit criteria:

- A parser, transformer, and generator can be defined and tested without SDK imports.
- Malformed descriptors fail with structured registration errors.
- Existing descriptors consume and produce the canonical bundle contract.
- Parser and generator execution can be tested without SDK orchestration.

## Phase 2 — Generic IR compatibility and pipeline planning

- [x] Move IR-kind compatibility into core pipeline logic.
- [x] Move Value root-shape compatibility into the same generic compatibility layer.
- [x] Model Value-to-Shape and Shape-to-Constraint as transformer paths.
- [x] Generate routes from parser output, transformer edges, and generator input contracts.
- [x] Remove format-pair checks from route planning.
- [x] Test static incompatibility and runtime dynamic-root failures separately.

Validation gate:

```bash
./node_modules/.bin/vitest run tests/sdk/registry.test.ts tests/sdk/support-matrix.test.ts
./node_modules/.bin/tsc --noEmit
```

Required cases:

- [x] `csv -> toml` has no compatible path.
- [x] `toml -> csv` has no compatible path.
- [x] `json -> toml` remains statically plannable.
- [x] Scalar JSON input to TOML fails only after the concrete Value IR is produced.
- [x] Custom descriptors with compatible contracts produce routes automatically.

Phase 2 implementation notes:

- Core exposes `planIrPipeline()` and normalizes legacy capability fields into
  generic parser output and generator input contracts.
- Value root-shape compatibility is evaluated as contract intersection; the
  planner never wraps or reshapes a Value document.
- Core provides a default `value-to-shape` transformer. Shape-to-Constraint is
  only used when an explicit transformer or parser-produced Constraint artifact
  exists.
- The SDK remains the builtin registry owner for this phase, but delegates
  compatibility decisions to core and adapts generic plans to its route shape.

## Phase 3 — Registry core and generated builtin registry

- [x] Remove builtin parser/generator imports from the registry core.
- [x] Keep registry responsibilities limited to registration, validation, lookup, and listing.
- [x] Define the component manifest format for parser, transformer, and generator packages.
- [x] Implement deterministic build-time registry generation.
- [x] Sort manifests and generated registrations deterministically.
- [x] Fail generation for duplicate roles, formats, IDs, or missing exports.
- [x] Support explicit third-party manifests without runtime package scanning.
- [x] Add `--check` mode to detect stale generated registry output.

Phase 3 implementation notes:

- `@schema-transformation-toolkit/core` owns the format-independent
  `DescriptorRegistry`; SDK keeps a compatibility adapter.
- Builtin package metadata uses
  `schemaTransformationToolkit.registry: { version: 1, entries: [...] }`.
- `scripts/generate-builtin-registry.mjs` writes the committed
  `packages/sdk/src/generated/builtin-registry.ts` artifact.
- The generated registry explicitly registers the default Value-to-Shape
  transformer. SDK fallback behavior remains only for legacy custom registries.
- Third-party manifests are explicit inputs to the generator; no runtime
  package scanning is used.

Phase 3 verification record (2026-08-07):

- 73 test files, 855 passing tests;
- TypeScript, ESLint, Prettier, package boundaries, API snapshots, generated
  registry `--check`, direct core/SDK builds, and `git diff --check` pass.

Validation gate:

```bash
node scripts/generate-builtin-registry.mjs --check
node scripts/check-boundaries.mjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run tests/registry tests/plugins
```

Exit criteria:

- The registry core test runs with an empty registry.
- Builtin registration is supplied only by generated code.
- A fixture third-party component registers through the same API.

## Phase 4 — Two-stage execution pipeline

- [x] Implement standalone descriptor execution through core `executeParser(...)`.
- [x] Implement standalone descriptor execution through core `executeGenerator(...)`.
- [x] Implement generic transformer execution between them.
- [x] Move diagnostics, semantic notes, artifacts, and losses into pipeline results.
- [x] Ensure parser and generator packages do not call each other.
- [x] Add direct parser-to-IR and IR-to-generator contract tests.

Validation gate:

```bash
./node_modules/.bin/vitest run tests/pipeline tests/parsers tests/generators
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
```

Exit criteria:

- [x] Every existing successful route can be executed through the generic pipeline.
- [x] Every expected parser and generator failure retains its component diagnostic code.

Phase 4 verification record (2026-08-08):

- Core exposes `executePipeline(...)` with stage-grouped diagnostics and
  semantic notes, artifact-preserving failures, and generator semantic-loss
  collection.
- SDK `convert(...)` now delegates parse, transformer, and generator execution
  to the generic pipeline while preserving the existing public result facade.
- 74 test files and 859 tests pass, including direct core pipeline contracts,
  custom registries, custom transformers, Value-only routes, Shape routes,
  Constraint overlays, and semantic-loss scenarios.

Phase 4 hardening follow-up (2026-08-08):

- `ConversionExecutionPlan` now carries the complete core `IrPipelinePlan`,
  including required supplementary artifacts; SDK conversion no longer
  reconstructs the plan from route summaries.
- The core executor validates transformer stage contracts, stage continuity,
  selected IR, and required artifact kinds before execution.
- Pipeline boundary failures now produce stage diagnostics, including missing
  transformers, missing artifacts, plan mismatches, parser-only IR, and
  generator analysis failures.
- Direct tests cover multi-transformer chains, custom supplementary artifacts,
  plan mismatch rejection, and analysis failure diagnostics.
- Descriptor exceptions now receive stage diagnostics, parse-to-transform input
  mismatches are rejected before transformer execution, and analysis requests
  without route capability context fail explicitly instead of skipping loss
  analysis.

## Phase 5 — Format migration

Migrate one family at a time, in this order:

- [x] JSON
- [x] YAML
- [x] CSV
- [x] TOML
- [x] JSON Schema
- [x] TypeScript
- [x] Zod
- [x] OpenAPI

For each family:

- [x] Add or migrate its descriptor manifest entry.
- [x] Declare parser output and generator input contracts.
- [x] Remove SDK-specific execution and option dispatch for the family.
- [x] Run package-local parser/generator tests.
- [x] Run generic pipeline integration tests.
- [x] Verify normal output and structured failures are unchanged.
- [x] Update API snapshots and package boundary declarations if needed.

Phase 5 verification record (2026-08-08):

- All eight parser and generator families were verified through the generated
  descriptor registry and their declared IR contracts; those registrations
  were established by the earlier registry and pipeline phases.
- SDK `convert()`, `parseSource()`, and `generateTarget()` resolve advanced
  options from the selected descriptor rather than maintaining per-format
  execution dispatch. Existing `typeScript` and `jsonSchema` option keys are
  matched compatibly with their descriptor formats.
- Existing Value-only, Value-to-Shape, Shape + Constraint, root-shape failure,
  semantic-loss, custom registry, and OpenAPI/JSON Schema adapter scenarios
  remain covered by the generic pipeline and integration tests. The Phase 5
  change specifically consolidates SDK component option adaptation around the
  selected descriptors.
- Focused format matrix: JSON, YAML, CSV, TOML, JSON Schema, TypeScript, Zod,
  and OpenAPI each execute through `convert()` and assert the planned route;
  Value-only, Value-to-Shape, and Shape + Constraint artifact lanes are also
  asserted. Custom descriptor options are verified through `createConverter()`
  rather than only through the resolver unit test.
- Verification: 76 test files, 876 passing tests; TypeScript, ESLint,
  Prettier, boundary, API snapshot, generated registry, and diff checks all
  passed.

Phase 5 deliberately does not remove SDK builtin imports, hardcoded public
format unions, or builtin output typing. Those changes remain Phase 6 work.

Validation gate after each family:

```bash
./node_modules/.bin/vitest run <focused-package-tests> <focused-integration-tests>
./node_modules/.bin/tsc --noEmit
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
git diff --check
```

## Phase 6 — SDK reduction and public API migration

- [ ] Remove concrete parser/generator imports from SDK source.
- [ ] Remove format-specific route and dispatch switches from SDK.
- [ ] Make `createConverter(registry)` the primary extensibility boundary.
- [ ] Replace hardcoded builtin format unions with registry-driven discovery or generated types.
- [ ] Replace hardcoded builtin output maps with registry-aware generic output typing.
- [ ] Keep SDK responsible only for request normalization, pipeline invocation, and public result wrapping.
- [ ] Update public API documentation, contracts, snapshots, and migration notes.

Validation gate:

```bash
./node_modules/.bin/vitest run tests/sdk tests/integration
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
```

Exit criteria:

- SDK can run with a custom registry and no builtin assumptions in its core logic.
- Public breaking changes are documented and reflected in runtime contracts.

## Phase 7 — Build and third-party integration

- [ ] Make build ordering explicit: core, components, generated registry, SDK.
- [ ] Run registry generation before SDK compilation.
- [ ] Include generated registry output in distributable artifacts.
- [ ] Add a third-party parser/generator/transformer fixture package.
- [ ] Build the fixture through the same manifest path as builtin components.
- [ ] Verify tree-shaking and ESM package resolution for the generated registry.
- [ ] Verify a clean checkout can regenerate identical registry output.

Validation gate:

```bash
node scripts/generate-builtin-registry.mjs --check
pnpm build
node scripts/check-sdk-package.mjs
```

If the local pnpm wrapper cannot run, execute the affected package builds
directly and record the environment limitation rather than treating it as a
passing workspace build.

## Final acceptance

- [ ] Full test suite passes.
- [ ] Typecheck, lint, formatting, boundaries, and API snapshots pass.
- [ ] No parser/generator package imports another format package for conversion.
- [ ] SDK has no format-pair compatibility rules.
- [ ] Registry core has no builtin component imports.
- [ ] Builtin and third-party registration use the same descriptor contract.
- [ ] Static IR incompatibility fails during planning.
- [ ] Dynamic input incompatibility fails during runtime IR validation.
- [ ] Public API migration notes are complete.
- [ ] Release notes describe the refactor and any breaking changes.
