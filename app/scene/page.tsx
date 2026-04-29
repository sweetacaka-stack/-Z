import { ProductGenerator, type GeneratorConfig } from "@/components/product-generator";

const sceneConfig: GeneratorConfig = {
  kind: "scene",
  icon: "scene",
  title: "产品场景图生成",
  navLabel: "产品场景图",
  description:
    "上传产品白底图，AI 将自动识别产品主体，并融合到真实使用场景中。",
  helper: "适合首页主视觉、社媒内容、电商主图和广告投放素材。",
  buttonText: "生成产品场景图",
  apiEndpoint: "/api/generate-scene",
  promptContext:
    "请生成一张真实商业摄影风格的产品场景图。要求保留用户上传产品的外观、颜色、材质、Logo、文字和结构。将产品自然放置在符合产品用途的真实环境中。产品需要与环境光线、阴影、透视和接触关系自然融合。画面干净高级，商业广告质感，真实摄影风格。",
  defaultRatio: "4/5",
  ratios: [
    { label: "1:1", value: "1/1", desc: "社交媒体" },
    { label: "4:5", value: "4/5", desc: "电商主图" },
    { label: "3:4", value: "3/4", desc: "常规海报" },
    { label: "9:16", value: "9/16", desc: "手机竖图" },
    { label: "4:3", value: "4/3", desc: "横版海报" },
    { label: "16:9", value: "16/9", desc: "横版 Banner" },
  ],
};

export default function ScenePage() {
  return <ProductGenerator config={sceneConfig} />;
}
