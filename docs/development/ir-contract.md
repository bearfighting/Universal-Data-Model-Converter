# Schema IR Contract

This document records the current contract for the shared schema IR.

It describes:

- what the IR can represent today
- which invariants `core` enforces
- how parsers and generators should treat the IR
- how diagnostics should be attached to results

## Current Surface

The current IR includes:

- `SchemaDocument`
- `SchemaDefinition`
- `SchemaScalarNode`
- `SchemaLiteralNode`
- `SchemaReferenceNode`
- `SchemaUnionNode`
- `SchemaTupleNode`
- `SchemaRecordNode`
- `SchemaNullNode`
- `SchemaUnknownNode`
- `SchemaObjectNode`
- `SchemaArrayNode`
- `SchemaFieldNode`

## Document Contract

`SchemaDocument` is the root container for one shared schema model.

Current rules:

- every document has exactly one `root`
- `definitions` are document-local and ordered
- definition identity is `definition.name.source`
- definition names must be unique within one document
- references are document-local only

## Node Semantics

### Scalars And Literals

- scalar kinds are `string`, `integer`, `number`, and `boolean`
- `integer` and `number` are distinct IR semantics
- literal values are exact scalar values and must be finite when numeric

### Null, Optionality, And Nullability

- `SchemaNullNode` means the value is exactly `null`
- optional presence is different from `null`
- `nullable: true` on a field means the field may be present with `null`
- a field whose type already includes `null` must not also set `nullable: true`

### Unknown

- `SchemaUnknownNode` is the one shared node for unresolved schema meaning
- explanation lives in `reason` and optional `evidence`
- `evidence` explains the result but does not create a new schema meaning
- degraded-but-still-representable results should prefer ordinary nodes plus diagnostics rather than `unknown`

### Structural Nodes

- `SchemaObjectNode` is a fixed named-field shape and may carry a typed
  `additionalProperties` node for schemas that combine named fields with
  dynamic string-keyed values
- `SchemaRecordNode` is a dynamic-key object shape
- `SchemaArrayNode` is a homogeneous collection
- `SchemaTupleNode` is a fixed-position ordered sequence
- `SchemaUnionNode` is one-of-many schema meaning
- `SchemaReferenceNode` points to a document-local definition

Record and object are intentionally different semantics. An object with
`additionalProperties` still preserves its named-field semantics while also
recording the type of otherwise-unlisted keys.
Array and tuple are intentionally different semantics.

## Core Invariants

These invariants are enforced by `core` factories and validation:

- literal numbers must be finite
- reference names must be non-empty
- definition names must be non-empty
- definition names must be unique inside one document
- every reference must resolve to a same-document definition
- record keys must currently be the scalar type `string`
- fields may not combine `nullable: true` with a type that already includes `null`

## Normalization Rules

The IR is semantic, not syntax-shaped.
Current normalization includes:

- union members are flattened
- equivalent union members are deduplicated
- reference equivalence is based on reference name equality
- unknown equivalence is based on semantic reason and nullable state rather than detailed evidence

## Descriptor Registry Contract

`core` owns the format-independent `DescriptorRegistry` contract. It registers
and validates parser, generator, and transformer descriptors, enforces parser
and generator format uniqueness plus transformer ID uniqueness, and resolves
or lists registered descriptors. It does not import builtin packages, plan
routes, or infer transformer edges.

Builtin registration is a generated adapter assembled from package metadata.
Component packages declare only their descriptor export and role; IR
capabilities remain owned by the descriptor itself. Third-party registration
uses the same manifest schema through an explicit build-time input, never
runtime package discovery.

`evidence` helps explain a result, but does not define a distinct schema.

## Parser Boundary

Parsers should target this IR as a semantic handoff, not as a syntax dump.

That means:

- keep source-specific heuristics outside the IR when possible
- introduce new IR semantics only when the meaning is genuinely shared
- fail explicitly for unsupported input instead of silently approximating it

Parser descriptors expose their available primary IR documents through output
contracts. A parser may also expose supplementary artifacts produced during
the same parse, but an artifact must not duplicate the primary document.

## Generator Boundary

Generators consume valid IR and render target output from shared semantics.

That means:

- generators should not invent new shared schema meaning
- generator failures should usually be target-rendering failures, not IR redesign signals
- target validation may still reject a valid IR when a chosen target configuration cannot render it safely

Generator input contracts may declare a Value root-shape set and explicitly
required supplementary IR artifacts. Root-shape compatibility is checked by
the generic planner before execution; the concrete generator still validates
the actual IR document and reports dynamic root failures.

## Diagnostic Contract

`SchemaDiagnostic` is the shared structured explanation type across parser and generator layers.

Current expectations:

- `code` is stable and machine-consumable
- `message` is human-readable
- `path` is optional but should be used when a stable logical location exists
- `nodeKind` should identify the relevant contract surface when helpful
- `source` should identify the producing layer
- `evidence` may carry small structured context

Source-syntax locations are not shared top-level fields today.
Parser-specific source locations should live in structured `evidence`.

Diagnostic evidence and unknown evidence are different:

- `unknown.evidence` explains why a specific unknown node exists
- `diagnostic.evidence` explains a parser or generator decision on a result

## Result Boundary

The IR contract does not promise:

- full source-language syntax fidelity
- automatic naming of reusable definitions
- cross-document references
- preservation of source-only declaration form when shared semantics are equivalent

## Shape IR v0 Parser Extension Boundary

New parsers must lower only stable serializable-data semantics into the
existing `Shape IR v0` nodes: scalar, literal, object, record, array, tuple,
union, local reference, reusable definitions, `null`, optional presence,
nullable values, and `unknown`.

Parsers must preserve the distinctions between optional presence and nullable
value, object and record, array and tuple, integer and number, local and
external references, and Shape IR and Constraint IR.

Conditional, mapped, generic-computation, function, class, intersection,
external-reference, validator-specific, source-language-only, and other
non-serializable type semantics remain outside Shape IR v0. Parser proposals
must document their handling of optionality, nullability, records,
additional-properties, references, constraints, unsupported cases, and any
semantic notes or losses before implementation.

## Maintenance Rules

- keep this file about the current shared contract, not future design sketches
- move semantic-placement debates to [ir-boundaries.md](ir-boundaries.md)
- move success, loss, and truthfulness rules to [capabilities-and-loss.md](capabilities-and-loss.md)
