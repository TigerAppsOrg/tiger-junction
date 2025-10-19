/**
 * @file db/generate-dbml.ts
 * @description Used to create a schema.dbml file from the Drizzle ORM schema.
 * This is useful for visualization. The schema.dbml file can be opened with
 * the VSCode extension "bocovo.dbml-erd-visualizer"
 * @link https://github.com/drizzle-team/drizzle-orm/discussions/1480
 */

import * as schema from "./schema";
import { pgGenerate } from "drizzle-dbml-generator";

const out = "./schema.dbml";
const relational = true;

pgGenerate({ schema, out, relational });
console.log("Successfully created the schema.dbml file.");
