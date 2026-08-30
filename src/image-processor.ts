import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { ColorLayout } from "trace.moe-id";

sharp.cache(false);
sharp.concurrency(1);

function getVideoFrameRect(
  data: Buffer,
  width: number,
  height: number,
  channels = 3,
  colorTolerance = 10,
) {
  function isDark(x: number, y: number) {
    const i = (y * width + x) * channels;
    return (
      data[i] <= colorTolerance && data[i + 1] <= colorTolerance && data[i + 2] <= colorTolerance
    );
  }

  function isRowDark(y: number) {
    let darkPixelCount = 0;
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) darkPixelCount++;
    }
    return darkPixelCount > width * 0.95;
  }

  function isColDark(x: number) {
    let darkPixelCount = 0;
    for (let y = 0; y < height; y++) {
      if (isDark(x, y)) darkPixelCount++;
    }
    return darkPixelCount > height * 0.95;
  }

  let top: number, bottom: number, left: number, right: number;

  const centerY = Math.floor(height / 2);
  const centerX = Math.floor(width / 2);

  if (!isDark(centerX, centerY)) {
    top = centerY;
    bottom = centerY;
    left = centerX;
    right = centerX;
    while (top > 0 && !isRowDark(top - 1)) top--;
    while (bottom < height - 1 && !isRowDark(bottom + 1)) bottom++;
    while (left > 0 && !isColDark(left - 1)) left--;
    while (right < width - 1 && !isColDark(right + 1)) right++;
  } else {
    top = 0;
    bottom = height - 1;
    left = 0;
    right = width - 1;
    while (top < height && isRowDark(top)) top++;
    while (bottom > top && isRowDark(bottom)) bottom--;
    while (left < width && isColDark(left)) left++;
    while (right > left && isColDark(right)) right--;
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };
}

function getNearestAspectRatio(
  width: number,
  height: number,
  targetAspectRatios: number[],
  threshold = 0.05,
) {
  const aspectRatio = width / height;
  let bestRatio = null;
  let minDiff = Infinity;

  for (const targetRatio of targetAspectRatios) {
    const diff = Math.abs(aspectRatio - targetRatio);
    if (diff < minDiff) {
      minDiff = diff;
      bestRatio = targetRatio;
    }
  }

  if (minDiff <= threshold) {
    return bestRatio;
  }
  return null;
}

function snapRectToNearestAspectRatio(
  rect: { x: number; y: number; width: number; height: number },
  maxW: number,
  maxH: number,
) {
  const targetRatios = [4 / 3, 16 / 9, 21 / 9];
  const currentRatio = rect.width / (rect.height || 1);
  let R = targetRatios[0];
  let minDiff = Math.abs(currentRatio - R);
  for (let i = 1; i < targetRatios.length; i++) {
    const diff = Math.abs(currentRatio - targetRatios[i]);
    if (diff < minDiff) {
      minDiff = diff;
      R = targetRatios[i];
    }
  }

  let w = rect.width;
  let h = rect.height;
  if (w / R > h) {
    w = h * R;
  } else {
    h = w / R;
  }

  if (w < 10) w = 10;
  if (h < 10) h = 10;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > maxW) {
    x = maxW - w;
    if (x < 0) {
      x = 0;
      w = maxW;
    }
  }
  if (y + h > maxH) {
    y = maxH - h;
    if (y < 0) {
      y = 0;
      h = maxH;
    }
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
  };
}

/**
 * Resizes and optionally crops black borders from an image buffer,
 * returning raw RGB pixel data and dimensions.
 */
export async function resizeAndCropImage(
  imageBuffer: Buffer,
  cutBorders: boolean = true,
): Promise<{ data: Buffer; width: number; height: number }> {
  const resized = await sharp(imageBuffer)
    .resize({ width: 320, height: 320, fit: "inside" })
    .toBuffer();

  let cropped = sharp(resized);

  if (cutBorders) {
    try {
      const { data, info } = await sharp(resized)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const targetRatios = [4 / 3, 16 / 9, 21 / 9];
      const matchedRatio = getNearestAspectRatio(info.width, info.height, targetRatios);
      if (matchedRatio === null) {
        const detected = getVideoFrameRect(data, info.width, info.height, 3, 10);
        const snapped = snapRectToNearestAspectRatio(detected, info.width, info.height);
        cropped = sharp(resized).extract({
          left: snapped.x,
          top: snapped.y,
          width: snapped.width,
          height: snapped.height,
        });
      }
    } catch {
      // If border trimming fails, fallback to uncropped resized image
      cropped = sharp(resized);
    }
  }

  const { data, info } = await cropped
    .flatten({ background: "#000000" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
  };
}

/**
 * Extracts the 33-element MPEG-7 Color Layout Vector from an image buffer.
 */
export async function extractVectorFromBuffer(
  imageBuffer: Buffer,
  cutBorders: boolean = true,
): Promise<number[]> {
  const { data, width, height } = await resizeAndCropImage(imageBuffer, cutBorders);
  return ColorLayout.extract({ data, width, height, channels: 3 });
}

/**
 * Resolves an image input (URL, local file path, or Base64 string) to a Buffer.
 */
export async function resolveImageInputToBuffer(input: {
  url?: string;
  filePath?: string;
  imageBase64?: string;
}): Promise<Buffer> {
  if (input.imageBase64) {
    // Strip data URL prefix if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    return Buffer.from(cleanBase64, "base64");
  }

  if (input.filePath) {
    const resolvedPath = path.resolve(input.filePath);
    return await fs.readFile(resolvedPath);
  }

  if (input.url) {
    const response = await fetch(input.url, {
      headers: {
        "User-Agent": "trace.moe-mcp/1.0.0",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("No image source provided. Must provide url, filePath, or imageBase64.");
}

/**
 * High-level helper to process an image input directly into a 33-element vector.
 */
export async function processImageToVector(
  input: { url?: string; filePath?: string; imageBase64?: string },
  cutBorders: boolean = true,
): Promise<number[]> {
  const buffer = await resolveImageInputToBuffer(input);
  return extractVectorFromBuffer(buffer, cutBorders);
}
