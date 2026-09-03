# @schema-transformation-toolkit/parser-java

Restricted Java record and unit-enum parser for the shared Shape IR.

Java V1 accepts exactly one public top-level record or unit-only enum and allows
additional package-private records or enums as named definitions. It supports Java primitive
scalars, common boxed scalars, `String`, arrays, `List<T>`,
`Map<String, T>`, named references, and recursive references.

Reference types are conservatively represented as nullable and produce a
`java-nullability-unspecified` semantic note. Classes, interfaces, generic
declarations, wildcards, annotations, methods, constructors, non-string map
keys, data-carrying enums, and JavaBeans are explicitly unsupported. Unit-only
enums lower to named string literal unions and report a semantic note.
