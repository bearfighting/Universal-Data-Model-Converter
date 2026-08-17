# @schema-transformation-toolkit/generator-rust

Rust data-model generator for the shared Shape IR and Constraint IR.

The generator emits deterministic public structs and unit-only enums without
Serde derives. It supports objects, string literal enums, string-keyed records
as fully qualified `std::collections::HashMap` values, primitive scalars,
arrays, references, optional fields, and nullable unions. Unsupported shapes,
enum literals, and constraints are reported explicitly.
