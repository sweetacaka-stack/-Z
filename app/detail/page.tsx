import { ProductGenerator, type GeneratorConfig } from "@/components/product-generator";

const detailConfig: GeneratorConfig = {
  kind: "detail",
  icon: "detail",
  title: "一键生成详情页",
  navLabel: "一键生成详情页",
  description:
    "上传产品白底图，AI 将围绕产品卖点、视觉层级和电商详情页结构，生成适合商品展示的详情页长图。",
  helper:
    "适合电商详情页、落地页首屏、卖点展示图和广告转化素材，帮助快速产出完整商品视觉叙事。",
  buttonText: "生成详情页",
  apiEndpoint: "/api/generate-detail",
  promptContext:
    "请生成一张电商产品详情页长图。要求保留用户上传产品的外观、颜色、材质、Logo、文字和结构。画面需要包含清晰主视觉、核心卖点模块、细节展示区域、使用场景提示和高级商业排版。整体干净、真实、有转化感，适合商品详情页直接使用。",
  defaultRatio: "9/16",
  ratios: [
    { label: "4:5", value: "4/5", desc: "电商主图" },
    { label: "3:4", value: "3/4", desc: "详情首屏" },
    { label: "9:16", value: "9/16", desc: "详情长图" },
    { label: "1:1", value: "1/1", desc: "方形模块" },
    { label: "4:3", value: "4/3", desc: "横版模块" },
    { label: "16:9", value: "16/9", desc: "横版 Banner" },
  ],
};

export default function DetailPage() {
  return <ProductGenerator config={detailConfig} />;
}
