# @schema-transformation-toolkit/parser-rust

Rust data-model parser for the shared Shape IR and Constraint IR.

V1 intentionally supports only named structs, common primitive types,
`Option<T>`, `Vec<T>`, and references to other named structs. Serde attributes,
enums, tuples, maps, aliases, and generics are rejected explicitly.
