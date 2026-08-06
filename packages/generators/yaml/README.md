# @schema-transformation-toolkit/generator-yaml

Deterministic YAML generator for the shared Value IR.

The generator emits one YAML 1.2 document. It preserves Value IR field order
and quotes strings when necessary to preserve their type when reparsed. It
does not emit or preserve comments, anchors, aliases, merge keys, or source
formatting.

The generator consumes Value IR only. It does not invent example values from
Shape IR. Non-finite numbers are rejected rather than emitted as YAML-specific
numeric values.
