# `@schema-transformation-toolkit/parser-toml`

Strict TOML v1 Value IR and Shape IR parser.

The parser accepts TOML values that can be represented by the shared Value IR.
TOML date/time values, non-finite numbers, and unsafe integers are rejected.
Empty TOML input is a valid empty object document.
