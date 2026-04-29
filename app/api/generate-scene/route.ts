import { NextResponse } from "next/server";
import { generateProductImage, validateImageFile } from "@/lib/image-generation";

export const runtime = "nodejs";

function jsonError(error: string, status = 400, prompt?: string) {
  return NextResponse.json({ error, prompt }, { status });
}

function buildPrompt({
  outputSize,
  promptContext,
  stylePreset,
  styleKeywords,
  targetAudience,
  brandName,
  primaryColor,
  secondaryColor,
  fontStyle,
  brandTone,
  bannedWords,
  fixedSellingPoints,
  variantIndex,
  variantCount,
}: {
  outputSize: string;
  promptContext: string;
  stylePreset: string;
  styleKeywords: string;
  targetAudience: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  brandTone: string;
  bannedWords: string;
  fixedSellingPoints: string;
  variantIndex: string;
  variantCount: string;
}) {
  return [
    "Use the uploaded white-background product photo as the only product reference.",
    "请生成一张真实商业摄影风格的产品场景图。",
    "要求保留用户上传产品的外观、颜色、材质、Logo、文字和结构。",
    "将产品自然放置在符合产品用途的真实环境中。",
    "产品需要与环境光线、阴影、透视和接触关系自然融合。",
    "画面干净高级，商业广告质感，真实摄影风格。",
    `Style preset: ${stylePreset}. Style keywords: ${styleKeywords}.`,
    `Target audience: ${targetAudience}.`,
    `Brand guidelines: brand name ${brandName || "not provided"}, primary color ${primaryColor}, secondary color ${secondaryColor}, font style ${fontStyle}, brand tone ${brandTone}.`,
    `Fixed selling points: ${fixedSellingPoints || "not provided"}.`,
    `This is variant ${variantIndex} of ${variantCount}; create a meaningfully different scene while preserving product accuracy.`,
    promptContext,
    "Cinematic commercial product photography, realistic lighting, premium ecommerce campaign quality, natural shadows, high detail, clean composition.",
    `Requested visual ratio or size reference: ${outputSize}.`,
    `Strictly avoid: watermarks, unreadable text, malformed hands, extra products, changed product geometry, changed logo, low resolution, cartoon style${bannedWords ? `, ${bannedWords}` : ""}.`
  ].join("\n");
}

export async function POST(request: Request) {
  let prompt: string | undefined;

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const ratio = String(formData.get("ratio") ?? "4/5");
    const width = String(formData.get("width") ?? "1024");
    const height = String(formData.get("height") ?? "1280");
    const promptContext = String(formData.get("promptContext") ?? "");
    const stylePreset = String(formData.get("stylePreset") ?? "高端极简");
    const styleKeywords = String(formData.get("styleKeywords") ?? "");
    const targetAudience = String(formData.get("targetAudience") ?? "");
    const brandName = String(formData.get("brandName") ?? "");
    const primaryColor = String(formData.get("primaryColor") ?? "");
    const secondaryColor = String(formData.get("secondaryColor") ?? "");
    const fontStyle = String(formData.get("fontStyle") ?? "");
    const brandTone = String(formData.get("brandTone") ?? "");
    const bannedWords = String(formData.get("bannedWords") ?? "");
    const fixedSellingPoints = String(formData.get("fixedSellingPoints") ?? "");
    const variantIndex = String(formData.get("variantIndex") ?? "1");
    const variantCount = String(formData.get("variantCount") ?? "1");

    const validationError = validateImageFile(image);

    if (validationError) {
      return jsonError(validationError);
    }

    const outputSize =
      ratio === "custom" && width && height ? `${width}x${height}` : ratio;
    prompt = buildPrompt({
      outputSize,
      promptContext,
      stylePreset,
      styleKeywords,
      targetAudience,
      brandName,
      primaryColor,
      secondaryColor,
      fontStyle,
      brandTone,
      bannedWords,
      fixedSellingPoints,
      variantIndex,
      variantCount,
    });

    const imageUrl = await generateProductImage({
      image: image as File,
      ratio,
      width,
      height,
      prompt,
    });

    return NextResponse.json({
      prompt,
      imageUrl,
      source: "images-generations",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "生成失败，请稍后重试。",
      500,
      prompt
    );
  }
}
