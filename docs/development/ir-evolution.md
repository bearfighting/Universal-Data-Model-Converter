# IR Evolution Design

This document defines how the shared `Value IR`, `Shape IR`, and `Constraint IR`
should evolve as new parser and generator families are added.

It is a design and evidence log, not a list of approved implementation work.
Candidate changes should be recorded here before they become changes to
`@schema-transformation-toolkit/core`.

## Guiding Principle

The shared IR should model semantics shared by schema-oriented languages and
serializable data formats.

It should not become a lossless syntax tree for every source format, nor a
general-purpose type-system AST.

When a new format exposes a problem, first handle it in the format boundary
through parser validation, generator policy, normalization, diagnostics,
semantic notes, or semantic-loss reporting.

An IR change becomes worthwhile only when the same semantic pressure appears
across multiple format boundaries and cannot be represented honestly by the
current IR.

## Current IR Boundary

The current IR is intended to represent:

- scalar and literal values
- objects and fields
- arrays, tuples, and records
- unions and nullability
- optional field presence
- local references and reusable definitions
- unknown evidence
- portable constraints and annotations

The IR should remain independent of:

- comments, whitespace, and source formatting
- parser-specific syntax trees
- language-level computation such as mapped or conditional types
- runtime behavior such as functions, transforms, or class methods
- format-specific document systems unless their semantics are shared

## Evolution Workflow

Each new parser or generator should follow this sequence:

1. Identify the source or target semantic pressure.
2. Check whether existing IR, normalization, diagnostics, or policy decisions
   can represent it truthfully.
3. Implement the smallest format-local behavior when that is sufficient.
4. Record the case and its cross-format evidence in this document.
5. Add a shared IR proposal only when the pressure is repeated and stable.
6. Prototype the proposal in focused core tests before changing public IR
   contracts.
7. Update parser, generator, SDK, documentation, and API contracts together
   only after the proposal is accepted.

A format must not introduce a new shared node merely because it has a
convenient format-local construct.

## Candidate Improvements

The following are observations for future work. None is currently approved for
implementation.

### Provenance and Source Locations

Potential shared metadata:

```ts
interface IrOrigin {
  format: string;
  path?: string[];
  sourceRange?: {
    start: { line: number; column: number; offset?: number };
    end: { line: number; column: number; offset?: number };
  };
}
```

Evidence already exists across TypeScript, Zod, OpenAPI, and the planned YAML
boundary. The value would be shared source-to-IR diagnostics, editor
highlighting, and more precise semantic-loss locations.

This should remain optional metadata and must not affect semantic equivalence.

### Presence Semantics

Optional fields, nullable values, defaults, and post-default output currently
have related but distinct meanings. Future work may need an explicit shared
presence contract that distinguishes:

- field absent
- field present with `null`
- field required on input
- field required after defaulting
- field omitted by a target policy

Zod defaults and JSON Schema defaults are the strongest current evidence. This
proposal should not be accepted until at least two independent parser or
generator boundaries require the same distinction.

### Portable Annotations

The current portable annotation set includes defaults, descriptions, examples,
and read/write flags. A future annotation model may add stable fields such as
`title` and `deprecated`, while keeping format-local metadata separate.

Arbitrary extension metadata should not become part of default semantic
equivalence or force every generator to understand every source extension.

### Object Openness

The existing object, record, and additional-property semantics should continue
to be normalized and tested as one shared contract:

- closed object
- open object with unknown additional properties
- record with a shared value type
- fixed fields plus typed additional properties

This is a candidate for clarification and normalization before adding any new
object node.

### Union Semantics

Plain unions, literal enum unions, nullable unions, unknown-absorbing unions,
and discriminated unions may eventually need explicit semantic metadata.

Discriminated unions are the most promising future extension because they have
stable representations in JSON Schema, OpenAPI, TypeScript, and Zod. They
should not be added until shared fixtures demonstrate that existing union
normalization and annotations are insufficient.

### References and Recursive Definitions

Local references and reusable definitions are already shared IR concepts.
Future work may clarify definition identity, recursive reference behavior,
reference provenance, and unresolved-reference diagnostics.

External references should remain outside the IR until the project deliberately
introduces document graph and dependency-resolution semantics.

### Numeric Semantics

Integer and number are already represented, and numeric constraints are already
portable. Future evidence may justify additional metadata for finite numbers,
safe integers, precision, or range.

New numeric nodes should not be added for a single runtime or language feature.
The project should first establish whether multiple formats can preserve the
same distinction end to end.

## Observation Case: YAML

The YAML parser and generator use a strict JSON-compatible profile.

YAML-specific features are intentionally handled at the format boundary:

- multiple documents are rejected by the parser
- duplicate and non-string keys are rejected by the parser
- tags, anchors, aliases, and merge keys are rejected by the parser
- comments, indentation, scalar style, and formatting are not placed in IR
- scalar quoting is a generator policy needed to preserve JSON-compatible value
  semantics

These features do not currently justify YAML-specific IR nodes. They are syntax
or format-model features rather than shared schema semantics.

YAML remains useful evidence for future provenance and numeric-semantics work,
but it is not evidence by itself for an IR expansion.

## Admission Criteria for a Shared IR Change

A proposed IR change should satisfy all of the following before implementation:

- the semantic meaning is stable and schema-oriented
- at least two format boundaries need the same distinction
- existing IR plus normalization or diagnostics cannot express it honestly
- the proposal does not encode one language's syntax or runtime behavior
- parser and generator behavior can be specified in both directions where
  applicable
- shared fixtures can test success, unsupported cases, normalization, and loss
- the public compatibility and migration impact is understood

If these criteria are not met, keep the behavior in the relevant parser or
generator and record the evidence here.

## Decision Log

| Candidate                         | Current decision                                 | Revisit when                                                                      |
| --------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| YAML anchors, aliases, merge keys | Keep format-local; reject in strict YAML profile | A shared reference or graph semantic is approved for multiple formats             |
| YAML comments and formatting      | Keep outside semantic IR                         | A separate source-preservation model is deliberately scoped                       |
| YAML-specific tags                | Keep format-local; reject unsupported tags       | Multiple formats require shared tagged-value semantics                            |
| Provenance / source ranges        | Candidate, not yet approved                      | Multiple consumers require stable IR-origin metadata                              |
| Presence semantics                | Candidate, not yet approved                      | Defaults and input/output presence require one shared contract across formats     |
| Discriminated unions              | Candidate, not yet approved                      | Shared fixtures show current union IR is insufficient across at least two formats |
| External references               | Deferred                                         | Document graph and dependency resolution become an explicit project scope         |
