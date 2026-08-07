# @schema-transformation-toolkit/generator-csv

Strict header-based CSV generator for flat Value IR object arrays.

The generator accepts string, number, and boolean cells. Numbers and booleans
are emitted as text and reported through a semantic note because CSV parsing
returns all cells as strings. Nulls, nested objects, arrays, and inconsistent
row columns are rejected.
