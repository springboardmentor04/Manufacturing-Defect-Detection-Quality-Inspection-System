import { ScanLine } from "lucide-react";
import { Link } from "wouter";

export default function BrandMark({ inverse = false, interactive = true }) {
  const mark = <><span className="vi-brand-mark" aria-hidden="true"><ScanLine size={17} strokeWidth={2.2} /></span><span>VisionInspect <i>AI</i></span></>;

  if (!interactive) return <span className="vi-brand" aria-label="VisionInspect AI">{mark}</span>;
  return <Link className="vi-brand" href="/" aria-label="VisionInspect AI home">{mark}</Link>;
}
