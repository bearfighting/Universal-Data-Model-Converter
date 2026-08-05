import {
  constraintDocument,
  constraintEntry,
  constraintTarget,
  type Constraint,
  type ConstraintDocument,
} from "@schema-transformation-toolkit/core";
import type { ConstraintCollection } from "./kernel-types.js";

export function createConstraintCollection(): ConstraintCollection {
  const byPath = new Map<
    string,
    { path: string[]; constraints: Constraint[] }
  >();
  const collection: ConstraintCollection = {
    entries: [],
    add(path, item) {
      const key = JSON.stringify(path);
      const existing = byPath.get(key);
      if (existing) {
        existing.constraints.push(item);
        return;
      }
      const entry = { path: [...path], constraints: [item] };
      byPath.set(key, entry);
      collection.entries.push(entry);
    },
    replace(path, item) {
      const key = JSON.stringify(path);
      const existing = byPath.get(key);
      if (!existing) {
        collection.add(path, item);
        return false;
      }
      const index = existing.constraints.findIndex(
        (candidate) => candidate.kind === item.kind,
      );
      if (index === -1) {
        existing.constraints.push(item);
        return false;
      }
      existing.constraints[index] = item;
      return true;
    },
    document(name): ConstraintDocument {
      return constraintDocument(
        name,
        collection.entries.map(({ path, constraints }) =>
          constraintEntry(constraintTarget("node", [...path]), constraints),
        ),
      );
    },
  };
  return collection;
}
