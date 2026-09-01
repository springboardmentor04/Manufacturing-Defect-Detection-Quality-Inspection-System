import { ArrowRight, CheckCircle2, ClipboardCheck, Eye, Mail, ScanSearch, Send, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";
import { LOGIN_PATH, validateDemoRequest } from "@/lib/localAuth";
import { hasScrolledPastHeader } from "@/lib/navState";

const steps = [
  { no: "01", icon: Upload, title: "Acquire evidence", copy: "Bring product images into one review-ready inspection flow." },
  { no: "02", icon: ScanSearch, title: "Inspect precisely", copy: "Pair localization with pixel-level evidence for clearer review." },
  { no: "03", icon: ClipboardCheck, title: "Decide with context", copy: "Surface severity, confidence, and the next quality action." },
  { no: "04", icon: Sparkles, title: "Learn from patterns", copy: "Turn completed inspections into operational quality signals." },
];

const industries = [
  { title: "Pharmaceutical", before: "/manus-storage/pharmaceutical-before_1646e547.png", after: "/manus-storage/pharmaceutical-after_fa707b21.png" },
  { title: "Electronics", before: "/manus-storage/electronics-before_717e124b.png", after: "/manus-storage/electronics-after_33ab70a2.png" },
  { title: "Textile", before: "/manus-storage/textile-before_99dc5bc2.png", after: "/manus-storage/textile-after_dae40aec.png" },
  { title: "Leather Goods", before: "/manus-storage/leather-before_07480f8c.png", after: "/manus-storage/leather-after_f1b74a97.png" },
  { title: "Metal Parts", before: "/manus-storage/metal-before_37219338.png", after: "/manus-storage/metal-after_a565a179.png" },
  { title: "Wood Finish", before: "/manus-storage/wood-before_d90dde58.png", after: "/manus-storage/wood-after_49890bc4.png" },
  { title: "Grid", before: "/manus-storage/grid-before_24fedfc7.png", after: "/manus-storage/grid-after_4e7e34b3.png" },
  { title: "Cable Wire", before: "/manus-storage/cable-before_889f8dc6.png", after: "/manus-storage/cable-after_55b4f968.png" },
];

const platformStages = [
  { no: "01", label: "Ground truth", title: "Annotation", copy: "Turn inspection images into consistent review examples with focused defect context.", icon: Upload, art: "annotation" },
  { no: "02", label: "Pixel-level insight", title: "Segmentation", copy: "Use your U-Net model to isolate defect regions and surface-level variation.", icon: ScanSearch, art: "segmentation" },
  { no: "03", label: "Bounding-box insight", title: "Detection", copy: "Use YOLO output to locate, categorize, and review visible defects with context.", icon: Eye, art: "detection" },
  { no: "04", label: "Review ready", title: "Deployment", copy: "Bring validated inspection results into a clear review flow for decisions.", icon: ArrowRight, art: "deployment" },
];

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: "", company: "", email: "", phone: "", inspection: "" });
  const [requestErrors, setRequestErrors] = useState({});
  const [requestState, setRequestState] = useState("idle");
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    const updateNavigation = () => setIsScrolled(hasScrolledPastHeader(window.scrollY));
    updateNavigation();
    window.addEventListener("scroll", updateNavigation, { passive: true });
    return () => window.removeEventListener("scroll", updateNavigation);
  }, []);

  const submitLocalRequest = (event) => {
    event.preventDefault();
    const { errors } = validateDemoRequest(requestForm);
    setRequestErrors(errors);
    if (Object.keys(errors).length) {
      setRequestState("error");
      setRequestMessage("Complete the highlighted fields to request your demonstration.");
      return;
    }
    setRequestState("success");
    setRequestMessage("Demonstration request recorded. We will use these details to shape the next project step.");
  };

  const updateRequest = (field) => (event) => {
    setRequestForm((current) => ({ ...current, [field]: event.target.value }));
    if (requestErrors[field]) setRequestErrors((current) => ({ ...current, [field]: "" }));
    if (requestState !== "idle") { setRequestState("idle"); setRequestMessage(""); }
  };

  return (
    <main className="vi-page vi-dot">
      <div className={`vi-nav-shell ${isScrolled ? "is-scrolled" : ""}`}>
        <header className="vi-wrap vi-nav">
          <BrandMark />
          <nav className="vi-nav-links" aria-label="Landing navigation">
            <a className="vi-nav-link" href="#workflow">Workflow</a>
            <a className="vi-nav-link" href="#industries">Industries</a>
            <a className="vi-nav-link" href="#platform">Platform</a>
            <a className="vi-nav-link" href="#request-demo">Request a demo</a>
          </nav>
          <Link className="vi-btn vi-btn-dark" href={LOGIN_PATH}>Sign in <ArrowRight className="vi-arrow" /></Link>
        </header>
      </div>

      <section className="vi-wrap vi-hero" aria-labelledby="hero-title">
        <div className="vi-hero-grid">
          <div>
            <p className="vi-eyebrow vi-mono">Manufacturing quality intelligence</p>
            <h1 id="hero-title" className="vi-title">Inspection that puts <em>evidence</em> first.</h1>
            <p className="vi-copy">VisionInspect AI gives quality teams one calm, explainable workspace for reviewing images, locating defects, and guiding the next manufacturing decision.</p>
            <div className="vi-actions">
              <Link className="vi-btn vi-btn-main" href={LOGIN_PATH}>Start a secure review <ArrowRight className="vi-arrow" /></Link>
              <Link className="vi-btn vi-btn-ghost" href={LOGIN_PATH}>Enter VisionInspect <Eye className="vi-arrow" /></Link>
            </div>
            <div className="vi-proof" aria-label="Product capabilities">
              <div className="vi-proof-stack" aria-hidden="true"><span className="vi-proof-dot" /><span className="vi-proof-dot" /><span className="vi-proof-dot" /></div>
              <p><strong>One inspection surface.</strong><br />Detection, segmentation, decision context.</p>
            </div>
          </div>

          <div className="vi-visual" aria-label="Quality engineer reviewing a machined component in a manufacturing inspection lab">
            <div className="vi-image-frame">
              <div className="vi-image-top">
                <span className="vi-image-title"><ScanSearch size={15} aria-hidden="true" /> Inspection review surface</span>
                <span className="vi-live vi-mono">ready</span>
              </div>
              <img className="vi-image vi-hero-image" src="/landing-hero.png" alt="Quality engineer reviewing a machined metal component in a bright manufacturing inspection lab." />
            </div>
            <div className="vi-floating vi-float-a">
              <span className="vi-label">Review mode</span>
              <span className="vi-float-row"><span className="vi-float-mark" /> Image-led inspection</span>
            </div>
            <div className="vi-floating vi-float-b">
              <span className="vi-label">Inspection state</span>
              <span className="vi-float-row"><span className="vi-float-mark ok" /> Human review ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="vi-stat-band" aria-label="VisionInspect product principles">
        <div className="vi-wrap vi-stat-grid">
          <p className="vi-stat-intro"><span className="vi-mono">Designed for clarity</span><br />A compact quality system for image-led manufacturing reviews.</p>
          <div className="vi-stat"><b>YOLO</b><span>bounding-box evidence</span></div>
          <div className="vi-stat"><b>U-Net</b><span>pixel-level context</span></div>
          <div className="vi-stat"><b>Human</b><span>final decision owner</span></div>
        </div>
      </section>

      <section id="workflow" className="vi-wrap vi-section" aria-labelledby="workflow-title">
        <div className="vi-section-head">
          <div><p className="vi-eyebrow vi-mono">Inspection workflow</p><h2 id="workflow-title" className="vi-h2">From visual signal to an accountable quality decision.</h2></div>
          <p className="vi-head-copy">The product stays visual at every stage: image evidence remains central while system labels explain what needs attention.</p>
        </div>
        <div className="vi-steps">
          {steps.map(({ no, icon: Icon, title, copy }) => <article className="vi-step" key={no}><span className="vi-step-no">{no}</span><span className="vi-step-icon"><Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section id="industries" className="vi-wrap vi-industries" aria-labelledby="industries-title">
        <div className="vi-section-head">
          <div><p className="vi-eyebrow vi-mono">Supported industries</p><h2 id="industries-title" className="vi-h2">One inspection language. Many production surfaces.</h2></div>
          <p className="vi-head-copy">These are real before-and-after image frames, not a static screenshot. Send the inspection pairs when ready, and each slot will be populated with your project imagery.</p>
        </div>
        <div className="vi-industries-grid" aria-label="Supported industry before and after image slots">
          {industries.map((industry) => (
            <article className="vi-ind-card" key={industry.title} tabIndex="0" aria-label={`${industry.title}: hover or focus to reveal the after inspection image`}>
              <div className="vi-ind-frames">
                <img className="vi-ind-image vi-ind-before" src={industry.before} alt={`${industry.title} before inspection`} />
                <img className="vi-ind-image vi-ind-after" src={industry.after} alt={`${industry.title} after inspection`} />
                <span className="vi-ind-tag vi-ind-tag-before">Before</span>
                <span className="vi-ind-tag vi-ind-tag-after">After</span>
                <span className="vi-ind-reveal">Hover to reveal result</span>
              </div>
              <div className="vi-ind-meta"><h3>{industry.title}</h3></div>
            </article>
          ))}
        </div>
        <p className="vi-ind-note"><span /> Hover a card to compare the supplied inspection source and result image.</p>
      </section>

      <section id="platform" className="vi-wrap vi-platform" aria-labelledby="platform-title">
        <div className="vi-platform-heading">
          <p className="vi-eyebrow vi-mono">Platform</p>
          <h2 id="platform-title" className="vi-h2">One connected pipeline for <em>visual quality control.</em></h2>
          <p>VisionInspect connects image preparation, pixel-level segmentation, object detection, and a review-ready result flow in one deliberate inspection workspace.</p>
        </div>
        <div className="vi-platform-grid">
          {platformStages.map(({ no, label, title, copy, icon: Icon, art }) => (
            <article className="vi-platform-card" key={title}>
              <div className={`vi-platform-art ${art}`} aria-hidden="true">
                <span className="vi-platform-line vi-line-a" /><span className="vi-platform-line vi-line-b" /><span className="vi-platform-node vi-node-a" /><span className="vi-platform-node vi-node-b" /><Icon className="vi-platform-icon" size={29} strokeWidth={1.7} />
              </div>
              <div className="vi-platform-copy"><span>{no} · {label}</span><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="request-demo" className="vi-wrap vi-request" aria-labelledby="request-title">
        <div className="vi-request-card">
          <span className="vi-request-icon" aria-hidden="true"><Mail size={25} /></span>
          <p className="vi-request-kicker vi-mono">Demonstration access</p>
          <h2 id="request-title">Put your own inspection images <em>into focus.</em></h2>
          <p>Tell us about the product surface or defect context you want to review. This guided enquiry helps frame the right inspection conversation.</p>
          <form className="vi-request-form" noValidate onSubmit={submitLocalRequest}>
            <div className="vi-request-field"><label htmlFor="request-name">Name</label><input id="request-name" className={requestErrors.name ? "err" : ""} value={requestForm.name} onChange={updateRequest("name")} placeholder="Your name" aria-invalid={Boolean(requestErrors.name)} />{requestErrors.name && <span>{requestErrors.name}</span>}</div>
            <div className="vi-request-field"><label htmlFor="request-company">Company</label><input id="request-company" className={requestErrors.company ? "err" : ""} value={requestForm.company} onChange={updateRequest("company")} placeholder="Company name" aria-invalid={Boolean(requestErrors.company)} />{requestErrors.company && <span>{requestErrors.company}</span>}</div>
            <div className="vi-request-field"><label htmlFor="request-email">Work email</label><div className="vi-request-email"><Mail size={16} aria-hidden="true" /><input id="request-email" className={requestErrors.email ? "err" : ""} type="email" value={requestForm.email} onChange={updateRequest("email")} placeholder="name@company.com" aria-invalid={Boolean(requestErrors.email)} /></div>{requestErrors.email && <span>{requestErrors.email}</span>}</div>
            <div className="vi-request-field"><label htmlFor="request-phone">Phone <em>optional</em></label><input id="request-phone" type="tel" value={requestForm.phone} onChange={updateRequest("phone")} placeholder="Phone number" /></div>
            <div className="vi-request-field full"><label htmlFor="request-inspection">What are you looking to inspect?</label><textarea id="request-inspection" className={requestErrors.inspection ? "err" : ""} value={requestForm.inspection} onChange={updateRequest("inspection")} placeholder="Parts, defects, surface type, or production context" aria-invalid={Boolean(requestErrors.inspection)} />{requestErrors.inspection && <span>{requestErrors.inspection}</span>}</div>
            <button className="vi-request-btn" type="submit">Request a demo <Send size={16} aria-hidden="true" /></button>
          </form>
          {requestMessage && <p className={`vi-request-message ${requestState}`} role="status">{requestState === "success" && <CheckCircle2 size={15} aria-hidden="true" />}{requestMessage}</p>}
          <span className="vi-request-note">VisionInspect demo · no file upload · no payment details · no external submission</span>
        </div>
        <div className="vi-request-actions" aria-label="Demonstration actions">
          <a className="vi-request-action vi-request-action-ghost" href="mailto:contact@visioninspect.ai?subject=VisionInspect%20AI%20demo%20enquiry">Contact <Mail size={16} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="vi-wrap vi-cta" aria-labelledby="cta-title">
        <div className="vi-cta-inner">
          <div><p className="vi-eyebrow vi-mono">Ready when you are</p><h2 id="cta-title" className="vi-h2">Bring the next inspection into focus.</h2></div>
          <Link className="vi-btn vi-btn-main" href={LOGIN_PATH}>Sign in to VisionInspect <ArrowRight className="vi-arrow" /></Link>
        </div>
      </section>

      <footer className="vi-footer">
        <div className="vi-wrap">
          <div className="vi-footer-main">
            <div className="vi-footer-brand">
              <BrandMark />
              <p>Evidence-led defect detection and quality review for thoughtful manufacturing teams.</p>
              <span className="vi-footer-signal"><i /><i /><i /> Inspection, interpretation, action</span>
            </div>
            <nav className="vi-footer-group" aria-label="Platform footer navigation">
              <span className="vi-footer-label">Platform</span>
              <a href="#workflow">Inspection workflow</a>
              <a href="#platform">Model pipeline</a>
              <a href="#platform">Review context</a>
            </nav>
            <nav className="vi-footer-group" aria-label="Inspection scope footer navigation">
              <span className="vi-footer-label">Inspection scope</span>
              <a href="#workflow">Surface review</a>
              <a href="#platform">Visual traceability</a>
              <a href="#platform">Quality signals</a>
            </nav>
            <nav className="vi-footer-group" aria-label="Company footer navigation">
              <span className="vi-footer-label">VisionInspect</span>
              <a href="#hero-title">Product overview</a>
              <Link href={LOGIN_PATH}>Sign in</Link>
              <a href="#platform">Quality approach</a>
            </nav>
          </div>
          <div className="vi-footer-bottom">
            <span>© 2026 VisionInspect AI. Quality intelligence platform.</span>
            <div><a href="#platform">Privacy approach</a><a href="#workflow">System notes</a></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
