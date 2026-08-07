# @schema-transformation-toolkit/parser-csv

Strict header-based CSV parser for the shared Value IR and Shape IR.

CSV rows become an array of objects. Cells remain strings; the parser does not
infer numbers, booleans, or null values. Rows must have the same number of
fields as the header, and headers must be non-empty and unique.
