# Current Status

This is the repository-level status page. Keep it short: current capability,
next work, intentional deferrals, and the latest verification baseline.

## Current State

The toolkit has a stable conversion kernel built around:

```text
parser → Value IR / Shape IR / Constraint IR → generator
```

The core owns IR contracts, validation, traversal, normalization, descriptor
registration, generic pipeline execution, stage evidence, artifact retention,
and semantic-loss collection. The SDK is the downstream boundary for route
planning, registry adaptation, report construction, and public result schemas.

Current platform capabilities:

- Builtin parser and generator descriptors for JSON, YAML, CSV, TOML, JSON
  Schema, TypeScript, Zod, and OpenAPI.
- All current conversion routes execute through the shared core pipeline.
- `createConversionRegistry(...)` supports custom parser, generator, and
  transformer registration.
- Generated builtin registry output is deterministic and included in the SDK
  build.
- SDK public contracts cover success, failure, diagnostics, semantic notes,
  losses, artifacts, route plans, and registry-safe custom output typing.
- Workspace builds run in the explicit order core → format packages → generated
  registry → SDK.
- A third-party manifest fixture and SDK tarball clean-install smoke are part
  of the acceptance path.

## Supported Routes

Validated route families include:

- Value routes: JSON, YAML, CSV, and TOML round trips where root constraints
  allow them.
- Shape routes: JSON, JSON Schema, TypeScript, Zod, and OpenAPI conversions.
- Constraint-preserving routes: JSON Schema, Zod, and OpenAPI routes where the
  descriptors declare Constraint IR support.
- Transformer routes: Value-to-Shape inference and registered multi-stage
  transformer chains.

Use the SDK registry APIs for the exact current route and format lists:

- `listSourceFormatSupports()`
- `listTargetFormatSupports()`
- `listConversionRoutes()`
- `describeConversionRouteCapabilities()`

## Next Priorities

1. Keep the public SDK contract, user guide, capability matrix, and consumer
   scenario matrix aligned with actual published behavior.
2. Decide whether the current builtin registry bundle should remain fully
   bundled or gain a measured tree-shaking strategy for downstream products.
3. Improve diagnostic location guidance for editor and code-highlighting
   integrations.
4. Validate the package surface against a clean external checkout or release
   artifact when the next prerelease is prepared.

## Intentional Deferrals

- Runtime package scanning and automatic third-party discovery.
- Removal of builtin compatibility aliases in a breaking release.
- Full browser or Worker execution support in the synchronous SDK.
- Full multi-file TypeScript resolution.
- Full OpenAPI document generation beyond canonical 3.1 schema documents.
- Broad new parser families or speculative IR expansion.
- More traversal, transform, or normalization features without a concrete
  cross-format consumer requirement.

## Maturity

- Traversal: stable for current shared analysis consumers.
- Transform: usable and intentionally narrow.
- Normalization: implemented and reused selectively.
- Registry extensibility: descriptor-driven builtin discovery and explicit
  third-party registration.
- Pipeline: all current SDK conversion routes use the shared core executor.
- SDK extensibility: `createConverter(registry)` is the primary custom boundary;
  builtin aliases remain supported for compatibility.
- Packaging: explicit workspace build, deterministic registry generation,
  third-party fixture validation, and SDK tarball smoke are complete.

## Verification Baseline

Latest completed baseline:

- 76 test files, 888 tests passing.
- TypeScript, ESLint, and Prettier passing.
- Package boundary and API snapshot checks passing.
- Generated builtin registry check passing.
- Explicit workspace build passing.
- Third-party manifest/custom registry smoke passing.
- SDK tarball clean-install smoke passing for all eight builtin format families.

Primary commands:

```bash
node scripts/build-workspace.mjs
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/prettier --check .
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
node scripts/generate-builtin-registry.mjs --check
node scripts/check-third-party-fixture.mjs
node scripts/check-sdk-package.mjs
```

## Reading Order

1. [design.md](design.md) for architecture and semantic boundaries.
2. [standards.md](standards.md) for implementation and validation rules.
3. Package `README`s and `examples/` for package-specific usage.

Last verified: 2026-08-08.
