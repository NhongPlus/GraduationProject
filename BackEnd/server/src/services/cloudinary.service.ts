import { v2 as cloudinary } from "cloudinary";
import { env } from "~/config/enviroment";

type ResourceType = "image" | "video" | "raw";

let configured = false;

function ensureCloudinaryConfig(): void {
  if (configured) return;
  if (!env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured.");
  }

  const url = new URL(env.CLOUDINARY_URL);
  const cloudName = url.hostname;
  const apiKey = url.username;
  const apiSecret = url.password;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_URL is invalid.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

function resolveResourceType(mimeType: string): ResourceType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) return "video";
  return "raw";
}

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  resource_type: ResourceType;
  bytes: number;
  format?: string;
}

export async function uploadMediaBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
}): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfig();
  const resourceType = resolveResourceType(params.mimeType);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: params.folder ?? "exams",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          url: result.url,
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: resourceType,
          bytes: result.bytes ?? 0,
          format: result.format,
        });
      }
    );

    stream.end(params.buffer);
  });
}
