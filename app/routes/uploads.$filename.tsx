import type { LoaderFunctionArgs } from "react-router";
import { readFile } from "fs/promises";
import { getUploadedFilePath } from "../uploads.server";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const filename = params.filename;
  if (!filename) {
    throw new Response("Not found", { status: 404 });
  }

  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[extension] || "application/octet-stream";

  try {
    const buffer = await readFile(getUploadedFilePath(filename));
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    throw new Response("Not found", { status: 404 });
  }
};
