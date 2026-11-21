import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomToken } from "@/server/crypto";

// Upload sécurisé : type vérifié sur le CONTENU (sharp décode l'image), taille limitée,
// image réencodée en WebP (supprime EXIF/GPS et tout contenu actif), redimensionnée.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export class UploadError extends Error {}

interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}

class LocalDriver implements StorageDriver {
  async put(key: string, body: Buffer) {
    const target = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return `/uploads/${key}`;
  }
}

class S3Driver implements StorageDriver {
  private client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
  });
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!, Key: key, Body: body, ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }
}

const driver: StorageDriver = process.env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDriver();

export type ImageKind = "product" | "logo" | "cover" | "banner";
const SIZES: Record<ImageKind, { w: number; h?: number; fit: "inside" | "cover" }> = {
  product: { w: 1200, fit: "inside" },
  logo: { w: 400, h: 400, fit: "cover" },
  cover: { w: 1600, h: 600, fit: "cover" },
  banner: { w: 1600, h: 640, fit: "cover" },
};

export async function storeImage(file: File, kind: ImageKind, scope: string): Promise<string> {
  if (file.size === 0) throw new UploadError("Fichier vide");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Image trop lourde (8 Mo max)");
  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    const s = SIZES[kind];
    out = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: s.w, height: s.h, fit: s.fit, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    throw new UploadError("Format d'image non reconnu (JPEG, PNG, WebP, AVIF)");
  }
  const key = `${kind}/${scope}/${Date.now().toString(36)}-${randomToken(6)}.webp`;
  return driver.put(key, out, "image/webp");
}

export async function storeVideo(file: File, scope: string): Promise<string> {
  const ext = VIDEO_TYPES[file.type];
  if (!ext) throw new UploadError("Vidéo MP4 ou WebM uniquement");
  if (file.size > MAX_VIDEO_BYTES) throw new UploadError("Vidéo trop lourde (30 Mo max)");
  const buf = Buffer.from(await file.arrayBuffer());
  // Vérification de signature minimale (ftyp pour MP4, EBML pour WebM)
  const isMp4 = buf.subarray(4, 8).toString("ascii") === "ftyp";
  const isWebm = buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!(ext === "mp4" ? isMp4 : isWebm)) throw new UploadError("Contenu vidéo invalide");
  return driver.put(`video/${scope}/${Date.now().toString(36)}-${randomToken(6)}.${ext}`, buf, file.type);
}

export function filesFrom(form: FormData, name: string): File[] {
  return form.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}
