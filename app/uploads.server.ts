import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
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

// Uploaded files are stored as a relative path so they keep working even if
// the app's domain (e.g. a local dev tunnel URL) changes after upload.
// URLs added directly by merchants are already absolute and pass through.
export function resolveMediaUrl(url: string) {
  if (url.startsWith("/")) {
    return `${getAppUrl()}${url}`;
  }
  return url;
}
