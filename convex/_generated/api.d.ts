/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as env from "../env.js";
import type * as exerciseCatalog from "../exerciseCatalog.js";
import type * as exercises from "../exercises.js";
import type * as migrations from "../migrations.js";
import type * as profile from "../profile.js";
import type * as profileHelpers from "../profileHelpers.js";
import type * as routines from "../routines.js";
import type * as routines_exerciseMutations from "../routines/exerciseMutations.js";
import type * as routines_helpers from "../routines/helpers.js";
import type * as routines_queries from "../routines/queries.js";
import type * as routines_routineMutations from "../routines/routineMutations.js";
import type * as routines_seed from "../routines/seed.js";
import type * as routines_sessionMutations from "../routines/sessionMutations.js";
import type * as routines_weeklyPlanMutations from "../routines/weeklyPlanMutations.js";
import type * as schemas_accountDeletionJobs from "../schemas/accountDeletionJobs.js";
import type * as schemas_exercises from "../schemas/exercises.js";
import type * as schemas_routineSessions from "../schemas/routineSessions.js";
import type * as schemas_routines from "../schemas/routines.js";
import type * as schemas_sessionExercises from "../schemas/sessionExercises.js";
import type * as schemas_unions from "../schemas/unions.js";
import type * as schemas_userMeasurements from "../schemas/userMeasurements.js";
import type * as schemas_userProfiles from "../schemas/userProfiles.js";
import type * as schemas_users from "../schemas/users.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  env: typeof env;
  exerciseCatalog: typeof exerciseCatalog;
  exercises: typeof exercises;
  migrations: typeof migrations;
  profile: typeof profile;
  profileHelpers: typeof profileHelpers;
  routines: typeof routines;
  "routines/exerciseMutations": typeof routines_exerciseMutations;
  "routines/helpers": typeof routines_helpers;
  "routines/queries": typeof routines_queries;
  "routines/routineMutations": typeof routines_routineMutations;
  "routines/seed": typeof routines_seed;
  "routines/sessionMutations": typeof routines_sessionMutations;
  "routines/weeklyPlanMutations": typeof routines_weeklyPlanMutations;
  "schemas/accountDeletionJobs": typeof schemas_accountDeletionJobs;
  "schemas/exercises": typeof schemas_exercises;
  "schemas/routineSessions": typeof schemas_routineSessions;
  "schemas/routines": typeof schemas_routines;
  "schemas/sessionExercises": typeof schemas_sessionExercises;
  "schemas/unions": typeof schemas_unions;
  "schemas/userMeasurements": typeof schemas_userMeasurements;
  "schemas/userProfiles": typeof schemas_userProfiles;
  "schemas/users": typeof schemas_users;
  types: typeof types;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
          reset?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
