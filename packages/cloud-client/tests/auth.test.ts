import { expect, test } from "bun:test";
import type { User } from "@supabase/supabase-js";
import { tierOf } from "../src/auth.js";

function userWith(appMetadata: Record<string, unknown>): User {
  return { app_metadata: appMetadata } as unknown as User;
}

test("tierOf returns 'pro' when app_metadata.tier is pro", () => {
  expect(tierOf(userWith({ tier: "pro" }))).toBe("pro");
});

test("tierOf returns null for non-pro or missing tier", () => {
  expect(tierOf(null)).toBeNull();
  expect(tierOf(userWith({}))).toBeNull();
  expect(tierOf(userWith({ tier: "free" }))).toBeNull();
});
