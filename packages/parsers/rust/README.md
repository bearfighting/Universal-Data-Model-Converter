# @schema-transformation-toolkit/parser-rust

Rust data-model parser for the shared Shape IR and Constraint IR.

The current subset supports named structs, unit-only enums, common primitive
types, `Option<T>`, `Vec<T>`, transparent `Box<T>`, string-keyed
`HashMap`/`BTreeMap`, and references to named definitions. Data-carrying enums,
Serde attributes, tuples, aliases, and generics remain explicitly unsupported.
