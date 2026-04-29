"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Download,
  History,
  Image as ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Upload,
} from "lucide-react";

export type RatioOption = {
  label: string;
  value: string;
  desc: string;
};

export type GeneratorConfig = {
  kind: "model" | "scene" | "detail";
  icon: "model" | "scene" | "detail";
  title: string;
  navLabel: string;
  description: string;
  helper: string;
  buttonText: string;
  apiEndpoint: string;
  promptContext: string;
  defaultRatio: string;
  ratios: RatioOption[];
};

type DetailPageSection = {
  heading: string;
  body: string;
};

type DetailPageCopy = {
  productName: string;
  headline: string;
  subheadline: string;
  sellingPoints: string[];
  sections: DetailPageSection[];
  seoKeywords: string[];
};

type GenerateResponse = {
  prompt?: string;
  imageUrl?: string;
  detailPage?: DetailPageCopy;
  source?: "images-generations";
  error?: string;
};

type StylePreset = {
  label: string;
  value: string;
  keywords: string;
};

type BrandGuidelines = {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  brandTone: string;
  bannedWords: string;
  fixedSellingPoints: string;
};

type ExportSpec = {
  label: string;
  width: number;
  height: number;
};

type GenerationVariant = {
  id: string;
  imageUrl: string;
  prompt?: string;
  detailPage?: DetailPageCopy;
};

type HistoryItem = {
  id: string;
  kind: GeneratorConfig["kind"];
  title: string;
  sourceImage?: string | null;
  resultImage: string;
  detailPage?: DetailPageCopy | null;
  createdAt: string;
  styleLabel: string;
  sizeLabel: string;
};

const stylePresets: StylePreset[] = [
  { label: "高端极简", value: "minimal", keywords: "premium minimal, clean layout, restrained color, elegant whitespace" },
  { label: "小红书种草", value: "xiaohongshu", keywords: "social commerce, lifestyle sharing, warm editorial, eye-catching notes" },
  { label: "淘宝详情页", value: "taobao", keywords: "conversion-focused ecommerce, dense selling points, clear product modules" },
  { label: "科技感", value: "tech", keywords: "futuristic, cool lighting, precision, sleek interface-like layout" },
  { label: "奢侈品", value: "luxury", keywords: "luxury campaign, refined materials, premium mood, sophisticated lighting" },
  { label: "家居生活", value: "home", keywords: "home lifestyle, soft daylight, warm practical scene, natural comfort" },
  { label: "美妆护肤", value: "beauty", keywords: "beauty product photography, clean skin-care mood, soft glow, delicate details" },
  { label: "食品饮料", value: "food", keywords: "fresh food and beverage commercial photo, appetizing, vibrant, clean packaging" },
];

const exportSpecs: ExportSpec[] = [
  { label: "淘宝主图", width: 800, height: 800 },
  { label: "京东主图", width: 800, height: 800 },
  { label: "抖音竖图", width: 1080, height: 1920 },
  { label: "小红书封面", width: 1242, height: 1660 },
  { label: "详情页长图", width: 1080, height: 1920 },
  { label: "朋友圈广告图", width: 1080, height: 1080 },
];

const progressMessages = [
  "正在分析产品主体特征...",
  "正在匹配商业视觉风格...",
  "正在融合品牌规范与页面结构...",
  "正在生成高清成片...",
];

const defaultDetailPage: DetailPageCopy = {
  productName: "",
  headline: "",
  subheadline: "",
  sellingPoints: ["真实质感", "清晰卖点", "场景展示", "细节呈现"],
  sections: [
    { heading: "核心卖点", body: "提炼产品的关键优势，适合作为详情页首屏说明。" },
    { heading: "细节展示", body: "展示材质、工艺、包装和结构细节，增强用户信任。" },
    { heading: "使用场景", body: "描述产品在真实生活或商业场景中的使用价值。" },
  ],
  seoKeywords: ["产品详情页", "电商详情", "商品卖点", "AI 生成"],
};

const defaultBrandGuidelines: BrandGuidelines = {
  brandName: "",
  primaryColor: "#ffffff",
  secondaryColor: "#bc9a78",
  fontStyle: "现代简洁",
  brandTone: "高级、可信、干净",
  bannedWords: "",
  fixedSellingPoints: "",
};

const iconMap = {
  model: ImageIcon,
  scene: Camera,
  detail: ImageIcon,
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitLines(value: string) {
  return value
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function safeParseHistory(value: string | null): HistoryItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ProductGenerator({ config }: { config: GeneratorConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState<DetailPageCopy>(defaultDetailPage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState(config.defaultRatio);
  const [customWidth, setCustomWidth] = useState("1024");
  const [customHeight, setCustomHeight] = useState("1280");
  const [selectedStyle, setSelectedStyle] = useState(stylePresets[0]);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines>(defaultBrandGuidelines);
  const [targetAudience, setTargetAudience] = useState("注重品质和效率的电商消费者");
  const [variantCount, setVariantCount] = useState(1);
  const [variants, setVariants] = useState<GenerationVariant[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const ActiveIcon = iconMap[config.icon];
  const isDetailMode = config.kind === "detail";

  useEffect(() => {
    setSelectedRatio(config.defaultRatio);
    setResultImage(null);
    setGeneratedPrompt(null);
    setVariants([]);
    setErrorMessage(null);
  }, [config.defaultRatio, config.kind]);

  useEffect(() => {
    setHistoryItems(safeParseHistory(window.localStorage.getItem("auragen-history")));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const outputRatio = useMemo(() => {
    if (selectedRatio === "custom" && customWidth && customHeight) {
      return `${customWidth}/${customHeight}`;
    }

    return selectedRatio !== "custom" ? selectedRatio : "1/1";
  }, [customHeight, customWidth, selectedRatio]);

  const sizeLabel = selectedRatio === "custom" ? `${customWidth}x${customHeight}` : selectedRatio;

  const promptPreview = useMemo(
    () => ({
      direction: config.title,
      ratio: sizeLabel,
      structure: isDetailMode
        ? detailPage.sections.map((section) => section.heading).join(" / ")
        : "产品主体识别 / 商业摄影构图 / 场景融合 / 高清成片",
      style: selectedStyle.keywords,
      avoid: [
        "水印",
        "低清晰度",
        "产品变形",
        "Logo 错误",
        brandGuidelines.bannedWords || "无额外禁用词",
      ].join(" / "),
    }),
    [brandGuidelines.bannedWords, config.title, detailPage.sections, isDetailMode, selectedStyle.keywords, sizeLabel],
  );

  const updateHistory = (item: HistoryItem) => {
    const next = [item, ...historyItems.filter((entry) => entry.id !== item.id)].slice(0, 12);
    setHistoryItems(next);
    window.localStorage.setItem("auragen-history", JSON.stringify(next));
  };

  const updateBrand = (key: keyof BrandGuidelines, value: string) => {
    setBrandGuidelines((current) => ({ ...current, [key]: value }));
  };

  const updateDetailSection = (index: number, key: keyof DetailPageSection, value: string) => {
    setDetailPage((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section,
      ),
    }));
  };

  const applyExportSpec = (spec: ExportSpec) => {
    setSelectedRatio("custom");
    setCustomWidth(String(spec.width));
    setCustomHeight(String(spec.height));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setErrorMessage("请上传 JPG、PNG、WEBP 等图片文件。");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("图片不能超过 10MB。");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setSourceDataUrl(await fileToDataUrl(selectedFile));
    setResultImage(null);
    setGeneratedPrompt(null);
    setVariants([]);
    setErrorMessage(null);
  };

  const downloadImage = (imageUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = fileName;
    link.click();
  };

  const handleDownload = () => {
    if (!resultImage) {
      return;
    }

    downloadImage(resultImage, `auragen-${config.kind}-${Date.now()}.png`);
  };

  const handleExportSpec = async (spec: ExportSpec) => {
    if (!resultImage) {
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.fillStyle = "#0a0908";
      context.fillRect(0, 0, spec.width, spec.height);

      const scale = Math.max(spec.width / image.width, spec.height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const x = (spec.width - drawWidth) / 2;
      const y = (spec.height - drawHeight) / 2;

      context.drawImage(image, x, y, drawWidth, drawHeight);
      downloadImage(canvas.toDataURL("image/png"), `auragen-${spec.label}-${Date.now()}.png`);
    };
    image.src = resultImage;
  };

  const buildFormData = (variantIndex: number) => {
    if (!file) {
      return null;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("ratio", selectedRatio);
    formData.append("width", customWidth);
    formData.append("height", customHeight);
    formData.append("promptContext", config.promptContext);
    formData.append("stylePreset", selectedStyle.label);
    formData.append("styleKeywords", selectedStyle.keywords);
    formData.append("targetAudience", targetAudience);
    formData.append("brandName", brandGuidelines.brandName);
    formData.append("primaryColor", brandGuidelines.primaryColor);
    formData.append("secondaryColor", brandGuidelines.secondaryColor);
    formData.append("fontStyle", brandGuidelines.fontStyle);
    formData.append("brandTone", brandGuidelines.brandTone);
    formData.append("bannedWords", brandGuidelines.bannedWords);
    formData.append("fixedSellingPoints", brandGuidelines.fixedSellingPoints);
    formData.append("detailCopy", JSON.stringify(detailPage));
    formData.append("variantIndex", String(variantIndex + 1));
    formData.append("variantCount", String(variantCount));

    return formData;
  };

  const handleGenerate = async () => {
    if (!file) {
      setErrorMessage("请先上传一张产品白底图。");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setGeneratedPrompt(null);
    setVariants([]);
    setErrorMessage(null);

    try {
      const nextVariants: GenerationVariant[] = [];

      for (let index = 0; index < variantCount; index += 1) {
        const formData = buildFormData(index);

        if (!formData) {
          return;
        }

        const response = await fetch(config.apiEndpoint, {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as GenerateResponse;

        if (!response.ok || data.error) {
          setGeneratedPrompt(data.prompt ?? null);
          throw new Error(data.error ?? "生成失败，请稍后重试。");
        }

        if (!data.imageUrl) {
          setGeneratedPrompt(data.prompt ?? null);
          throw new Error("接口没有返回可展示的图片。");
        }

        nextVariants.push({
          id: `${Date.now()}-${index}`,
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          detailPage: data.detailPage,
        });
      }

      const primary = nextVariants[0];
      setVariants(nextVariants);
      setResultImage(primary.imageUrl);
      setGeneratedPrompt(primary.prompt ?? null);

      if (isDetailMode && primary.detailPage) {
        setDetailPage(primary.detailPage);
      }

      updateHistory({
        id: String(Date.now()),
        kind: config.kind,
        title: config.title,
        sourceImage: sourceDataUrl,
        resultImage: primary.imageUrl,
        detailPage: primary.detailPage ?? (isDetailMode ? detailPage : null),
        createdAt: new Date().toLocaleString("zh-CN"),
        styleLabel: selectedStyle.label,
        sizeLabel,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const restoreHistory = (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setResultImage(item.resultImage);
    setDetailPage(item.detailPage ?? detailPage);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0908] font-sans text-white selection:bg-white/20">
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat opacity-80"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#0a0908]/35" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute right-0 top-1/4 h-[800px] w-[800px] -translate-y-1/4 translate-x-1/3 rounded-full border border-white/[0.03]" />
        <div className="absolute right-0 top-1/4 h-[1200px] w-[1200px] -translate-y-1/4 translate-x-1/4 rounded-full border border-white/[0.02]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#bc9a78]/10 to-transparent blur-[150px]" />
      </div>

      <nav className="relative z-10 flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-12 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-10">
          <div className="text-xl font-medium tracking-tight">
            Aura<span className="text-white/40">Gen</span>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-medium text-white/55">
            {[
              { href: "/", label: "模特手持图", kind: "model" },
              { href: "/scene", label: "产品场景图", kind: "scene" },
              { href: "/detail", label: "一键生成详情页", kind: "detail" },
            ].map((item) => (
              <Link
                key={item.kind}
                href={item.href}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 transition-all ${
                  config.kind === item.kind
                    ? "border-white/30 bg-white text-black"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <button className="hidden items-center gap-2 text-sm text-white/70 transition-colors hover:text-white md:flex">
          登录 <ArrowRight size={16} />
        </button>
      </nav>

      <main className="relative z-10 grid min-h-[calc(100vh-88px)] grid-cols-1 gap-8 px-6 pb-12 md:px-12 lg:grid-cols-12">
        <div className="flex flex-col pb-8 pt-8 lg:col-span-5 lg:pr-8">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md">
            <ActiveIcon size={20} className="text-white/80" />
          </div>
          <h1 className="mb-6 text-5xl font-light leading-[1.1] tracking-tight md:text-6xl lg:text-[64px]">
            {config.title}
            <br />
            一键生成
          </h1>
          <p className="mb-4 max-w-md text-sm font-light leading-relaxed text-white/65 md:text-base">
            {config.description}
          </p>
          <p className="mb-8 max-w-md text-xs leading-relaxed text-white/45">
            {config.helper}
          </p>

          <div className="max-w-md space-y-6">
            <div className="group relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
              />
              <label
                htmlFor="file-upload"
                className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 ${
                  previewUrl
                    ? "border-white/20 bg-white/[0.05]"
                    : "hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {previewUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="上传产品预览" className="h-full object-contain drop-shadow-2xl" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
                        更换图片
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-5 w-5 text-white/40 transition-colors group-hover:text-white/70" />
                    <span className="text-xs text-white/45 group-hover:text-white/65">
                      点击上传产品白底图
                    </span>
                    <span className="mt-1 text-[10px] text-white/30">支持 JPG、PNG、WEBP，最大 10MB</span>
                  </>
                )}
              </label>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/45">
                <Palette size={12} />
                <span>风格预设</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stylePresets.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setSelectedStyle(style)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      selectedStyle.value === style.value
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">品牌规范</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={brandGuidelines.brandName}
                  onChange={(event) => updateBrand("brandName", event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="品牌名"
                />
                <input
                  value={targetAudience}
                  onChange={(event) => setTargetAudience(event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="目标人群"
                />
                <input
                  type="color"
                  value={brandGuidelines.primaryColor}
                  onChange={(event) => updateBrand("primaryColor", event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.02] p-1"
                  title="主色"
                />
                <input
                  type="color"
                  value={brandGuidelines.secondaryColor}
                  onChange={(event) => updateBrand("secondaryColor", event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.02] p-1"
                  title="辅色"
                />
                <input
                  value={brandGuidelines.fontStyle}
                  onChange={(event) => updateBrand("fontStyle", event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="字体风格"
                />
                <input
                  value={brandGuidelines.brandTone}
                  onChange={(event) => updateBrand("brandTone", event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="品牌调性"
                />
              </div>
              <textarea
                value={brandGuidelines.fixedSellingPoints}
                onChange={(event) => updateBrand("fixedSellingPoints", event.target.value)}
                className="min-h-16 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-white/40"
                placeholder="固定卖点，每行一个"
              />
              <input
                value={brandGuidelines.bannedWords}
                onChange={(event) => updateBrand("bannedWords", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                placeholder="禁用词，用逗号分隔"
              />
            </section>

            {isDetailMode ? (
              <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">文案可编辑</div>
                <input
                  value={detailPage.productName}
                  onChange={(event) => setDetailPage((current) => ({ ...current, productName: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="商品标题"
                />
                <input
                  value={detailPage.headline}
                  onChange={(event) => setDetailPage((current) => ({ ...current, headline: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  placeholder="详情页主标题"
                />
                <textarea
                  value={joinLines(detailPage.sellingPoints)}
                  onChange={(event) =>
                    setDetailPage((current) => ({ ...current, sellingPoints: splitLines(event.target.value) }))
                  }
                  className="min-h-20 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-white/40"
                  placeholder="核心卖点，每行一个"
                />
                {detailPage.sections.map((section, index) => (
                  <div key={index} className="grid gap-2">
                    <input
                      value={section.heading}
                      onChange={(event) => updateDetailSection(index, "heading", event.target.value)}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                      placeholder="详情模块标题"
                    />
                    <textarea
                      value={section.body}
                      onChange={(event) => updateDetailSection(index, "body", event.target.value)}
                      className="min-h-16 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-white/40"
                      placeholder="详情模块内容"
                    />
                  </div>
                ))}
                <textarea
                  value={joinLines(detailPage.seoKeywords)}
                  onChange={(event) =>
                    setDetailPage((current) => ({ ...current, seoKeywords: splitLines(event.target.value) }))
                  }
                  className="min-h-16 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-white/40"
                  placeholder="SEO 关键词，每行一个"
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">尺寸与导出规格</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {config.ratios.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    title={ratio.desc}
                    disabled={isGenerating}
                    onClick={() => setSelectedRatio(ratio.value)}
                    className={`rounded-lg border py-2 text-xs transition-all ${
                      selectedRatio === ratio.value
                        ? "border-white bg-white font-medium text-black"
                        : "border-white/10 bg-transparent text-white/55 hover:border-white/30 hover:bg-white/[0.02]"
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {exportSpecs.map((spec) => (
                  <button
                    key={spec.label}
                    type="button"
                    onClick={() => applyExportSpec(spec)}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    {spec.label} <span className="text-white/35">{spec.width}x{spec.height}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <input
                  type="number"
                  value={customWidth}
                  min="256"
                  max="4096"
                  onChange={(event) => {
                    setCustomWidth(event.target.value);
                    setSelectedRatio("custom");
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  placeholder="宽度"
                />
                <input
                  type="number"
                  value={customHeight}
                  min="256"
                  max="4096"
                  onChange={(event) => {
                    setCustomHeight(event.target.value);
                    setSelectedRatio("custom");
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  placeholder="高度"
                />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[10px] uppercase tracking-[0.15em] text-white/45">本次生成策略</div>
              <div className="space-y-2 text-xs leading-relaxed text-white/60">
                <p>生成方向：{promptPreview.direction}</p>
                <p>画面比例：{promptPreview.ratio}</p>
                <p>详情结构：{promptPreview.structure}</p>
                <p>风格关键词：{promptPreview.style}</p>
                <p>避免项：{promptPreview.avoid}</p>
              </div>
            </section>

            <div className="flex items-center gap-3">
              <select
                value={variantCount}
                onChange={(event) => setVariantCount(Number(event.target.value))}
                className="h-12 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs text-white outline-none"
                disabled={isGenerating}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count} className="bg-[#111]">
                    {count} 个版本
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!file || isGenerating}
                className={`group relative flex h-12 min-w-48 flex-1 items-center justify-center gap-3 rounded-full px-6 text-sm font-medium transition-all duration-300 ${
                  !file || isGenerating
                    ? "cursor-not-allowed bg-white/10 text-white/35"
                    : "bg-white text-black hover:scale-[1.02] hover:bg-white/90"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>{config.buttonText}</span>
                    <Sparkles className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
                  </>
                )}
              </button>
            </div>

            {errorMessage ? (
              <p className="max-w-md rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-100/90">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-col gap-6 py-8 lg:col-span-7">
          <div
            className="relative mx-auto max-h-[72vh] w-full max-w-[640px] overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              aspectRatio: outputRatio,
              boxShadow: resultImage ? "0 0 80px -20px rgba(188,154,120,0.15)" : "none",
            }}
          >
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                <div className="relative mb-6 h-16 w-16">
                  <div className="absolute inset-0 animate-[spin_2s_linear_infinite] rounded-full border-l-2 border-t-2 border-white/20" />
                  <div className="absolute inset-2 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-b-2 border-r-2 border-white/40" />
                  <Sparkles className="absolute inset-0 m-auto h-5 w-5 animate-pulse text-white/50" />
                </div>
                <div className="animate-pulse text-xs uppercase tracking-[0.2em] text-white/45">
                  {progressMessages[progressIndex]}
                </div>
              </div>
            ) : resultImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="生成结果图" className="h-full w-full animate-[fadeIn_1s_ease-out] object-cover" />
                <button
                  type="button"
                  onClick={handleDownload}
                  className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs text-white/80 backdrop-blur-md transition-colors hover:bg-black/75 hover:text-white"
                >
                  <Download size={14} />
                  下载
                </button>
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-green-300/15 bg-green-500/10 px-3 py-2 text-xs text-green-100/90 backdrop-blur-md">
                  <CheckCircle2 size={14} />
                  生成成功
                </div>
                <div className="absolute bottom-4 right-4 rounded-md border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-[10px] tracking-wider text-white/70 backdrop-blur-md">
                  RAW {sizeLabel}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] text-white/10">
                <Camera size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <p className="text-[10px] uppercase tracking-[0.15em]">等待上传</p>
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>
            )}
          </div>

          {variants.length > 1 ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[10px] uppercase tracking-[0.15em] text-white/45">多版本对比</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {variants.map((variant, index) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setResultImage(variant.imageUrl);
                      setGeneratedPrompt(variant.prompt ?? null);
                      if (variant.detailPage) {
                        setDetailPage(variant.detailPage);
                      }
                    }}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left transition hover:border-white/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={variant.imageUrl} alt={`版本 ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                    <div className="p-2 text-xs text-white/60">版本 {index + 1}</div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {isDetailMode && resultImage ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-3 text-[10px] uppercase tracking-[0.15em] text-white/45">详情页文案结构</div>
              <h2 className="text-2xl font-light text-white">{detailPage.headline || detailPage.productName || "详情页标题"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{detailPage.subheadline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {detailPage.sellingPoints.map((point) => (
                  <span key={point} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70">
                    {point}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {detailPage.sections.map((section) => (
                  <div key={section.heading} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm text-white">{section.heading}</div>
                    <p className="mt-2 text-xs leading-relaxed text-white/55">{section.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {detailPage.seoKeywords.map((keyword) => (
                  <span key={keyword} className="text-xs text-white/40">#{keyword}</span>
                ))}
              </div>
            </section>
          ) : null}

          {resultImage ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[10px] uppercase tracking-[0.15em] text-white/45">一键导出规格</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {exportSpecs.map((spec) => (
                  <button
                    key={spec.label}
                    type="button"
                    onClick={() => handleExportSpec(spec)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-white/65 transition hover:border-white/30 hover:text-white"
                  >
                    {spec.label}
                    <span className="block text-[10px] text-white/35">{spec.width}x{spec.height}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {generatedPrompt ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-white/60">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/40">
                <Sparkles size={12} />
                <span>本次提示词</span>
              </div>
              <p className="line-clamp-6">{generatedPrompt}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/45">
              <History size={12} />
              <span>历史记录 / 作品库</span>
            </div>
            {historyItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {historyItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => restoreHistory(item)}
                    className={`overflow-hidden rounded-xl border bg-black/20 text-left transition hover:border-white/40 ${
                      activeHistoryId === item.id ? "border-white/60" : "border-white/10"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.resultImage} alt={item.title} className="aspect-square w-full object-cover" />
                    <div className="space-y-1 p-2">
                      <div className="truncate text-xs text-white/70">{item.title}</div>
                      <div className="truncate text-[10px] text-white/35">
                        {item.styleLabel} / {item.sizeLabel}
                      </div>
                      <div className="truncate text-[10px] text-white/30">{item.createdAt}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/35">生成后会自动保存到这里，方便回看和对比。</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
