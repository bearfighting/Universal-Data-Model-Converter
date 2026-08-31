# @schema-transformation-toolkit/generator-go

Deterministic Go struct generator for the shared Shape IR.

The generator emits a package declaration, exported struct fields, JSON tags by
default, references, slices, string-keyed maps, nullable pointers, and optional
fields with `omitempty`. Configure `packageName` and `emitJsonTags` through the
generator options.
