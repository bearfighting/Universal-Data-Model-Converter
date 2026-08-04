# Agent Development Guide

## Project Overview

This repository is a schema transformation toolkit for serializable data
shapes. Its primary architecture is:

```text
parser -> Value IR / Shape IR / Constraint IR -> generator
```

`@schema-transformation-toolkit/core` owns shared semantic models, invariants, traversal, transforms,
normalization, and pipeline contracts. `@schema-transformation-toolkit/sdk` is the public consumer
boundary for downstream Web, CLI, documentation, and other product surfaces.

The currently supported format families are:

- JSON
- JSON Schema
- TypeScript

The currently validated routes are:

- `json -> typescript`
- `json -> json-schema`
- `json-schema -> typescript`
- `json-schema -> json-schema`
- `typescript -> typescript`
- `typescript -> json-schema`

## Design Principles

- Keep the shared IR semantic and schema-oriented; do not turn it into a
  TypeScript-shaped AST.
- Prioritize stable serialized data shapes such as scalars, objects, arrays,
  tuples, records, unions, nullability, and optional presence.
- Keep parser, IR, and generator responsibilities separate.
- Reject unsupported semantics explicitly instead of approximating them
  silently.
- When a conversion succeeds with widening, normalization, or semantic loss,
  report that outcome through structured diagnostics, notes, or losses.
- Add shared IR concepts only when the pressure is genuinely cross-format.
- Keep format-specific policy in the relevant parser or generator unless it
  represents shared semantic meaning.

## Default Development Workflow

For a new capability or refactor:

1. Confirm the intended schema semantics and boundary conditions.
2. Decide whether the change belongs in parser logic, shared IR, generator
   logic, SDK orchestration, or documentation.
3. Add or update focused tests for success, failure, and semantic caveat cases.
4. Implement the smallest complete vertical slice.
5. Update package README files and development documentation when the public or
   development contract changes.
6. Run the relevant validation commands.
7. Review the final diff and repository status before handing off the change.

Prefer incremental changes over broad partially implemented features. Preserve
existing user changes and avoid unrelated cleanup.

## Validation Commands

The normal validation baseline is:

```bash
pnpm test
pnpm typecheck
```

For public API, package-boundary, or cross-package changes, also run:

```bash
pnpm lint
pnpm check:public-api
```

Run these checks when relevant:

```bash
pnpm format:check
pnpm build
```

Public API changes must update runtime contracts, contract tests, and API
snapshots. Do not treat parser or generator internals as stable downstream
dependencies. Consumer-facing option explanations should be added to the
package catalogs and exposed through the SDK option metadata APIs.

## Public API and Compatibility Rules

- Treat `@schema-transformation-toolkit/sdk` as the stable downstream integration boundary.
- Keep ordinary conversion flow controlled by discriminated result values,
  rather than thrown exception strings.
- When adding public SDK fields or functions, update the runtime schemas,
  contract tests, documentation, and API snapshots together.
- Keep capability summaries, diagnostics, semantic caveats, and losses aligned
  with actual parser and generator behavior.
- Do not expose low-level traversal helpers, parser internals, generator
  internals, or raw IR utilities as accidental consumer contracts.
- Mark unsupported or experimental options honestly; do not present future
  configuration as currently available.

## Safe Repository Practices

- Preserve unrelated work already present in the working tree.
- Do not use destructive commands such as `git reset --hard` or broad deletion
  commands unless explicitly requested and the exact targets are confirmed.
- Keep changes within the requested scope.
- Before handoff, inspect `git diff --check`, `git status`, and the validation
  results.
- Do not commit changes unless the user explicitly requests a commit.

## Documentation Routing

Read the development documentation in this order:

1. [`docs/development/progress.md`](docs/development/progress.md) for current
   repository status and priorities.
2. [`docs/development/workflow.md`](docs/development/workflow.md) for the
   implementation and validation loop.
3. [`docs/development/scope.md`](docs/development/scope.md) for project
   boundaries and non-goals.
4. [`docs/development/acceptance.md`](docs/development/acceptance.md) for the
   definition of done.
5. [`docs/development/test_plan.md`](docs/development/test_plan.md) for testing
   strategy and refactor guardrails.
6. [`docs/development/consumer-surface-checklist.md`](docs/development/consumer-surface-checklist.md)
   for downstream consumer readiness.

Read these specialized references when the task requires them:

- IR boundaries and contracts:
  [`ir-boundaries.md`](docs/development/ir-boundaries.md),
  [`ir-contract.md`](docs/development/ir-contract.md)
- Traversal, transform, and normalization:
  [`schema-traversal.md`](docs/development/schema-traversal.md)
- SDK report interpretation:
  [`sdk-report-analysis.md`](docs/development/sdk-report-analysis.md)
- Capabilities and semantic loss:
  [`capabilities-and-loss.md`](docs/development/capabilities-and-loss.md)
- TypeScript parser behavior:
  [`typescript-parser-cases.md`](docs/development/typescript-parser-cases.md)
- JSON Schema boundaries:
  [`json-schema-shape-gap.md`](docs/development/json-schema-shape-gap.md)

The development documentation has one status page, `progress.md`, and one
testing-strategy page, `test_plan.md`. Prefer updating or linking those pages
instead of creating duplicate planning or status documents.
