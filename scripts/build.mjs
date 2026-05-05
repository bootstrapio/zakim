import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const sourceDir = join(root, "public");
const distDir = join(root, "dist");
const mediaDir = join(distDir, "assets", "media");

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 10);
}

function assetName(name, content) {
  const extension = extname(name);
  const base = name.slice(0, -extension.length);
  return `${base}.${hashContent(content)}${extension}`;
}

function minifyHtml(html) {
  return html
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+(?=>)/g, "")
    .trim();
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyJs(js) {
  return js
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\],;:+\-*/%=<>?])\s*/g, "$1")
    .trim();
}

function minifySvg(svg) {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

async function writeHashedAsset(relativePath, content) {
  const outputName = assetName(relativePath.split("/").pop(), content);
  const outputPath = join(mediaDir, outputName);
  await writeFile(outputPath, content);
  return `assets/media/${outputName}`;
}

async function buildPoster() {
  const sourcePath = join(sourceDir, "assets", "media", "hero-background.webp");
  const sourceContent = await readFile(sourcePath);
  const optimizedPath = join(mediaDir, "hero-background.tmp.webp");
  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sourcePath,
      "-vframes",
      "1",
      "-compression_level",
      "6",
      "-quality",
      "86",
      optimizedPath,
    ],
    { stdio: "ignore" },
  );

  if (ffmpeg.status === 0 && existsSync(optimizedPath)) {
    const optimizedSize = statSync(optimizedPath).size;
    const sourceSize = statSync(sourcePath).size;

    if (optimizedSize < sourceSize) {
      const optimizedContent = await readFile(optimizedPath);
      rmSync(optimizedPath);
      return writeHashedAsset("hero-background.webp", optimizedContent);
    }
  }

  if (existsSync(optimizedPath)) {
    rmSync(optimizedPath);
  }

  return writeHashedAsset("hero-background.webp", sourceContent);
}

async function buildVideo() {
  const sourcePath = join(sourceDir, "assets", "media", "hero-background.mp4");
  const sourceContent = await readFile(sourcePath);
  const compressedPath = join(mediaDir, "hero-background.tmp.mp4");
  const outputArgs = [
    "-y",
    "-i",
    sourcePath,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    compressedPath,
  ];
  const ffmpeg = spawnSync("ffmpeg", outputArgs, { stdio: "ignore" });

  if (ffmpeg.status === 0 && existsSync(compressedPath)) {
    const compressedSize = statSync(compressedPath).size;
    const sourceSize = statSync(sourcePath).size;

    if (compressedSize < sourceSize) {
      const compressedContent = await readFile(compressedPath);
      const outputName = assetName("hero-background.mp4", compressedContent);
      const outputPath = join(mediaDir, outputName);
      await copyFile(compressedPath, outputPath);
      rmSync(compressedPath);
      return `assets/media/${outputName}`;
    }
  }

  if (existsSync(compressedPath)) {
    rmSync(compressedPath);
  }

  const outputName = assetName("hero-background.mp4", sourceContent);
  await copyFile(sourcePath, join(mediaDir, outputName));
  return `assets/media/${outputName}`;
}

async function build() {
  rmSync(distDir, { recursive: true, force: true });
  ensureDir(mediaDir);

  const [htmlSource, cssSource, jsSource, svgSource, brandingSvgSource] =
    await Promise.all([
      readFile(join(sourceDir, "index.html"), "utf8"),
      readFile(join(sourceDir, "styles.css"), "utf8"),
      readFile(join(sourceDir, "script.js"), "utf8"),
      readFile(join(sourceDir, "assets", "media", "zakim.svg"), "utf8"),
      readFile(
        join(sourceDir, "assets", "media", "zakim-branding.svg"),
        "utf8",
      ),
    ]);

  const css = minifyCss(cssSource);
  const js = minifyJs(jsSource);
  const svg = minifySvg(svgSource);
  const brandingSvg = minifySvg(brandingSvgSource);

  const cssName = assetName("styles.css", css);
  const jsName = assetName("script.js", js);
  const posterPath = await buildPoster();
  const logoPath = await writeHashedAsset("zakim.svg", svg);
  const brandingLogoPath = await writeHashedAsset(
    "zakim-branding.svg",
    brandingSvg,
  );
  const videoPath = await buildVideo();

  await writeFile(join(distDir, cssName), css);
  await writeFile(join(distDir, jsName), js);
  await writeFile(join(distDir, ".nojekyll"), "");

  const html = minifyHtml(
    htmlSource
      .replaceAll("assets/media/hero-background.webp", posterPath)
      .replaceAll("assets/media/hero-background.mp4", videoPath)
      .replaceAll("assets/media/zakim-branding.svg", brandingLogoPath)
      .replaceAll("assets/media/zakim.svg", logoPath)
      .replace('href="styles.css"', `href="${cssName}"`)
      .replace('src="script.js"', `src="${jsName}"`),
  );

  await writeFile(join(distDir, "index.html"), html);

  const manifest = {
    files: {
      html: "index.html",
      css: cssName,
      js: jsName,
      poster: posterPath,
      logo: logoPath,
      brandingLogo: brandingLogoPath,
      video: videoPath,
    },
  };

  await writeFile(
    join(distDir, "asset-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

await build();
