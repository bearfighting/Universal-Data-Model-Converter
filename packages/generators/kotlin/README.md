# @schema-transformation-toolkit/generator-kotlin

Deterministic Kotlin data-model generator for the shared Shape IR.

It generates `data class` declarations by default, with optional structural
`class` and `val`/`var` styles. Arrays generate as `List<T>` unless the input
Constraint IR contains `unique-items: true`, in which case they generate as
`Set<T>`. Named string literal unions generate unit enums when representable.

The generator does not emit serialization annotations, defaults, inheritance,
or framework metadata. Optional field presence, inline literal types, typed
additional properties, and numeric representations that cannot be preserved by
Kotlin V1 fail explicitly instead of being widened silently. Property and
declaration names must be ordinary ASCII identifiers; Kotlin keywords are
emitted with escaped identifiers.
