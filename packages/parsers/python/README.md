# @schema-transformation-toolkit/parser-python

Parses the restricted Python 3.10+ dataclass type-shape subset into Shape IR.

The parser never executes Python. Defaults, runtime validation, serialization,
inheritance, generics, and framework-specific models are outside V1.

Supported annotations are `str`, `int`, `float`, `bool`, `list[T]`,
`Optional[T]`, `T | None`, and references to dataclasses in the same source
file. Multiple dataclasses require the `entry` parse option. Direct and mutual
recursive references are supported; quoted forward references are rejected.

The parser keeps required presence separate from nullability. Unsupported
types, defaults, decorators, inheritance, and unknown references return stable
structured failure codes with source-location evidence.

For nested nullable values, nullability remains inside the Shape node. For
example, `values: list[str | None]` is a required, non-nullable field whose
type is `array(union(string, null))`; it is not an optional field.

The document name identifies the schema document. When the source exposes a
root class name, the parser records it in shared Shape IR as `rootName`, so
generators can preserve the declaration name independently of document
identity. This is shared IR metadata, not Python-specific metadata.
