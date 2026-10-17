import { writeFileSync } from "node:fs";
import { SCHEMA } from "../lib/schema";
writeFileSync("db/schema.sql", "-- Generated from lib/schema.ts by `npm run db:schema`. Idempotent: safe to re-run.\n" + SCHEMA.trim() + "\n"); console.log("wrote db/schema.sql");
