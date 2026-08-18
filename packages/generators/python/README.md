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
