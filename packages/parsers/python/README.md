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
