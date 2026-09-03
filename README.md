# Schema Transformation Toolkit

Preserve semantics, not just syntax.

Schema Transformation Toolkit is an open-source toolkit for deterministic schema transformation across programming languages and schema formats. It provides parsers, generators, a shared intermediate representation, semantic analysis, diagnostics, and transformation utilities for building reliable schema transformation pipelines.

## Start Using It

For the quickest path, read the [User Guide](docs/user-guide.md). It starts
with the recommended SDK workflow, explains success and failure handling, and
links to practical examples. The [Capability Matrix](docs/capability-matrix.md)
describes the current supported boundary and known limitations.

## What It Is

This project is built around a simple boundary:

- parsers convert source input into IR
- generators convert IR into target output
- the IR layers are the only required handoff between the two

That separation is intended to make parsers and generators independently replaceable and easier to extend over time.

## Current Packages

- `@schema-transformation-toolkit/core`: shared IR, contracts, and core result types
- `@schema-transformation-toolkit/parser-json`: JSON to IR parsing and inference
- `@schema-transformation-toolkit/parser-json-schema`: JSON Schema Draft 2020-12 parser for the current shared IR subset
- `@schema-transformation-toolkit/parser-typescript`: TypeScript schema-subset parser for the shared IR
- `@schema-transformation-toolkit/parser-zod`: static Zod 4 schema-expression parser for the shared IR
- `@schema-transformation-toolkit/parser-yaml`: strict JSON-compatible YAML parser for Value and Shape IR
- `@schema-transformation-toolkit/parser-toml`: strict TOML v1 parser for Value and Shape IR
- `@schema-transformation-toolkit/parser-csv`: strict header-based CSV parser for Value IR
- `@schema-transformation-toolkit/parser-openapi`: OpenAPI 3.0/3.1 schema extractor for Shape IR
- `@schema-transformation-toolkit/parser-rust`: restricted Rust data-model parser for Shape and Constraint IR
- `@schema-transformation-toolkit/parser-python`: restricted Python dataclass parser for Shape IR
- `@schema-transformation-toolkit/parser-go`: restricted Go data-model parser for Shape IR
- `@schema-transformation-toolkit/parser-java`: restricted Java record/class/unit-enum parser for Shape IR
- `@schema-transformation-toolkit/generator-json-schema`: IR to JSON Schema generation
- `@schema-transformation-toolkit/generator-json`: Value IR to normalized JSON generation
- `@schema-transformation-toolkit/generator-typescript`: IR to TypeScript generation
- `@schema-transformation-toolkit/generator-zod`: IR to Zod 4 TypeScript or JavaScript generation
- `@schema-transformation-toolkit/generator-yaml`: Value IR to deterministic YAML generation
- `@schema-transformation-toolkit/generator-toml`: object-root Value IR to deterministic TOML generation
- `@schema-transformation-toolkit/generator-csv`: flat Value IR object-array to CSV generation
- `@schema-transformation-toolkit/generator-openapi`: canonical OpenAPI 3.1 schema generation
- `@schema-transformation-toolkit/generator-rust`: deterministic Rust data-model generation
- `@schema-transformation-toolkit/generator-python`: Python 3.10+ dataclass generation
- `@schema-transformation-toolkit/generator-go`: deterministic Go data-model generation
- `@schema-transformation-toolkit/generator-java`: deterministic Java record/class/unit-enum generation
- `@schema-transformation-toolkit/sdk`: the recommended single-package consumer entry point; it bundles the built-in parsers and generators behind one pipeline API

The SDK `convert(...)` API accepts `irPreference: "auto" | "value" | "shape"`
to control the intermediate representation route. `"auto"` prefers Value IR
when available; explicit preferences fail instead of falling back.

## Current Status

The current implementation is intentionally conservative.

- `@schema-transformation-toolkit/parser-json` supports the currently implemented IR subset
- `@schema-transformation-toolkit/parser-json-schema` supports a strict, generator-aligned JSON Schema Draft 2020-12 subset that fits the current IR without new core expansion
- `@schema-transformation-toolkit/parser-typescript` supports a narrow, explicit TypeScript schema subset with structured failures for unsupported syntax
- `@schema-transformation-toolkit/generator-json-schema` supports the currently implemented IR subset
- `@schema-transformation-toolkit/generator-typescript` supports the currently implemented IR subset
- `@schema-transformation-toolkit/generator-zod` supports the currently implemented IR subset and emits Zod 4 runtime schemas
- `@schema-transformation-toolkit/parser-openapi` and `@schema-transformation-toolkit/generator-openapi` support the bounded canonical OpenAPI schema boundary
- Rust, Python Dataclass, and Go are restricted Shape IR data-model adapters with explicit unsupported-feature failures and semantic-loss reporting where applicable
- Java is a restricted single-public-root record/class/unit-enum adapter; JavaBeans, interfaces, annotations, data-carrying enums, generics, and framework semantics are unsupported
- YAML support is limited to a strict JSON-compatible single-document profile; it is not a full YAML 1.2 data-model implementation
- TOML support is limited to a strict TOML v1 Value profile; date/time values, non-finite numbers, and unsafe integers are rejected
- unsupported cases are reported through structured failures instead of silent guessing

## Current End-To-End Flows

The currently validated flows are:

- `json -> value -> shape -> typescript`
- `json -> value -> shape -> json-schema`
- `json -> value -> json`
- `json-schema -> shape -> typescript`
- `json-schema -> shape + constraint -> json-schema`
- `typescript -> shape -> typescript`
- `typescript -> shape -> json-schema`
- `yaml -> value -> yaml`
- `toml -> value -> toml`
- `yaml -> value -> shape -> typescript/json-schema`
- `json -> value -> yaml`
- `zod -> shape + constraint -> json-schema/typescript/zod/openapi`
- `json-schema/typescript/zod/openapi -> rust/go/python`
- `rust/go/python -> json-schema/typescript/zod/openapi` (plus supported same-format routes)
- `java -> java/typescript/rust/python/go/json-schema` and the corresponding Shape-compatible routes into Java
- `json/yaml/csv/toml -> shape-compatible targets` where source roots and target constraints allow it
- `json -> zod`
- `json-schema -> zod`
- `typescript -> zod`

That does not mean every JSON sample or every TypeScript type is supported.
It means the current explicit subset is wired end to end and covered by tests.

For JSON Schema specifically, the `json-schema -> shape + constraint -> json-schema` path should be read as:

- semantic round-tripping for the current IR-aligned subset
- explicit non-goals for unsupported validation-heavy and document-system semantics

## Current Limits

This project currently supports explicit, documented subsets rather than full ecosystems.

- the JSON parser is not a universal schema inference engine for every possible sample
- the JSON Schema parser is not a full JSON Schema platform and intentionally fails for non-representable or validation-heavy schema semantics
- the TypeScript parser is not a full TypeScript front-end
- the JSON Schema generator is not yet a full JSON Schema platform with external `$ref`, draft switching, or multi-file output
- unsupported cases are expected to fail explicitly instead of being guessed silently

If you need the exact current boundary for one surface, prefer the package README and examples for that parser or generator over assuming broad language-level support.

## Installation

This workspace is still in active development, but the intended package usage looks like this:

```ts
import { jsonParser } from "@schema-transformation-toolkit/parser-json";
import { tryGenerateJsonSchema } from "@schema-transformation-toolkit/generator-json-schema";
import { tryGenerateTypeScript } from "@schema-transformation-toolkit/generator-typescript";

const parsed = jsonParser.parse('{"user_id":1}', { name: "UserProfile" });

if (parsed.ok) {
  const schema = tryGenerateJsonSchema(parsed.document);
  const generated = tryGenerateTypeScript(parsed.document);

  if (schema.ok) {
    console.log(schema.output);
  }

  if (generated.ok) {
    console.log(generated.output);
  }
}
```

The convenience `generate...()` functions still exist and throw on generation failure.
The `tryGenerate...()` functions are often a better fit when you want structured diagnostics and explicit failure handling.

## Recommended SDK API

For most users, install only `@schema-transformation-toolkit/sdk`; it is the main consumer entry point and includes the built-in parser/generator implementations. See the [user guide](docs/user-guide.md) for the complete usage model and the [capability matrix](docs/capability-matrix.md) for current format boundaries.

Use `@schema-transformation-toolkit/sdk` when you want:

- one supported source format in
- one supported target format out
- route planning, diagnostics, losses, and preserved-capability reporting

```ts
import { convert } from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id":1,"name":"Ada"}',
  name: "User",
});

if (!result.ok) {
  console.error(result.phase, result.code, result.message);
  console.error(result.diagnostics);
} else {
  console.log(result.output);
  console.log(result.plan);
  console.log(result.report);
}
```

The stable SDK runtime surface includes:

- `convert`
- `planConversion`
- `listConversionRoutes`
- `describeConversionRouteCapabilities`
- `createConverter`
- format support and option discovery helpers
- structured diagnostics, semantic notes, losses, artifacts, and reports

The core conversion options are:

- `sourceFormat`
- `targetFormat`
- `input`
- `name`
- `includeArtifacts`
- `advanced`

`advanced` provides parser, transformer, and generator-specific overrides. Use the option metadata APIs to discover supported configuration before exposing it in a UI.

For most successful conversions, the most useful way to read `result.report` is:

1. start with `semanticCaveats` and `losses`
2. then inspect `capabilityRequirements` for reachable shape features
3. then inspect `lossHotspots` for concrete widening-sensitive use sites

```ts
if (result.ok) {
  for (const caveat of result.report?.semanticCaveats ?? []) {
    console.log("caveat", caveat.code, caveat.path);
  }

  for (const requirement of result.report?.capabilityRequirements ?? []) {
    console.log("feature", requirement.feature, requirement.path);
  }

  for (const hotspot of result.report?.lossHotspots ?? []) {
    console.log("hotspot", hotspot.code, hotspot.path, hotspot.referenceStack);
  }
}
```

Use [packages/sdk/README.md](packages/sdk/README.md) for the package-local quick start and [docs/development/design.md](docs/development/design.md) for the deeper architecture and report interpretation model.
After `pnpm build`, you can also run [examples/sdk-report-analysis.mjs](examples/sdk-report-analysis.mjs) to inspect a real `result.report` payload.

```ts
import { convert } from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "json-schema",
  input: '[{"id":1},{"id":2}]',
  name: "UserList",
  advanced: {
    parser: {
      json: {
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      },
    },
    generator: {
      jsonSchema: {
        documentDialect: "2020-12",
      },
    },
  },
});
```

If you need direct parser control, direct generator control, or low-level IR contracts, prefer the lower-level packages instead. They are advanced, format-specific integrations and are not required when using `@schema-transformation-toolkit/sdk`:

- `@schema-transformation-toolkit/parser-*`
- `@schema-transformation-toolkit/generator-*`
- `@schema-transformation-toolkit/core`

The SDK is meant to be the product-facing pipeline layer, not a re-export umbrella for the whole workspace.

## Documentation

### Start Here

- [README.md](README.md): project overview, package map, and current validated flows
- [docs/user-guide.md](docs/user-guide.md): task-oriented installation and usage guide
- [docs/capability-matrix.md](docs/capability-matrix.md): current capabilities, route families, and limitations
- [docs/development/progress.md](docs/development/progress.md): current repository state and next highest-leverage work
- [docs/development/design.md](docs/development/design.md): architecture, IR boundaries, and durable semantic decisions
- [docs/development/standards.md](docs/development/standards.md): implementation, testing, release, and documentation standards
- [packages/sdk/README.md](packages/sdk/README.md): high-level pipeline entry point and report-reading quick start
- [packages/core/README.md](packages/core/README.md): shared IR model, invariants, and cross-package semantic boundary
- [examples/README.md](examples/README.md): quick tour of current end-to-end examples

### By Flow

- [packages/parsers/json/README.md](packages/parsers/json/README.md): JSON parsing and inference
- [packages/parsers/json-schema/README.md](packages/parsers/json-schema/README.md): supported JSON Schema parsing
- [packages/parsers/typescript/README.md](packages/parsers/typescript/README.md): supported TypeScript schema-subset parsing
- [packages/parsers/yaml/README.md](packages/parsers/yaml/README.md): strict JSON-compatible YAML parsing
- [packages/parsers/toml/README.md](packages/parsers/toml/README.md): strict TOML Value parsing
- [packages/generators/json-schema/README.md](packages/generators/json-schema/README.md): JSON Schema Draft 2020-12 generation
- [packages/generators/json/README.md](packages/generators/json/README.md): normalized JSON generation from Value IR
- [packages/generators/typescript/README.md](packages/generators/typescript/README.md): TypeScript generation
- [packages/generators/zod/README.md](packages/generators/zod/README.md): Zod 4 TypeScript and JavaScript generation
- [packages/generators/yaml/README.md](packages/generators/yaml/README.md): deterministic YAML generation from Value IR
- [packages/generators/toml/README.md](packages/generators/toml/README.md): deterministic TOML generation from object-root Value IR
- [examples/json-to-typescript.md](examples/json-to-typescript.md): representative `json -> value -> shape -> typescript` examples
- [examples/json-to-json-schema.md](examples/json-to-json-schema.md): representative `json -> value -> shape -> json-schema` examples
- [examples/json-to-json.md](examples/json-to-json.md): representative `json -> value -> json` examples
- [examples/json-schema-to-typescript.md](examples/json-schema-to-typescript.md): representative `json-schema -> shape -> typescript` examples
- [examples/json-schema-to-json-schema.md](examples/json-schema-to-json-schema.md): representative `json-schema -> shape + constraint -> json-schema` examples
- [examples/typescript-to-json-schema.md](examples/typescript-to-json-schema.md): representative `typescript -> schema ir -> json-schema` examples
- [examples/sdk-report-analysis.md](examples/sdk-report-analysis.md): representative walkthrough of higher-level `@schema-transformation-toolkit/sdk` report interpretation

### Deep Dive

- [docs/development/README.md](docs/development/README.md): development-doc index and suggested reading order
- [CHANGELOG.md](CHANGELOG.md): unreleased changes and release history

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm check:public-api
pnpm typecheck
pnpm test
pnpm build
```

CI currently runs on Node 24, and the workspace declares `node >=24`.

## License

Licensed under the Apache License, Version 2.0.
