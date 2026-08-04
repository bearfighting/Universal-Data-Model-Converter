import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  // Keep Node-oriented dependencies outside the ESM bundle. In particular,
  // `yaml` is published as CommonJS and contains dynamic requires of Node
  // built-ins. Inlining it leaves an esbuild compatibility wrapper in our
  // ESM entry point, which strict ESM consumers such as Turbopack reject.
  external: ["typescript", "yaml"],
  format: ["esm"],
  noExternal: [/^@schema-transformation-toolkit\//u],
  sourcemap: true,
  target: "es2022",
});
