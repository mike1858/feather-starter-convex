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
import type * as auth_queries from "../auth/queries.js";
import type * as devEmails_mutations from "../devEmails/mutations.js";
import type * as devEmails_queries from "../devEmails/queries.js";
import type * as email_index from "../email/index.js";
import type * as env from "../env.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as onboarding_mutations from "../onboarding/mutations.js";
import type * as otp_ResendOTP from "../otp/ResendOTP.js";
import type * as otp_VerificationCodeEmail from "../otp/VerificationCodeEmail.js";
import type * as password_PasswordResetEmail from "../password/PasswordResetEmail.js";
import type * as password_ResendOTPPasswordReset from "../password/ResendOTPPasswordReset.js";
import type * as tasks_mutations from "../tasks/mutations.js";
import type * as tasks_queries from "../tasks/queries.js";
import type * as testing_clearAll from "../testing/clearAll.js";
import type * as uploads_mutations from "../uploads/mutations.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/queries": typeof auth_queries;
  "devEmails/mutations": typeof devEmails_mutations;
  "devEmails/queries": typeof devEmails_queries;
  "email/index": typeof email_index;
  env: typeof env;
  http: typeof http;
  init: typeof init;
  "onboarding/mutations": typeof onboarding_mutations;
  "otp/ResendOTP": typeof otp_ResendOTP;
  "otp/VerificationCodeEmail": typeof otp_VerificationCodeEmail;
  "password/PasswordResetEmail": typeof password_PasswordResetEmail;
  "password/ResendOTPPasswordReset": typeof password_ResendOTPPasswordReset;
  "tasks/mutations": typeof tasks_mutations;
  "tasks/queries": typeof tasks_queries;
  "testing/clearAll": typeof testing_clearAll;
  "uploads/mutations": typeof uploads_mutations;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
