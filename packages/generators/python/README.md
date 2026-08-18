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

When the Shape document does not carry a separate root declaration name, the
generator uses the document name for the root dataclass. Preserving document
identity and declaration identity separately is deferred to a shared IR review.
