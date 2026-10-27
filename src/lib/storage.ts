import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// Local-disk file storage. Replace with S3/R2 by keeping the same three functions.

function baseDir() {
  return path.resolve(process.env.STORAGE_DIR || "./storage");
}

export async function saveFile(vendorId: string, file: File): Promise<{
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = path.posix.join(vendorId, `${randomBytes(8).toString("hex")}-${safeName}`);
  const full = path.join(baseDir(), storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return { storageKey, fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size };
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(baseDir(), storageKey));
}

export async function deleteStoredFile(storageKey: string) {
  try {
    await unlink(path.join(baseDir(), storageKey));
  } catch {
    /* already gone */
  }
}
