# OpenAPI Schema Compatibility

This matrix describes the current `components.schemas` boundary of
`@schema-transformation-toolkit/parser-openapi` and `@schema-transformation-toolkit/generator-openapi`. It does not describe full
OpenAPI document support; paths, operations, request/response metadata,
parameters, headers, security, callbacks, and webhooks are outside this
boundary.

## Status meanings

| Status           | Meaning                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| Preserved        | Represented in Shape IR or Constraint IR and can be emitted again.                     |
| Normalized       | Accepted and converted to canonical shared semantics; source spelling is not retained. |
| Diagnostic-only  | Ignored, with a warning diagnostic emitted by the parser.                              |
| Unsupported      | Rejected or not safely lowerable, with a structured diagnostic.                        |
| Generator policy | The generator intentionally chooses a canonical output form.                           |

## Schema features

| OpenAPI Schema feature                                  | Status      | Current behavior                                                              |
| ------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `type`: string, integer, number, boolean, null          | Preserved   | Lowered to scalar or null Shape IR.                                           |
| `const`, enum                                           | Normalized  | Enum values become a union of literal members.                                |
| `properties`, `required`                                | Preserved   | Lowered to object fields and optional presence.                               |
| `additionalProperties: <schema>`                        | Preserved   | Lowered to record or object `additionalProperties`.                           |
| `additionalProperties: true`                            | Normalized  | A schema with no fixed properties becomes `Record<string, unknown>`.          |
| `additionalProperties: false`                           | Preserved   | Extracted as the `closed-object` constraint.                                  |
| arrays with `items`                                     | Preserved   | Lowered to homogeneous arrays.                                                |
| tuples with `prefixItems` and `items: false`            | Preserved   | Lowered to tuple Shape IR. OpenAPI 3.0 tuple syntax is not accepted.          |
| `oneOf`, `anyOf`                                        | Normalized  | Lowered to shared union semantics; exclusivity distinctions are not retained. |
| object-only `allOf`                                     | Normalized  | Safe object members, including common local `$ref` inheritance, are merged.   |
| conflicting, non-object, cyclic, or unsupported `allOf` | Unsupported | Emits `unsupported-openapi-composition` and does not guess a merged shape.    |
| local `#/components/schemas/...` `$ref`                 | Preserved   | Lowered to document-local references with JSON Pointer decoding.              |
| dangling local `$ref`                                   | Unsupported | Fails with `openapi-ref-not-found`.                                           |
| external or non-schema `$ref`                           | Unsupported | Emits `unsupported-openapi-ref` and fails the parse.                          |

## Constraints and annotations

| Keyword family                                                                           | Status                         | Current behavior                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `pattern`, length constraints, numeric bounds, `multipleOf`                              | Preserved                      | Extracted into Constraint IR and rendered by supported generators.          |
| item and property count constraints                                                      | Preserved                      | Extracted into Constraint IR.                                               |
| `format`, `description`, `default`, `examples`                                           | Preserved                      | Stored as portable annotation constraints.                                  |
| `readOnly`, `writeOnly`                                                                  | Preserved                      | Stored as portable annotation constraints.                                  |
| `nullable` in OpenAPI 3.0                                                                | Normalized                     | Converted to shared nullable/union semantics.                               |
| OpenAPI 3.0 exclusive bounds                                                             | Normalized                     | Boolean-plus-bound syntax is converted before parsing.                      |
| `patternProperties`, `not`, conditionals, `contains`, `unevaluated*`, `dependentSchemas` | Diagnostic-only or unsupported | Emits `unsupported-openapi-keyword`; no approximation is made.              |
| `deprecated`, `discriminator`, `xml`, and other non-portable metadata                    | Diagnostic-only                | Emits `unsupported-openapi-keyword`; metadata is not retained in shared IR. |

## Generator policy

`@schema-transformation-toolkit/generator-openapi` emits only canonical OpenAPI 3.1.0 schema documents:

- `info.title` comes from the IR document name.
- `info.version` is `0.1.0`.
- schemas are emitted under `components.schemas`.
- definitions and schema keys are deterministic.
- references use `#/components/schemas/...` with JSON Pointer escaping.
- source `info`, extensions, field order, and unsupported metadata are not
  reconstructed.

The generator has no version option and does not emit OpenAPI 3.0.

## Diagnostic contract

Schema keywords outside this matrix must not be silently treated as supported.
The parser uses `source: "parser-openapi"` and stable codes:

- `unsupported-openapi-keyword` for ignored unsupported schema keywords
- `unsupported-openapi-ref` for external or non-schema references
- `openapi-ref-not-found` for dangling local references
- `unsupported-openapi-composition` for unsafe `allOf` compositions
- `invalid-openapi-schema` for malformed schema values

The SDK conversion result preserves these diagnostics for callers.
