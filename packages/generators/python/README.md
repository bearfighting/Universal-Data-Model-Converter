# @schema-transformation-toolkit/generator-python

Generates modern Python 3.10+ dataclasses from the shared Shape IR.

V1 emits type shape only. Defaults, runtime validation, serialization behavior,
and Python framework metadata are not represented.

Output targets Python 3.10+ and uses `list[T]` and `T | None`. Definitions are
emitted deterministically as standalone dataclasses. Optional field presence
(`required: false`) is rejected because a plain dataclass annotation cannot
preserve that distinction without introducing a default.

Constraint IR is analyzed but not encoded in annotations. Constraints that
cannot be represented produce semantic losses instead of being silently
dropped.

The same distinction applies below the field level: `list[str | None]` is
rendered as a list whose element type is nullable, while `str | None` on a
field uses the field's nullable metadata.

When present, `SchemaDocument.rootName` is used for the root dataclass name.
Legacy documents without `rootName` continue to use the document name.
