import assert from "node:assert";
import { test } from "node:test";

import { getColorLayoutFeatureVector } from "../src/color-layout.ts";

test("colorLayout determinism", () => {
  const width = 320;
  const height = 180;
  const buffer = Buffer.alloc(width * height * 3);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i % 256;
  }

  const result = getColorLayoutFeatureVector(buffer, width, height);
  const expected = [
    30, 15, 16, 16, 16, 16, 16, 15, 16, 15, 16, 16, 16, 16, 15, 15, 15, 16, 15, 16, 15, 32, 16, 16,
    16, 16, 16, 32, 16, 16, 16, 16, 16,
  ];

  assert.deepStrictEqual(result, expected);
});

test("colorLayout consistency (black image)", () => {
  const width = 320;
  const height = 180;
  const buffer = Buffer.alloc(width * height * 3);
  buffer.fill(0);

  const result = getColorLayoutFeatureVector(buffer, width, height);
  const expected = [
    2, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 32, 16, 16,
    16, 16, 16, 32, 16, 16, 16, 16, 16,
  ];

  assert.deepStrictEqual(result, expected);
});

test("colorLayout consistency (white image)", () => {
  const width = 320;
  const height = 180;
  const buffer = Buffer.alloc(width * height * 3);
  buffer.fill(255);

  const result = getColorLayoutFeatureVector(buffer, width, height);
  const expected = [
    61, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 32, 16, 16,
    16, 16, 16, 32, 16, 16, 16, 16, 16,
  ];

  assert.deepStrictEqual(result, expected);
});
