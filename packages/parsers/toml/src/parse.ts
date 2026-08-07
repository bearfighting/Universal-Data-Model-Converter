import { parse } from "smol-toml";

export function parseTomlDocument(input: string): unknown {
  return parse(input);
}
