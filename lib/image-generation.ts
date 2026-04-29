type ImageGenerationResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

type GenerateProductImageInput = {
  image: File;
  ratio: string;
  width: string;
  height: string;
  prompt: string;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function readConfig() {
  const baseUrl = process.env.OPENAICOMPATIBLEBASE_URL;
  const apiKey = process.env.OPENAICOMPATIBLEAPI_KEY;
  const model = process.env.OPENAICOMPATIBLEMODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      "请先在 .env.local 中配置 OPENAICOMPATIBLEBASE_URL、OPENAICOMPATIBLEAPI_KEY 和 OPENAICOMPATIBLEMODEL。"
    );
  }

  return { baseUrl, apiKey, model };
}

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/png";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function toSupportedAspectRatio(ratio: string, width: string, height: string) {
  if (ratio === "1/1") {
    return "1:1";
  }

  if (ratio === "3/4" || ratio === "4/5") {
    return "3:4";
  }

  if (ratio === "16/9") {
    return "16:9";
  }

  if (ratio === "9/16") {
    return "9:16";
  }

  if (ratio === "4/3") {
    return "4:3";
  }

  if (ratio === "custom") {
    const numericWidth = Number(width);
    const numericHeight = Number(height);

    if (!numericWidth || !numericHeight) {
      return "auto";
    }

    const value = numericWidth / numericHeight;
    const candidates = [
      { ratio: "1:1", value: 1 },
      { ratio: "16:9", value: 16 / 9 },
      { ratio: "9:16", value: 9 / 16 },
      { ratio: "4:3", value: 4 / 3 },
      { ratio: "3:4", value: 3 / 4 },
    ];

    return candidates.reduce((best, current) =>
      Math.abs(current.value - value) < Math.abs(best.value - value)
        ? current
        : best
    ).ratio;
  }

  return "auto";
}

function findImageInValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const markdownImage = trimmed.match(/!\[[^\]]*]\(([^)]+)\)/);
    const directImage = trimmed.match(/https?:\/\/[^\s)]+/);

    if (trimmed.startsWith("data:image/")) {
      return trimmed;
    }

    if (markdownImage?.[1]) {
      return markdownImage[1];
    }

    if (directImage?.[0]) {
      return directImage[0];
    }

    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageInValue(item);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.url === "string") {
      return record.url;
    }

    if (typeof record.b64_json === "string") {
      return `data:image/png;base64,${record.b64_json}`;
    }

    if (typeof record.data === "string" && record.data.startsWith("data:image/")) {
      return record.data;
    }

    for (const item of Object.values(record)) {
      const found = findImageInValue(item);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

async function urlToDataUrl(url: string) {
  if (url.startsWith("data:image/")) {
    return url;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 AuraGen/1.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`生成图已返回，但图片链接下载失败，状态码 ${response.status}。`);
  }

  const contentType = response.headers.get("content-type") || "image/png";

  if (!contentType.startsWith("image/")) {
    throw new Error("生成图链接返回的不是图片内容。");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export function validateImageFile(image: FormDataEntryValue | null) {
  if (!(image instanceof File)) {
    return "请上传一张产品白底图。";
  }

  if (!image.type.startsWith("image/")) {
    return "上传文件必须是图片格式。";
  }

  if (image.size > MAX_UPLOAD_BYTES) {
    return "图片不能超过 10MB。";
  }

  return null;
}

export async function generateProductImage({
  image,
  ratio,
  width,
  height,
  prompt,
}: GenerateProductImageInput) {
  const { baseUrl, apiKey, model } = readConfig();
  const imageDataUrl = await fileToDataUrl(image);
  const aspectRatio = toSupportedAspectRatio(ratio, width, height);

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: aspectRatio,
      response_format: "b64_json",
      image: [imageDataUrl],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ImageGenerationResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `灵芽图片生成请求失败，状态码 ${response.status}。`);
  }

  const imageUrl = findImageInValue(payload);

  if (!imageUrl) {
    throw new Error("灵芽接口已响应，但没有返回可解析的图片 URL 或 base64 图片。");
  }

  return urlToDataUrl(imageUrl);
}
