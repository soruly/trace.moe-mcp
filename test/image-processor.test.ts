import assert from "node:assert";
import { test } from "node:test";
import sharp from "sharp";
import {
  formatAnilistSearchResultsMarkdown,
  formatEpisode,
  formatSearchResultsMarkdown,
  formatSimilarity,
  formatTime,
  formatUserQuotaMarkdown,
  getAnimeTitles,
} from "../src/format.ts";
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

test("title extraction returns all available languages", () => {
  const sampleAnilist = {
    id: 21034,
    title: {
      native: "ご注文はうさぎですか？？",
      romaji: "Gochuumon wa Usagi desu ka??",
      english: "Is the Order a Rabbit?? Season 2",
      chinese: "請問您今天要來點兔子嗎？？",
    },
  };

  const result = getAnimeTitles(sampleAnilist);
  assert.strictEqual(result.primary, "Is the Order a Rabbit?? Season 2");
  assert.deepStrictEqual(result.titles, [
    "ご注文はうさぎですか？？",
    "Gochuumon wa Usagi desu ka??",
    "Is the Order a Rabbit?? Season 2",
    "請問您今天要來點兔子嗎？？",
  ]);
  assert.strictEqual(result.id, 21034);

  // Fallback when english is not available
  const noEnglish = {
    id: 12345,
    title: {
      native: "進撃の巨人",
      romaji: "Shingeki no Kyojin",
      chinese: "進擊的巨人",
    },
  };
  const resultNoEn = getAnimeTitles(noEnglish);
  assert.strictEqual(resultNoEn.primary, "Shingeki no Kyojin");
  assert.deepStrictEqual(resultNoEn.titles, ["進撃の巨人", "Shingeki no Kyojin", "進擊的巨人"]);

  // When only anilist ID is provided
  const numberId = getAnimeTitles(999);
  assert.strictEqual(numberId.primary, "Anilist ID 999");
  assert.deepStrictEqual(numberId.titles, ["Anilist ID 999"]);
  assert.strictEqual(numberId.id, 999);
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

test("formatSearchResultsMarkdown generates correct English markdown with all title languages", () => {
  const result = formatSearchResultsMarkdown({
    frameCount: 123456,
    result: [
      {
        anilist: {
          id: 21034,
          title: {
            native: "ご注文はうさぎですか？？",
            romaji: "Gochuumon wa Usagi desu ka??",
            english: "Is the Order a Rabbit?? Season 2",
            chinese: "請問您今天要來點兔子嗎？？",
          },
          episodes: 12,
        },
        filename: "Gochuumon wa Usagi desu ka S2 - 01.mp4",
        episode: 1,
        episode_start: 1,
        episode_end: 1,
        from: 65,
        to: 70,
        similarity: 0.985,
        video: "https://media.trace.moe/video/21034/preview.mp4",
        image: "https://media.trace.moe/image/21034/preview.jpg",
      },
    ],
  });

  assert.match(
    result,
    /### trace\.moe Search Results \(Found 1 matches, compared 123,456 frames\)/,
  );
  assert.match(result, /#### 1\. Is the Order a Rabbit\?\? Season 2 \(98\.5% similarity\)/);
  assert.match(result, /- ご注文はうさぎですか？？/);
  assert.match(result, /- Gochuumon wa Usagi desu ka\?\?/);
  assert.match(result, /- 請問您今天要來點兔子嗎？？/);
  assert.match(result, /- \*\*Episode\*\*: 1\/12/);
  assert.match(result, /- \*\*Timestamp\*\*: `01:05 - 01:10`/);
  assert.match(
    result,
    /- \*\*Anilist\*\*: \[https:\/\/anilist\.co\/anime\/21034\]\(https:\/\/anilist\.co\/anime\/21034\)/,
  );
});

test("formatAnilistSearchResultsMarkdown generates correct English markdown", () => {
  const result = formatAnilistSearchResultsMarkdown(
    [
      {
        id: 21034,
        title: "Is the Order a Rabbit?? Season 2",
        similarity: 0.95,
        anilist: {
          id: 21034,
          title: {
            native: "ご注文はうさぎですか？？",
            romaji: "Gochuumon wa Usagi desu ka??",
            english: "Is the Order a Rabbit?? Season 2",
            chinese: "請問您今天要來點兔子嗎？？",
          },
        },
      },
    ],
    "rabbit",
  );

  assert.match(result, /### Anime Search Results for "rabbit" \(Found 1 matches\):/);
  assert.match(
    result,
    /#### 1\. Is the Order a Rabbit\?\? Season 2 \(Match: 95%, Anilist ID: `21034`\)/,
  );
  assert.match(result, /- ご注文はうさぎですか？？/);
  assert.match(result, /- Gochuumon wa Usagi desu ka\?\?/);
  assert.match(result, /- 請問您今天要來點兔子嗎？？/);
});

test("formatUserQuotaMarkdown generates correct English markdown", () => {
  const result = formatUserQuotaMarkdown({
    id: "127.0.0.1",
    priority: 0,
    concurrency: 1,
    quota: 1000,
    quotaUsed: 25,
  });

  assert.match(result, /### trace\.moe Account Quota & Status/);
  assert.match(result, /- \*\*ID\*\*: `127\.0\.0\.1`/);
  assert.match(result, /- \*\*Remaining Daily Quota\*\*: \*\*975\*\* \/ 1,000/);
  assert.match(result, /- \*\*Searches Used \(last 24h\)\*\*: 25/);
});
