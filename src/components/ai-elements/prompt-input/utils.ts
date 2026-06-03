import type { FileUIPart } from "ai";
import { nanoid } from "nanoid";

export const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const captureScreenshot = async (): Promise<File | null> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getDisplayMedia
  ) {
    return null;
  }

  let stream: MediaStream | null = null;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });

    video.srcObject = stream;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load screen stream"));
    });

    await video.play();

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) {
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");

    return new File([blob], `screenshot-${timestamp}.png`, {
      lastModified: Date.now(),
      type: "image/png",
    });
  } finally {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    video.pause();
    video.srcObject = null;
  }
};

export const inferMediaType = (filename: string, browserType: string): string => {
  if (browserType && browserType !== "application/octet-stream") {
    return browserType;
  }
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    txt: "text/plain", md: "text/markdown", js: "text/javascript", jsx: "text/javascript",
    ts: "text/typescript", tsx: "text/typescript", json: "application/json", yml: "text/yaml",
    yaml: "text/yaml", css: "text/css", html: "text/html", htm: "text/html", xml: "application/xml",
    svg: "image/svg+xml", py: "text/x-python", sh: "text/x-shellscript", bash: "text/x-shellscript",
    rs: "text/x-rust", go: "text/x-go", c: "text/x-c", cpp: "text/x-c++", h: "text/x-c", hpp: "text/x-c++",
    java: "text/x-java", sql: "text/x-sql", toml: "text/x-toml", ini: "text/plain", cfg: "text/plain",
    conf: "text/plain", env: "text/plain", log: "text/plain", csv: "text/csv", pdf: "application/pdf",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    bmp: "image/bmp", ico: "image/x-icon",
  };
  return mimeMap[ext] || browserType || "application/octet-stream";
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
