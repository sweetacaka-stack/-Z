import { NextResponse } from "next/server";
import { generateDetailPageCopy } from "@/lib/detail-copy";
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
  detailCopy,
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
  detailCopy: string;
  variantIndex: string;
  variantCount: string;
}) {
  return [
    "Use the uploaded white-background product photo as the only product reference.",
    "Generate a premium ecommerce product detail page poster or long-form product detail visual.",
    "Preserve the exact product appearance, shape, structure, color, material, logo, readable text, packaging details, and proportions.",
    "Design a clean product detail page composition with a strong hero area, selling-point sections, close-up detail blocks, usage scenario cues, refined typography-like layout, realistic commercial lighting, and clear visual hierarchy.",
    `Style preset: ${stylePreset}. Style keywords: ${styleKeywords}.`,
    `Target audience: ${targetAudience}.`,
    `Brand guidelines: brand name ${brandName || "not provided"}, primary color ${primaryColor}, secondary color ${secondaryColor}, font style ${fontStyle}, brand tone ${brandTone}.`,
    `Fixed selling points: ${fixedSellingPoints || "not provided"}.`,
    `Editable detail page copy structure: ${detailCopy || "not provided"}.`,
    `This is variant ${variantIndex} of ${variantCount}; create a meaningfully different composition while preserving the same strategy.`,
    promptContext,
    "The final image should feel like a finished ecommerce detail page creative, ready for product presentation and conversion-focused marketing.",
    `Requested visual ratio or size reference: ${outputSize}.`,
    `Strictly avoid: watermarks, unreadable text, malformed product geometry, extra products, changed logo, low resolution, cluttered layout, cartoon style${bannedWords ? `, ${bannedWords}` : ""}.`,
  ].join("\n");
}

export async function POST(request: Request) {
  let prompt: string | undefined;

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const ratio = String(formData.get("ratio") ?? "9/16");
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
    const detailCopy = String(formData.get("detailCopy") ?? "");
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
      detailCopy,
      variantIndex,
      variantCount,
    });
    const detailPage = await generateDetailPageCopy({
      fileName: (image as File).name,
      promptContext,
      stylePreset,
      brandName,
      targetAudience,
      fixedSellingPoints,
      existingCopy: detailCopy,
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
      detailPage,
      source: "images-generations",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "生成失败，请稍后重试。",
      500,
      prompt,
    );
  }
}
