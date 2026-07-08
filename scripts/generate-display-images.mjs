/**
 * scripts/generate-display-images.mjs
 *
 * Generates the small "display tier" images used by the product carousel
 * from the full-res "zoom tier" originals (the hand-tuned Squoosh exports
 * that already live in public/products).
 *
 * Run this once now, and again any time a new product photo is added:
 *   npm run generate:display-images
 *
 * It never touches the originals — it only (re)writes files under
 * public/products/display/, mirroring each source filename.
 */

import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = path.join(process.cwd(), "public", "products");
const OUTPUT_DIR = path.join(SOURCE_DIR, "display");

// ~900px wide is plenty for the carousel at any screen size we serve it
// at (see the `sizes` prop on the <Image> in ProductCard.jsx); the
// original stays untouched as the zoom tier.
const DISPLAY_WIDTH = 900;
const DISPLAY_QUALITY = 82;

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const sourceFiles = entries.filter(
    (e) => e.isFile() && /\.(webp|jpe?g|png)$/i.test(e.name),
  );

  if (sourceFiles.length === 0) {
    console.log("No source images found in public/products.");
    return;
  }

  for (const entry of sourceFiles) {
    const inputPath = path.join(SOURCE_DIR, entry.name);
    const outputPath = path.join(OUTPUT_DIR, entry.name);

    const meta = await sharp(inputPath).metadata();
    const before = (await stat(inputPath)).size;

    await sharp(inputPath)
      .resize({ width: Math.min(DISPLAY_WIDTH, meta.width ?? DISPLAY_WIDTH) })
      .webp({ quality: DISPLAY_QUALITY })
      .toFile(outputPath.replace(/\.(jpe?g|png)$/i, ".webp"));

    const after = (await stat(outputPath.replace(/\.(jpe?g|png)$/i, ".webp"))).size;
    const savedPct = Math.round((1 - after / before) * 100);
    console.log(
      `${entry.name}: ${meta.width}px → ${DISPLAY_WIDTH}px  ` +
        `(${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB, -${savedPct}%)`,
    );
  }

  console.log(`\nDone. Display-tier images written to public/products/display/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
