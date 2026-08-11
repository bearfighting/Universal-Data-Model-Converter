# @schema-transformation-toolkit/generator-rust

Rust data-model generator for the shared Shape IR and Constraint IR.

V1 emits deterministic public structs without Serde derives. It supports
objects, primitive scalars, arrays, references, optional fields, and nullable
unions. Unsupported shapes and constraints are reported explicitly.
