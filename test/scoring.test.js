import { test } from "node:test";
import assert from "node:assert/strict";
import { scorePronunciation, normalize } from "../public/scoring.js";

test("normalize removes punctuation and case", () => {
  assert.deepEqual(normalize("Could I have a LATTE, please?"), ["could", "i", "have", "a", "latte", "please"]);
});

test("perfect repetition scores 100", () => {
  const r = scorePronunciation("How much is it?", "how much is it");
  assert.equal(r.score, 100);
  assert.ok(r.words.every((w) => w.ok));
});

test("missing words are flagged", () => {
  const r = scorePronunciation("Can I pay by card?", "can I pay card");
  assert.equal(r.score, 80);
  assert.deepEqual(r.words.map((w) => w.ok), [true, true, true, false, true]);
});

test("empty answer scores 0", () => {
  assert.equal(scorePronunciation("Nice to meet you.", "").score, 0);
});
