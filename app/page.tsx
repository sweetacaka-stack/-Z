import { ProductGenerator, type GeneratorConfig } from "@/components/product-generator";

const modelConfig: GeneratorConfig = {
  kind: "model",
  icon: "model",
  title: "模特手持图生成",
  navLabel: "模特手持图",
  description:
    "上传产品白底图，AI 将自动识别产品并将其自然地握在模特手中，生成真实感极强的手持展示图。",
  helper: "适合口红、瓶罐、小家电、饰品、包装盒等需要展示手持尺度感的产品。",
  buttonText: "生成模特手持图",
  apiEndpoint: "/api/generate-prompt",
  promptContext:
    "请生成一张真实商业摄影风格的模特手持产品图。要求保留产品真实细节，模特手部动作自然可信，光影和谐，产品不能变形。",
  defaultRatio: "4/5",
  ratios: [
    { label: "1:1", value: "1/1", desc: "社交媒体" },
    { label: "4:5", value: "4/5", desc: "电商主图" },
    { label: "3:4", value: "3/4", desc: "常规海报" },
    { label: "4:3", value: "4/3", desc: "横版海报" },
    { label: "16:9", value: "16/9", desc: "横版 Banner" },
  ],
};

export default function Home() {
  return <ProductGenerator config={modelConfig} />;
}
