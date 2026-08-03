# `@aio/parser-openapi`

This package is an OpenAPI schema extractor. It reads JSON or YAML OpenAPI
3.0.x and 3.1.x documents and converts a selected entry from
`components.schemas` into the shared Shape IR and Constraint IR.

It is intentionally not a complete OpenAPI document processor.

## Input contract

The document must contain:

- an `openapi` version beginning with `3.0.` or `3.1.`
- at least one schema under `components.schemas`

When there is one schema, it is selected automatically. When there are
multiple schemas, pass the `entry` parser option:

```ts
tryParseOpenApiDocument(input, { entry: "User" });
```

The selected schema becomes the document root. Other component schemas are
retained as local `$defs` so supported local references remain available.

## Supported boundary

The extractor supports schema-oriented data shapes such as objects, arrays,
tuples, records, unions, enums, nullability, local schema references, and the
constraint keywords supported by the shared JSON Schema parser.

Local references must target `components.schemas`, for example:

```text
#/components/schemas/User
```

Missing local references fail with `openapi-ref-not-found`. External files,
URLs, and references to other component categories are reported as unsupported.

## Explicit non-goals

This package does not currently process or select schemas from:

- `paths` or operations
- `requestBody`, responses, parameters, or headers
- media types, security, callbacks, or webhooks
- external or URL-based references
- the full OpenAPI document validation surface

Object-only `allOf` compositions are safely merged into the shared object shape,
including common local-reference inheritance. Conflicting properties,
non-object compositions, and other unsupported compositions are reported
through structured diagnostics.
