# @schema-transformation-toolkit/generator-json

JSON generator for the shared Value IR.

This package serializes a `ValueDocument` to normalized JSON text with
`JSON.stringify`. It preserves JSON data semantics and object field order, but
does not preserve source whitespace, escape spelling, number lexemes, or
duplicate object keys.

It intentionally consumes Value IR directly and does not require Shape IR or
schema inference.
