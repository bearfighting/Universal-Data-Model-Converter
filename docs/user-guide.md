# User Guide

Schema Transformation Toolkit converts data samples and schema documents into
other supported representations. The recommended entry point is the SDK:

```bash
npm install @schema-transformation-toolkit/sdk
```

This guide is task-oriented. For the precise current support boundary, see
[Capability Matrix](capability-matrix.md). For internal architecture, see the
[development design](development/design.md).

## Your first conversion

Use `convert(...)` with a source format, target format, and input string:

```ts
import { convert } from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id": 1, "name": "Ada"}',
  name: "User",
});

if (result.ok) {
  console.log(result.output);
} else {
  console.error(`${result.phase}: ${result.code}`);
  console.error(result.message);
}
```

The SDK is synchronous. The input is normally text, and the output is the
target format's generated text or structured output. The exact output type is
available from the TypeScript API; custom registries may produce `unknown`
output types by design.

## The conversion result

Always branch on `result.ok`. Do not infer success from the presence of
`output` and do not use thrown exception strings for ordinary conversion
errors.

Successful results commonly contain:

- `output`: generated target output
- `plan`: the selected route and IR execution plan
- `report`: semantic caveats, losses, preserved capabilities, and analysis
- optional `artifacts`, `diagnostics`, and `semanticNotes`

Failed results contain structured information:

- `phase`: `parse`, `transform`, or `generate`
- `code`: stable failure category
- `message`: human-readable explanation
- `plan`: the route plan when one was available
- diagnostics, notes, losses, or artifacts retained from completed stages

The distinction matters: an unsupported source construct, an invalid runtime
document, and a target-generation failure should not be presented as the same
user error.

## Showing useful feedback

For a simple CLI, display the failure phase, code, and message. For an editor
or product UI, use the normalized helper:

```ts
import {
  collectUserFacingDiagnostics,
  convert,
} from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: '{"type":"object","properties":{"id":{"type":"integer"}}}',
});

for (const item of collectUserFacingDiagnostics(result)) {
  console.log(item.severity, item.title, item.message, item.path);
}
```

Treat the fields as follows:

- diagnostics describe detected problems or important conditions;
- semantic notes and report caveats describe successful-but-imperfect output;
- losses identify semantics that could not be preserved;
- paths and source ranges are useful for highlighting, but may be absent;
- suggestions are helpful guidance, not a complete remediation API.

For successful conversions, inspect caveats and losses before assuming the
output is equivalent to the input.

## Choosing a route

Use the discovery APIs when building a format picker or route UI:

```ts
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
} from "@schema-transformation-toolkit/sdk";

const routes = listConversionRoutes();
const capabilities = describeConversionRouteCapabilities("json", "typescript");
```

Do not hardcode the complete format list in a downstream application. Route
availability and capability summaries are the source of truth. See the
[Capability Matrix](capability-matrix.md) for a human-readable overview.

## Common tasks

### Generate a schema from example data

Use JSON, YAML, or another Value-oriented input and target TypeScript,
JSON Schema, or Zod. The toolkit infers a representable shape; it does not
infer every business rule that is absent from the sample.

```ts
const result = convert({
  sourceFormat: "json",
  targetFormat: "json-schema",
  input: '[{"id":1,"name":"Ada"}]',
  name: "UserList",
});
```

### Normalize data without schema inference

For a JSON-to-JSON route, the toolkit parses and regenerates Value IR. This
normalizes formatting but does not preserve whitespace, escape spelling,
number lexemes, or duplicate keys.

### Convert an existing schema

Use JSON Schema, TypeScript, Zod, OpenAPI, Rust, Python Dataclass, or Go input
when the source already contains structural intent. Only the documented,
representable subset is accepted; unsupported semantics fail explicitly.

### Inspect options

Advanced options are format-specific, but consumers can discover them without
scraping documentation:

```ts
import { describeConversionOptions } from "@schema-transformation-toolkit/sdk";

const options = describeConversionOptions("json", "typescript");
console.log(options.parser.options, options.generator.options);
console.log(options.transformers);
```

Use `advanced` only when the default behavior is insufficient. Option metadata
describes semantic and diagnostic effects; it is not a ready-made UI form
schema.

Transformer-specific configuration is keyed by transformer id:

```ts
const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id":1}',
  advanced: {
    transformer: {
      "value-to-shape": {
        // transformer-specific options, when exposed by the route
      },
    },
  },
});
```

Use `describeTransformerOptions(...)` or the `transformers` catalog returned
by `describeConversionOptions(...)` to discover supported transformer options.

### Choose the IR preference

`irPreference` accepts `"auto"`, `"value"`, or `"shape"`:

- `"auto"` chooses the route's preferred representation;
- `"value"` requests concrete data semantics;
- `"shape"` requests schema semantics.

An explicit preference does not silently fall back to another representation.
Use it when the distinction is meaningful to your application.

## Important limitations

The toolkit intentionally supports explicit subsets rather than pretending to
be a complete implementation of every ecosystem. In particular:

- JSON examples cannot express every schema constraint;
- YAML uses a strict JSON-compatible single-document profile;
- CSV expects flat object arrays and TOML expects object-root data;
- JSON Schema is limited to the current IR-aligned subset;
- TypeScript is not parsed as an unrestricted TypeScript program;
- Zod is handled through supported static schema expressions;
- OpenAPI is bounded by its canonical schema compatibility boundary;
- Rust is limited to serializable structs, unit-only enums, string-keyed maps,
  and supported primitive/container types; data-carrying enums, Serde
  attributes, aliases, and generics remain unsupported;
- Python is limited to the Python 3.10+ dataclass type-shape subset; defaults,
  inheritance, maps, arbitrary unions, Literal, and Enum remain unsupported;
- Go is limited to single-file exported data-model declarations; package
  resolution, external types, generics, methods, aliases, and embedded-field
  promotion remain unsupported;
- comments, source formatting, and some document-level metadata may be lost.

Read the [Capability Matrix](capability-matrix.md) before promising a route to
end users. A successful result with losses is valid output with a caveat, not a
guarantee of lossless equivalence.

## Advanced integration

Most applications should use the default SDK registry. Use
`createConversionRegistry(...)` and `createConverter(registry)` when you need
to register a custom parser, generator, or transformer. The SDK does not scan
installed packages automatically.

Use lower-level packages directly only when you are implementing a format
integration or need parser/generator control that the SDK intentionally hides.

## Further reading

- [Capability Matrix](capability-matrix.md): current routes, format boundaries,
  and known limitations
- [Examples](../examples/README.md): runnable and route-focused examples
- [SDK README](../packages/sdk/README.md): public exports and API details
- [Development documentation](development/README.md): project design, progress,
  and maintenance standards
