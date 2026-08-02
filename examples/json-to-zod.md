# JSON to Zod

The SDK can generate a Zod 4 module from JSON-inferred shape semantics.

```ts
import { convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "zod",
  input: '{"id":1,"name":"Ada"}',
  name: "User",
});

if (result.ok) console.log(result.output);
```

The default output is TypeScript with `UserSchema` and
`z.infer<typeof UserSchema>`. Use
`advanced.generator.zod.outputLanguage: "javascript"` to emit only the
runtime schema.
