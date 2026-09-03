# @schema-transformation-toolkit/generator-java

Deterministic Java record generator for the shared Shape IR.

The generator returns one Java source string. The root declaration is public by
default and all other definitions are package-private so the result contains
at most one public top-level declaration. Set `rootVisibility` to
`"package-private"` when the generated source is embedded in another file.

It supports scalar types, arrays, lists, string-keyed records, references, and
nullable fields. It does not generate enums, classes, JavaBeans, Jackson, or
Bean Validation metadata.
