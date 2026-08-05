import { describe, it } from "vitest";
import { zodParserDescriptor } from "@schema-transformation-toolkit/parser-zod";
import { expectParserDescriptorContract } from "../../helpers/descriptor-contract.js";

describe("parser-zod descriptor contract", () => {
  it("exposes a valid descriptor", () => {
    expectParserDescriptorContract(zodParserDescriptor, [
      {
        input:
          'import { z } from "zod"; export const UserSchema = z.object({ name: z.string() });',
        name: "User",
      },
      {
        input:
          'import { z } from "zod"; export const UserSchema = makeSchema();',
        name: "User",
        expectSuccess: false,
      },
    ]);
  });
});
