import { randomUUID } from "crypto";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function getAppUrl() {
  return process.env.SHOPIFY_APP_URL || "";
}

export async function saveUploadedFile(file: File) {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const extension = path.extname(file.name) || "";
  const filename = `${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return {
    url: `/uploads/${filename}`,
    filename,
  };
}

export function getUploadedFilePath(filename: string) {
  return path.join(UPLOADS_DIR, filename);
}

// Instagram's media_url/thumbnail_url are short-lived signed CDN links that
// stop working a few days after sync - mirror them into our own storage
// (keyed by a deterministic filename) so the feed keeps working afterward.
// Returns null if the remote fetch fails, so the caller can fall back to the
// original (still-fresh-for-now) URL instead of losing the media entirely.
export async function cacheRemoteFile(url: string, filename: string) {
  const destination = path.join(UPLOADS_DIR, filename);

  try {
    await access(destination);
    return `/uploads/${filename}`;
  } catch {
    // Not cached yet - fall through to download it.
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    await mkdir(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`Could not cache remote file ${filename}:`, error);
    return null;
  }
}

// Uploaded files are stored as a relative path so they keep working even if
// the app's domain (e.g. a local dev tunnel URL) changes after upload.
// URLs added directly by merchants are already absolute and pass through.
export function resolveMediaUrl(url: string) {
  if (url.startsWith("/")) {
    return `${getAppUrl()}${url}`;
  }
  return url;
}
