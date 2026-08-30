import assert from "node:assert";
import { test } from "node:test";
import sharp from "sharp";
import { formatEpisode, formatSimilarity, formatTime, getAnimeTitles } from "../src/format.ts";
import { extractVectorFromBuffer, processImageToVector } from "../src/image-processor.ts";

test("image-processor extracts 33-element vector from generated image buffer", async () => {
  const testBuffer = await sharp({
    create: {
      width: 640,
      height: 360,
      channels: 3,
      background: { r: 120, g: 180, b: 240 },
    },
  })
    .png()
    .toBuffer();

  const vector = await extractVectorFromBuffer(testBuffer, true);
  assert.strictEqual(Array.isArray(vector), true);
  assert.strictEqual(vector.length, 33);
  vector.forEach((v) => assert.strictEqual(typeof v, "number"));
});

test("image-processor handles base64 image", async () => {
  const testBuffer = await sharp({
    create: {
      width: 320,
      height: 180,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  const base64 = `data:image/jpeg;base64,${testBuffer.toString("base64")}`;
  const vector = await processImageToVector({ imageBase64: base64 }, true);
  assert.strictEqual(vector.length, 33);
});

test("format utilities format time and similarity correctly", () => {
  assert.strictEqual(formatTime(0), "00:00");
  assert.strictEqual(formatTime(65), "01:05");
  assert.strictEqual(formatTime(3665), "01:01:05");
  assert.strictEqual(formatSimilarity(0.9854), "98.5%");
  assert.strictEqual(formatSimilarity(1.0), "100.0%");
});

test("title language preferences (English, Chinese, Japanese)", () => {
  const sampleAnilist = {
    id: 21034,
    title: {
      native: "ご注文はうさぎですか？？",
      romaji: "Gochuumon wa Usagi desu ka??",
      english: "Is the Order a Rabbit?? Season 2",
      chinese: "請問您今天要來點兔子嗎？？",
    },
  };

  // English preference: native, romaji, english (no chinese)
  const en = getAnimeTitles(sampleAnilist, "en");
  assert.strictEqual(en.primary, "Is the Order a Rabbit?? Season 2");
  assert.deepStrictEqual(en.titles, [
    "ご注文はうさぎですか？？",
    "Gochuumon wa Usagi desu ka??",
    "Is the Order a Rabbit?? Season 2",
  ]);

  // Chinese preference: native, chinese (no english, no romaji)
  const zh = getAnimeTitles(sampleAnilist, "zh");
  assert.strictEqual(zh.primary, "請問您今天要來點兔子嗎？？");
  assert.deepStrictEqual(zh.titles, ["ご注文はうさぎですか？？", "請問您今天要來點兔子嗎？？"]);

  // Japanese preference: native only (no english, no chinese, no romaji)
  const ja = getAnimeTitles(sampleAnilist, "ja");
  assert.strictEqual(ja.primary, "ご注文はうさぎですか？？");
  assert.deepStrictEqual(ja.titles, ["ご注文はうさぎですか？？"]);
});

test("formatEpisode handles episode_start/end, total count, and unknown episodes", () => {
  const anilistWith12 = { id: 1, title: {}, episodes: 12 };
  const anilistWithoutTotal = { id: 1, title: {}, episodes: null };

  // Single episode with total episodes
  assert.strictEqual(
    formatEpisode({
      anilist: anilistWith12,
      filename: "test.mp4",
      episode_start: 1,
      episode_end: 1,
      from: 0,
      to: 10,
      similarity: 0.99,
      video: "",
      image: "",
    }),
    "1/12",
  );

  // Episode range with total episodes
  assert.strictEqual(
    formatEpisode({
      anilist: anilistWith12,
      filename: "test.mp4",
      episode_start: 1,
      episode_end: 2,
      from: 0,
      to: 10,
      similarity: 0.99,
      video: "",
      image: "",
    }),
    "1-2/12",
  );

  // Single episode without total episodes
  assert.strictEqual(
    formatEpisode({
      anilist: anilistWithoutTotal,
      filename: "test.mp4",
      episode_start: 3,
      episode_end: 3,
      from: 0,
      to: 10,
      similarity: 0.99,
      video: "",
      image: "",
    }),
    "3",
  );

  // Fallback to filename episode if start/end missing
  assert.strictEqual(
    formatEpisode({
      anilist: anilistWith12,
      filename: "test.mp4",
      episode: "04",
      from: 0,
      to: 10,
      similarity: 0.99,
      video: "",
      image: "",
    }),
    "04/12",
  );

  // Unknown episode
  assert.strictEqual(
    formatEpisode({
      anilist: anilistWithoutTotal,
      filename: "test.mp4",
      from: 0,
      to: 10,
      similarity: 0.99,
      video: "",
      image: "",
    }),
    null,
  );
});
