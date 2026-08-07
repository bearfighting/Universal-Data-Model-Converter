# Development Scope

## Core Boundary

This project is about mapping serializable data-shape semantics across formats and languages.

The shared schema IR should model data that has a stable serialized shape. It should not try to model the full expressive power of any single language type system.

A useful intuition is `serde`-style modeling:

- if a construct has a stable serialized shape, it is a good fit for this project
- if a construct mainly exists as type-level computation, language-internal behavior, or compile-time abstraction, it is usually out of scope

## Priority Support

These are the kinds of schema features we should support and do well:

- scalar
- object
- array
- tuple
- record or map
- union
- `null`
- optional presence
- enum-like literal union

YAML is supported only through a strict JSON-compatible single-document
profile. YAML-specific data-model features such as tags, anchors, aliases,
merge keys, duplicate keys, non-string mapping keys, and multiple documents
remain outside the shared IR boundary.

## Defer Or Reject

These should be treated cautiously or left unsupported unless they can be reduced to stable serializable-shape semantics:

- conditional types
- mapped types
- generic utility composition
- function types
- class behavior
- branded or opaque tricks
- type-level computation

## Working Rule

- if a construct mainly describes data, it is a good schema IR candidate
- if a construct mainly computes, transforms, or programs over types, it should usually stay out of scope

## Implications

- parsers should target schema-oriented subsets of source languages
- generators should preserve schema meaning, not imitate source-language syntax too closely
- unsupported source-language features should fail explicitly instead of being approximated loosely

## Shape IR v0 Admission Rule

Until a later IR version is deliberately approved, a new parser may add
support only by composing existing scalar, literal, object, record, array,
tuple, union, reference, null, optional, nullable, unknown, and constraint
semantics. It must not introduce language-specific nodes for conditional,
mapped, generic-computation, function, class, intersection,
external-reference, or other non-serializable type behavior. A parser proposal
that cannot satisfy this rule must remain unsupported and include an explicit
failure contract.
