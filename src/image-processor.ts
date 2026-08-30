import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getColorLayoutFeatureVector } from "./color-layout.ts";

sharp.cache(false);
sharp.concurrency(1);

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
      // normalize brightness -> dilate -> trim with threshold to find content bbox
      const { info } = await sharp(resized)
        .normalize()
        .dilate(2)
        .trim({ background: "black", threshold: 30 })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const trimmedTop = Math.abs(info.trimOffsetTop ?? 0);
      const trimmedLeft = Math.abs(info.trimOffsetLeft ?? 0);
      const newWidth = info.width;
      const newHeight = info.height;

      if (
        Math.abs(newWidth / newHeight - 16 / 9) < 0.05 ||
        Math.abs(newWidth / newHeight - 4 / 3) < 0.05
      ) {
        // If detected area is near 16:9 or 4:3, crop directly
        cropped = sharp(resized).extract({
          left: trimmedLeft,
          top: trimmedTop,
          width: newWidth,
          height: newHeight,
        });
      } else if (Math.abs(newWidth / newHeight - 21 / 9) < 0.1) {
        // If detected area is near 21:9
        const metadata = await sharp(resized).metadata();
        const origW = metadata.width || newWidth;
        const origH = metadata.height || newHeight;
        if ((origW - newWidth) / origW > 0.05 || (origH - newHeight) / origH > 0.05) {
          cropped = sharp(resized)
            .extract({
              left: trimmedLeft,
              top: trimmedTop,
              width: newWidth,
              height: newHeight,
            })
            .resize({ width: 320, height: 180, fit: "contain" });
        }
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
  return getColorLayoutFeatureVector(data, width, height);
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
