# Changelog

All notable changes to this project are documented here.

The repository is currently in prerelease development. Workspace packages use
one shared version. The `Unreleased` section is moved into a versioned section
when a release is prepared.

## Unreleased

No unreleased changes.

## 0.1.1-beta.1

This is the first beta release of the shared conversion kernel and the Stage 1
`@aio/sdk` consumer surface. The release is distributed as a tagged workspace
snapshot with package tarballs; npm publication remains deferred.

### Features

- Add `@aio/generator-zod` for generating Zod 4 schemas from the shared Shape
  IR and Constraint IR.
- Support TypeScript and JavaScript ESM output, including `z.infer` types for
  TypeScript output.
- Support definitions, local references, recursive references, object
  policies, and the currently supported scalar, collection, union, and
  annotation semantics.
- Add SDK routes for `json -> zod`, `json-schema -> zod`, and
  `typescript -> zod`.
- Add structured diagnostics and semantic notes for unsupported or partially
  preserved target semantics.

### Tests

- Drive Zod generator contract tests from shared semantic fixtures.
- Add runtime validation tests for generated TypeScript and JavaScript modules
  using Zod 4.
- Add coverage for recursive schemas, constraints, SDK routes, capabilities,
  and public API contracts.

### Documentation

- Add Zod generator documentation and examples for JSON, JSON Schema,
  TypeScript, and recursive definitions.
- Document the TypeScript/JavaScript output distinction and current Zod 4
  compatibility boundary.

### Compatibility notes

- `@aio/generator-zod` does not depend on or bundle Zod at runtime; generated
  code consumers must install Zod 4.
- Zod 3 compatibility, a Zod parser, transforms, custom validators,
  multi-file output, and cross-file resolution remain deferred.

### Descriptor and extension contracts

- Add versioned parser and generator descriptors with explicit registration
  validation and stable machine-readable registration errors.
- Add isolated custom parser/generator registries and generic custom generator
  output typing without changing the built-in conversion API.
- Add shared report-analysis hooks and descriptor contract test helpers.
- Freeze the Shape IR v0 parser extension boundary and document the required
  checklist for future format integrations.

## Release history

Release notes for tagged versions are maintained through the corresponding
GitHub Releases. Future release sections will be moved here from `Unreleased`
when versions are prepared.
