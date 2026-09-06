# @schema-transformation-toolkit/parser-kotlin

Restricted Kotlin data-model parser for the shared Shape IR and Constraint IR.

Kotlin V1 supports `data class`, unit-only `enum class`, scalar types,
`List<T>`, `Map<String, T>`, `Set<T>`, named references, recursion, and
explicit or uniquely inferred roots. User-defined generics, ordinary classes,
mutable/concrete collections, defaults, annotations, inheritance, and sealed
hierarchies are unsupported.

`Set<T>` lowers to an array Shape node with a `unique-items` Constraint IR
entry. The parser does not execute Kotlin and does not preserve package or
serialization metadata. V1 accepts ordinary ASCII identifiers and escaped
Kotlin keywords only; other escaped identifiers are rejected. Optional field
presence, inline literal types, typed additional properties, and unsupported
numeric representation hints are not part of the parser boundary.
