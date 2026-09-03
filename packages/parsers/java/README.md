# @schema-transformation-toolkit/parser-java

Restricted Java record parser for the shared Shape IR.

Java V1 accepts exactly one public top-level record and allows additional
package-private records as named definitions. It supports Java primitive
scalars, common boxed scalars, `String`, arrays, `List<T>`,
`Map<String, T>`, named references, and recursive references.

Reference types are conservatively represented as nullable and produce a
`java-nullability-unspecified` semantic note. Classes, interfaces, generic
declarations, wildcards, annotations, methods, constructors, non-string map
keys, enums, and JavaBeans are explicitly unsupported.
