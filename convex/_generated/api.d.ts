/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as exerciseCatalog from "../exerciseCatalog.js";
import type * as exercises from "../exercises.js";
import type * as routines from "../routines.js";
import type * as schemas_exercises from "../schemas/exercises.js";
import type * as schemas_routineSessions from "../schemas/routineSessions.js";
import type * as schemas_routines from "../schemas/routines.js";
import type * as schemas_sessionExercises from "../schemas/sessionExercises.js";
import type * as schemas_unions from "../schemas/unions.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  exerciseCatalog: typeof exerciseCatalog;
  exercises: typeof exercises;
  routines: typeof routines;
  "schemas/exercises": typeof schemas_exercises;
  "schemas/routineSessions": typeof schemas_routineSessions;
  "schemas/routines": typeof schemas_routines;
  "schemas/sessionExercises": typeof schemas_sessionExercises;
  "schemas/unions": typeof schemas_unions;
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

export declare const components: {};
