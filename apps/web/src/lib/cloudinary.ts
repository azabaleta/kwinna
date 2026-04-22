// Direct unsigned upload to Cloudinary.
// Uses XHR instead of fetch so we get real upload-progress events.

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id:  string;
  width:      number;
  height:     number;
}

export function uploadToCloudinary(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      reject(
        new Error(
          "Cloudinary no configurado. Seteá NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y " +
          "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env."
        )
      );
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    // Ask Cloudinary to return only what we need
    fd.append("resource_type", "image");

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
        } catch {
          reject(new Error("Respuesta inesperada de Cloudinary"));
        }
      } else {
        let msg = `Cloudinary error ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (body.error?.message) msg = body.error.message;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error",  () => reject(new Error("Error de red al subir imagen")));
    xhr.addEventListener("abort",  () => reject(new Error("Upload cancelado")));

    // Abort support
    signal?.addEventListener("abort", () => xhr.abort());

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    );
    xhr.send(fd);
  });
}
