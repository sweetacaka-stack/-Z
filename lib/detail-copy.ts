export type DetailPageSection = {
  heading: string;
  body: string;
};

export type DetailPageCopy = {
  productName: string;
  headline: string;
  subheadline: string;
  sellingPoints: string[];
  sections: DetailPageSection[];
  seoKeywords: string[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function readTextConfig() {
  const baseUrl = process.env.OPENAICOMPATIBLEBASE_URL;
  const apiKey = process.env.OPENAICOMPATIBLEAPI_KEY;
  const model =
    process.env.OPENAICOMPATIBLETEXT_MODEL ?? process.env.OPENAICOMPATIBLEMODEL;

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return { baseUrl, apiKey, model };
}

function cleanProductName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.replace(/[_-]+/g, " ").trim();
  return normalized || "精选产品";
}

function fallbackDetailCopy(fileName: string): DetailPageCopy {
  const productName = cleanProductName(fileName);

  return {
    productName,
    headline: `${productName}，为日常使用打造的高质感选择`,
    subheadline:
      "以清晰卖点、真实场景和细节展示构建完整详情页，让用户快速理解产品价值。",
    sellingPoints: ["真实质感", "清晰卖点", "场景展示", "细节呈现"],
    sections: [
      {
        heading: "核心卖点",
        body: "围绕产品外观、材质、功能和使用体验提炼主要优势，适合作为详情页首屏说明。",
      },
      {
        heading: "细节展示",
        body: "突出产品结构、工艺、包装和关键设计，让用户在浏览时获得更强的信任感。",
      },
      {
        heading: "使用场景",
        body: "结合真实生活或商业使用环境，展示产品如何自然融入目标用户的需求。",
      },
    ],
    seoKeywords: [productName, "产品详情页", "电商详情", "商品卖点"],
  };
}

function parseJsonObject(content: string) {
  const direct = content.trim();
  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenced?.[1] ?? direct;
  return JSON.parse(jsonText) as Partial<DetailPageCopy>;
}

function normalizeDetailCopy(value: Partial<DetailPageCopy>, fileName: string) {
  const fallback = fallbackDetailCopy(fileName);

  return {
    productName: value.productName || fallback.productName,
    headline: value.headline || fallback.headline,
    subheadline: value.subheadline || fallback.subheadline,
    sellingPoints:
      Array.isArray(value.sellingPoints) && value.sellingPoints.length > 0
        ? value.sellingPoints.slice(0, 6).map(String)
        : fallback.sellingPoints,
    sections:
      Array.isArray(value.sections) && value.sections.length > 0
        ? value.sections.slice(0, 5).map((section) => ({
            heading: String(section.heading || "详情模块"),
            body: String(section.body || ""),
          }))
        : fallback.sections,
    seoKeywords:
      Array.isArray(value.seoKeywords) && value.seoKeywords.length > 0
        ? value.seoKeywords.slice(0, 8).map(String)
        : fallback.seoKeywords,
  };
}

export async function generateDetailPageCopy({
  fileName,
  promptContext,
  stylePreset,
  brandName,
  targetAudience,
  fixedSellingPoints,
  existingCopy,
}: {
  fileName: string;
  promptContext: string;
  stylePreset?: string;
  brandName?: string;
  targetAudience?: string;
  fixedSellingPoints?: string;
  existingCopy?: string;
}): Promise<DetailPageCopy> {
  const config = readTextConfig();

  if (!config) {
    return fallbackDetailCopy(fileName);
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是资深电商详情页策划。请只返回 JSON，不要返回 Markdown。",
          },
          {
            role: "user",
            content: [
              `产品文件名：${fileName}`,
              `页面方向：${promptContext}`,
              `风格预设：${stylePreset || "高端极简"}`,
              `品牌名：${brandName || "未提供"}`,
              `目标人群：${targetAudience || "电商消费者"}`,
              `固定卖点：${fixedSellingPoints || "未提供"}`,
              `用户已编辑文案草稿：${existingCopy || "未提供"}`,
              "请生成详情页文案结构，JSON 字段必须包含 productName、headline、subheadline、sellingPoints、sections、seoKeywords。",
              "sellingPoints 是 4 到 6 个短卖点。",
              "sections 是 3 到 5 个模块，每个模块包含 heading 和 body。",
              "seoKeywords 是 4 到 8 个关键词。",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackDetailCopy(fileName);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackDetailCopy(fileName);
    }

    return normalizeDetailCopy(parseJsonObject(content), fileName);
  } catch {
    return fallbackDetailCopy(fileName);
  }
}
