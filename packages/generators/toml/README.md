# `@schema-transformation-toolkit/generator-toml`

Strict TOML v1 generator for object-root Value IR.

The generator emits nested tables and arrays of tables through `smol-toml`.
Nulls, non-finite numbers, unsafe integers, and scalar or array roots are not
representable in the v1 TOML profile and are rejected.
