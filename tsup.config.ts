import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["typescript"],
  format: ["esm"],
  noExternal: [/^@schema-transformation-toolkit\//u],
  sourcemap: true,
  target: "es2022",
});
