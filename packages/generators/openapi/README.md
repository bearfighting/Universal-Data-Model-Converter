# @schema-transformation-toolkit/generator-openapi

Canonical OpenAPI 3.1 generator for the shared schema IR.

This package emits a JSON-compatible schema-only OpenAPI document. It always
uses `openapi: "3.1.0"`, puts schemas under `components.schemas`, and does not
generate `paths`, operations, request/response metadata, parameters, headers,
or external references.

The document title comes from `SchemaDocument.name.source`; the document
version is fixed at `0.1.0`. The root schema and reusable definitions are
rendered deterministically, with definitions sorted by name and local
references encoded as `#/components/schemas/Name` using JSON Pointer escaping.

The generator reuses the JSON Schema generator for Shape IR, Constraint IR,
and portable annotations, then adapts `$defs` to OpenAPI `components.schemas`.
It does not provide a version option: OpenAPI 3.1 is the canonical output
version. OpenAPI 3.0 remains an input-only parser format.

## API

```ts
import {
  generateOpenApi,
  tryGenerateOpenApi,
} from "@schema-transformation-toolkit/generator-openapi";

const output = generateOpenApi(document);
const result = tryGenerateOpenApi(document);
```

`generateOpenApi` throws on failure. `tryGenerateOpenApi` returns a structured
success or failure result and may include diagnostics and semantic notes.

See [Project Design](../../../docs/development/design.md) for the OpenAPI schema compatibility boundary.
for the supported schema subset and parser diagnostic codes.
