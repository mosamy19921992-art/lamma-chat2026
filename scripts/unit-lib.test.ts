import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAuthRole } from "../src/lib/authProfile.ts";
import { appendInviteParam } from "../src/lib/inviteAccess.ts";
import {
  isSafeHttpUrl,
  sanitizeHexColor,
  getYoutubeId,
} from "../src/lib/chatHelpers.ts";
import { rolePromotionScopeLabel } from "../src/lib/memberRoleResolution.ts";
import { normalizeMemberRole } from "../src/lib/rolePolicy.ts";

test("normalizeAuthRole maps Arabic and English owner tokens", () => {
  assert.equal(normalizeAuthRole("المالك"), "owner");
  assert.equal(normalizeAuthRole("owner"), "owner");
  assert.equal(normalizeAuthRole("unknown"), "user");
});

test("appendInviteParam adds invite query param", () => {
  const link = appendInviteParam("https://lamma-arabic-chat-room.vercel.app/?room=egypt");
  assert.match(link, /invite=lamma/);
});

test("isSafeHttpUrl rejects javascript URLs", () => {
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("https://example.com/x.png"), true);
});

test("sanitizeHexColor accepts valid hex", () => {
  assert.equal(sanitizeHexColor("#10b981"), "#10b981");
  assert.equal(sanitizeHexColor("not-a-color"), null);
});

test("getYoutubeId extracts video id", () => {
  assert.equal(
    getYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(getYoutubeId("https://example.com"), null);
});

test("normalizeMemberRole maps admin token", () => {
  assert.equal(normalizeMemberRole("admin"), "admin");
  assert.equal(normalizeMemberRole("unknown"), "user");
});

test("rolePromotionScopeLabel describes global promotion", () => {
  assert.match(rolePromotionScopeLabel("admin", "egypt"), /كل الغرف/);
});
