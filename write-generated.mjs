// write-generated.mjs — creates src/convex/_generated/* for the Render build
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "src", "convex", "_generated");
mkdirSync(outDir, { recursive: true });
const files = {
  "api.js": `/* eslint-disable */
import { anyApi, componentsGeneric } from "convex/server";
export const api = anyApi;
export const internal = anyApi;
export const components = componentsGeneric();
`,
  "api.d.ts": `/* eslint-disable */
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as http from "../http.js";
import type * as password from "../password.js";
import type * as queries from "../queries.js";
import type * as seedData from "../seedData.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  http: typeof http;
  password: typeof password;
  queries: typeof queries;
  seedData: typeof seedData;
  tests: typeof tests;
  users: typeof users;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const components: {};
`,
  "server.js": `/* eslint-disable */
import {
  actionGeneric, httpActionGeneric, queryGeneric, mutationGeneric,
  internalActionGeneric, internalMutationGeneric, internalQueryGeneric,
} from "convex/server";
export const query = queryGeneric;
export const internalQuery = internalQueryGeneric;
export const mutation = mutationGeneric;
export const internalMutation = internalMutationGeneric;
export const action = actionGeneric;
export const internalAction = internalActionGeneric;
export const httpAction = httpActionGeneric;
`,
  "server.d.ts": `/* eslint-disable */
import {
  ActionBuilder, HttpActionBuilder, MutationBuilder, QueryBuilder,
  GenericActionCtx, GenericMutationCtx, GenericQueryCtx,
  GenericDatabaseReader, GenericDatabaseWriter,
} from "convex/server";
import type { DataModel } from "./dataModel.js";
export declare const query: QueryBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;
export declare const httpAction: HttpActionBuilder;
export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;
`,
  "dataModel.d.ts": `/* eslint-disable */
import type {
  DataModelFromSchemaDefinition, DocumentByName,
  TableNamesInDataModel, SystemTableNames,
} from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema.js";
export type TableNames = TableNamesInDataModel<DataModel>;
export type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>;
export type Id<TableName extends TableNames | SystemTableNames> = GenericId<TableName>;
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
`,
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content, "utf8");
}
console.log("OK generated");
