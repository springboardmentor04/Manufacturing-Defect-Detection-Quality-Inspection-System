import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Cpu,
  Factory,
  ArrowRight,
  ScanLine,
  BrainCircuit,
  FileCheck2,
  Database,
  Activity,
  CheckCircle2,
  Menu,
  X,
  Zap,
  BarChart3,
} from "lucide-react";

import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToLogin = (role) => {
    setMobileMenuOpen(false);
    navigate(`/login?role=${role}`);
  };

  const scrollToSection = (section) => {
    setMobileMenuOpen(false);

    const element = document.getElementById(section);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="home">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="gradient gradient-1"></div>
      <div className="gradient gradient-2"></div>
      <div className="grid-overlay"></div>


      {/* =========================================================
          NAVBAR
      ========================================================= */}

      <nav className="navbar">

        <button
          className="brand-button"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Go to top"
        >
          <div className="logo">

            <div className="logo-icon">
              <ShieldCheck size={25} />
            </div>

            <div className="logo-content">
              <h2>VisionInspect</h2>
              <span>AI POWERED INSPECTION</span>
            </div>

          </div>
        </button>


        <div className="nav-links">

          <button
            type="button"
            onClick={() => scrollToSection("features")}
          >
            Features
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("workflow")}
          >
            Workflow
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("workspace")}
          >
            Workspace
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("about")}
          >
            About
          </button>

        </div>


        <div className="navbar-actions">

          <button
            className="login-btn"
            type="button"
            onClick={() => goToLogin("engineer")}
          >
            Login
            <ArrowRight size={17} />
          </button>


          <button
            className="mobile-menu-btn"
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>

        </div>


        {mobileMenuOpen && (
          <div className="mobile-menu">

            <button
              type="button"
              onClick={() => scrollToSection("features")}
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("workflow")}
            >
              Workflow
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("workspace")}
            >
              Workspace
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("about")}
            >
              About
            </button>

            <button
              className="mobile-login-btn"
              type="button"
              onClick={() => goToLogin("engineer")}
            >
              Login
              <ArrowRight size={16} />
            </button>

          </div>
        )}

      </nav>


      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="hero">

        <div className="hero-left">

          <div className="hero-tag">
            <span className="tag-dot"></span>
            NEXT GENERATION AI INSPECTION
          </div>


          <div className="hero-platform-status">

            <Zap size={14} />

            <span>AI INSPECTION PLATFORM</span>

            <i></i>

            <strong>READY</strong>

          </div>


          <h1>
            Intelligent
            <span> Quality</span>
            <br />
            Inspection.
          </h1>


          <p>
            VisionInspect AI combines Computer Vision and
            Deep Learning to automatically identify
            manufacturing defects and deliver reliable
            quality inspection results.
          </p>


          <div className="hero-buttons">

            <button
              className="primary-btn"
              type="button"
              onClick={() => goToLogin("engineer")}
            >
              Start Inspection
              <ArrowRight size={19} />
            </button>


            <button
              className="secondary-btn"
              type="button"
              onClick={() => scrollToSection("workflow")}
            >
              Explore Workflow
            </button>

          </div>


          {/* HERO MINI STATS */}

          <div className="hero-mini-stats">

            <div className="mini-stat">

              <Cpu size={19} />

              <div>
                <strong>ResNet18 AI</strong>
                <span>Fine-tuned inspection model</span>
              </div>

            </div>


            <div className="mini-stat">

              <ScanLine size={19} />

              <div>
                <strong>15+ Categories</strong>
                <span>Industrial product classes</span>
              </div>

            </div>


            <div className="mini-stat">

              <Activity size={19} />

              <div>
                <strong>Automated</strong>
                <span>Pass / Fail decisions</span>
              </div>

            </div>

          </div>

        </div>


        {/* =======================================================
            HERO VISUAL
        ======================================================= */}

        <div className="hero-right">

          <div className="hero-image-container">

            <div className="image-glow"></div>

            <div className="image-frame">

              <img
                src="/hero-ai.png"
                alt="AI-powered industrial quality inspection"
                className="hero-image"
              />

            </div>


            <div className="hero-scan-line"></div>


            <div className="floating-status status-top">

              <span className="status-pulse"></span>

              <div>
                <strong>AI ENGINE</strong>
                <small>ONLINE</small>
              </div>

            </div>


            <div className="floating-status status-bottom">

              <CheckCircle2 size={18} />

              <div>
                <strong>Inspection Ready</strong>
                <small>System operational</small>
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          CAPABILITY STRIP
      ========================================================= */}

      <section className="capability-strip">

        <div className="capability-item">

          <span className="capability-icon">
            <BrainCircuit size={18} />
          </span>

          <div>
            <strong>Automatic Classification</strong>
            <span>15 industrial product categories</span>
          </div>

        </div>


        <div className="capability-item">

          <span className="capability-icon">
            <ScanLine size={18} />
          </span>

          <div>
            <strong>Defect Detection</strong>
            <span>Category-specific AI inspection</span>
          </div>

        </div>


        <div className="capability-item">

          <span className="capability-icon">
            <BarChart3 size={18} />
          </span>

          <div>
            <strong>Quality Intelligence</strong>
            <span>Severity, risk and inspection analytics</span>
          </div>

        </div>


        <div className="capability-item">

          <span className="capability-icon">
            <FileCheck2 size={18} />
          </span>

          <div>
            <strong>Instant Reporting</strong>
            <span>Structured inspection reports</span>
          </div>

        </div>

      </section>


      {/* =========================================================
          SYSTEM BAR
      ========================================================= */}

      <section className="system-bar">

        <div className="system-item">

          <span className="system-icon">
            <BrainCircuit size={18} />
          </span>

          <div>
            <strong>Deep Learning</strong>
            <span>Fine-tuned ResNet18 models</span>
          </div>

        </div>


        <div className="system-divider"></div>


        <div className="system-item">

          <span className="system-icon">
            <ScanLine size={18} />
          </span>

          <div>
            <strong>Computer Vision</strong>
            <span>Automated image analysis</span>
          </div>

        </div>


        <div className="system-divider"></div>


        <div className="system-item">

          <span className="system-icon">
            <FileCheck2 size={18} />
          </span>

          <div>
            <strong>Quality Control</strong>
            <span>Pass / Fail decisions</span>
          </div>

        </div>


        <div className="system-divider"></div>


        <div className="system-item">

          <span className="system-icon">
            <Database size={18} />
          </span>

          <div>
            <strong>Inspection History</strong>
            <span>Centralized records</span>
          </div>

        </div>

      </section>


      {/* =========================================================
          FEATURES
      ========================================================= */}

      <section
        className="features"
        id="features"
      >

        <div className="section-title">

          <span>PLATFORM CAPABILITIES</span>

          <h2>
            Built for intelligent
            <br />
            manufacturing inspection
          </h2>

          <p>
            A complete AI-powered inspection workflow designed
            to reduce manual inspection effort and improve
            manufacturing quality control.
          </p>

        </div>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-number">
              01
            </div>

            <div className="feature-icon">
              <BrainCircuit size={25} />
            </div>

            <h3>
              AI Powered
            </h3>

            <p>
              Fine-tuned ResNet18 models analyze product
              images and identify visual patterns associated
              with manufacturing defects.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>

          </div>


          <div className="feature-card">

            <div className="feature-number">
              02
            </div>

            <div className="feature-icon">
              <ScanLine size={25} />
            </div>

            <h3>
              Computer Vision
            </h3>

            <p>
              Automated image analysis enables visual
              inspection of industrial products and
              category-specific defect patterns.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>

          </div>


          <div className="feature-card">

            <div className="feature-number">
              03
            </div>

            <div className="feature-icon">
              <Activity size={25} />
            </div>

            <h3>
              Fast Detection
            </h3>

            <p>
              Process inspection images and receive
              automated quality decisions with confidence,
              severity and risk information.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>

          </div>


          <div className="feature-card">

            <div className="feature-number">
              04
            </div>

            <div className="feature-icon">
              <FileCheck2 size={25} />
            </div>

            <h3>
              Smart Reports
            </h3>

            <p>
              Generate downloadable inspection reports and
              maintain a complete history of product
              quality results.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          WORKFLOW
      ========================================================= */}

      <section
        className="workflow"
        id="workflow"
      >

        <div className="section-title">

          <span>INSPECTION WORKFLOW</span>

          <h2>
            From image to
            <br />
            quality decision
          </h2>

          <p>
            Four simple stages transform a product image
            into an actionable inspection result.
          </p>

        </div>


        <div className="workflow-container">

          <div className="workflow-card">

            <div className="step-header">

              <span className="step-number">
                01
              </span>

              <ScanLine size={21} />

            </div>

            <h3>
              Upload Image
            </h3>

            <p>
              Upload a product image from the manufacturing
              inspection workflow.
            </p>

          </div>


          <div className="workflow-arrow">
            <ArrowRight size={20} />
          </div>


          <div className="workflow-card">

            <div className="step-header">

              <span className="step-number">
                02
              </span>

              <BrainCircuit size={21} />

            </div>

            <h3>
              AI Analysis
            </h3>

            <p>
              The product classifier identifies the category,
              then a fine-tuned ResNet18 model analyzes the
              product for defects.
            </p>

          </div>


          <div className="workflow-arrow">
            <ArrowRight size={20} />
          </div>


          <div className="workflow-card">

            <div className="step-header">

              <span className="step-number">
                03
              </span>

              <Activity size={21} />

            </div>

            <h3>
              Inspection Result
            </h3>

            <p>
              The system returns the prediction, confidence,
              severity, risk level and quality decision.
            </p>

          </div>


          <div className="workflow-arrow">
            <ArrowRight size={20} />
          </div>


          <div className="workflow-card">

            <div className="step-header">

              <span className="step-number">
                04
              </span>

              <FileCheck2 size={21} />

            </div>

            <h3>
              Generate Report
            </h3>

            <p>
              Create a PDF inspection report and store the
              result in centralized inspection history.
            </p>

          </div>

        </div>

      </section>


      {/* =========================================================
          STATS
      ========================================================= */}

      <section className="stats">

        <div className="stat-card">

          <span className="stat-icon">
            <Factory size={20} />
          </span>

          <h2>15+</h2>

          <p>
            Product Categories
          </p>

        </div>


        <div className="stat-card">

          <span className="stat-icon">
            <Database size={20} />
          </span>

          <h2>5,354</h2>

          <p>
            Training &amp; Evaluation Images
          </p>

        </div>


        <div className="stat-card">

          <span className="stat-icon">
            <Cpu size={20} />
          </span>

          <h2>ResNet18</h2>

          <p>
            Fine-Tuned AI Model
          </p>

        </div>


        <div className="stat-card">

          <span className="stat-icon">
            <Activity size={20} />
          </span>

          <h2>24/7</h2>

          <p>
            Inspection Workflow
          </p>

        </div>

      </section>


      {/* =========================================================
          ABOUT
      ========================================================= */}

      <section
        className="about"
        id="about"
      >

        <div className="about-left">

          <span className="section-tag">
            ABOUT VISIONINSPECT AI
          </span>


          <h2>
            Built for the future
            <br />
            of smart manufacturing.
          </h2>


          <p>
            VisionInspect AI combines Computer Vision,
            Deep Learning and Artificial Intelligence to
            automate industrial quality inspection.
          </p>


          <p>
            The platform helps quality teams inspect
            products, identify defects, generate inspection
            reports and maintain a centralized inspection
            history.
          </p>


          <div className="about-list">

            <div>
              <CheckCircle2 size={17} />
              AI-powered defect detection
            </div>

            <div>
              <CheckCircle2 size={17} />
              Fine-tuned ResNet18 inspection models
            </div>

            <div>
              <CheckCircle2 size={17} />
              Automatic product classification
            </div>

            <div>
              <CheckCircle2 size={17} />
              Automated inspection results
            </div>

            <div>
              <CheckCircle2 size={17} />
              PDF inspection reports
            </div>

            <div>
              <CheckCircle2 size={17} />
              Inspection history and analytics
            </div>

          </div>

        </div>


        <div className="about-right">

          <div className="about-image-frame">

            <img
              src="/about-ai.png"
              alt="Automated industrial quality inspection"
            />

          </div>


          <div className="about-floating-card">

            <ShieldCheck size={20} />

            <div>
              <strong>QUALITY FIRST</strong>
              <span>AI-assisted inspection</span>
            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          WORKSPACE
      ========================================================= */}

      <section
        className="workspace"
        id="workspace"
      >

        <div className="section-title">

          <span>ACCESS YOUR WORKSPACE</span>

          <h2>
            Choose your
            <br />
            inspection role
          </h2>

          <p>
            Dedicated workspaces for quality engineers
            and factory supervisors.
          </p>

        </div>


        <div className="workspace-container">

          {/* QUALITY ENGINEER */}

          <div className="role-card">

            <div className="role-top">

              <div className="role-icon">
                <ScanLine size={25} />
              </div>

              <span>
                QUALITY
              </span>

            </div>


            <h3>
              Quality Engineer
            </h3>


            <p>
              Perform product inspections and review
              AI-generated quality decisions.
            </p>


            <ul>

              <li>
                <CheckCircle2 size={16} />
                Upload product images
              </li>

              <li>
                <CheckCircle2 size={16} />
                Run AI inspection
              </li>

              <li>
                <CheckCircle2 size={16} />
                Review defect results
              </li>

              <li>
                <CheckCircle2 size={16} />
                Generate reports
              </li>

            </ul>


            <button
              type="button"
              onClick={() => goToLogin("engineer")}
            >
              Enter Workspace
              <ArrowRight size={18} />
            </button>

          </div>


          {/* FACTORY SUPERVISOR */}

          <div className="role-card">

            <div className="role-top">

              <div className="role-icon">
                <Factory size={25} />
              </div>

              <span>
                MANAGEMENT
              </span>

            </div>


            <h3>
              Factory Supervisor
            </h3>


            <p>
              Monitor production quality and review
              manufacturing inspection analytics.
            </p>


            <ul>

              <li>
                <CheckCircle2 size={16} />
                Production overview
              </li>

              <li>
                <CheckCircle2 size={16} />
                Quality analytics
              </li>

              <li>
                <CheckCircle2 size={16} />
                Production monitoring
              </li>

              <li>
                <CheckCircle2 size={16} />
                User management
              </li>

            </ul>


            <button
              type="button"
              onClick={() => goToLogin("supervisor")}
            >
              Enter Workspace
              <ArrowRight size={18} />
            </button>

          </div>

        </div>

      </section>


      {/* =========================================================
          FINAL CTA
      ========================================================= */}

      <section className="final-cta">

        <div className="final-cta-glow"></div>

        <span className="section-tag">
          READY TO INSPECT?
        </span>


        <h2>
          Turn every inspection into
          <br />
          <span>quality intelligence.</span>
        </h2>


        <p>
          Upload a product image and let VisionInspect AI
          classify, inspect and evaluate it through the
          complete quality workflow.
        </p>


        <div className="final-cta-buttons">

          <button
            className="primary-btn"
            type="button"
            onClick={() => goToLogin("engineer")}
          >
            Start an Inspection
            <ArrowRight size={19} />
          </button>


          <button
            className="secondary-btn"
            type="button"
            onClick={() => goToLogin("supervisor")}
          >
            Supervisor Workspace
            <ArrowRight size={19} />
          </button>

        </div>

      </section>


      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer
        className="footer"
        id="footer"
      >

        <div className="footer-container">

          <div className="footer-brand">

            <div className="footer-logo">

              <ShieldCheck size={23} />

              <span>
                VisionInspect AI
              </span>

            </div>


            <p>
              AI-powered industrial quality inspection
              using Computer Vision and Deep Learning.
            </p>

          </div>


          <div className="footer-links">

            <h3>
              Platform
            </h3>

            <button
              type="button"
              onClick={() => scrollToSection("features")}
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("workflow")}
            >
              Workflow
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("workspace")}
            >
              Workspace
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("about")}
            >
              About
            </button>

          </div>


          <div className="footer-tech">

            <h3>
              Technology
            </h3>

            <span>React.js</span>
            <span>FastAPI</span>
            <span>MongoDB</span>
            <span>PyTorch</span>
            <span>ResNet18</span>

          </div>


          <div className="footer-project">

            <h3>
              Project
            </h3>

            <span>
              Industrial Quality Inspection
            </span>

            <span>
              Computer Vision
            </span>

            <span>
              Deep Learning
            </span>

            <span>
              AI Quality Control
            </span>

          </div>

        </div>


        <div className="footer-bottom">

          <span>
            © 2026 VisionInspect AI
          </span>

          <span>
            Built with React • FastAPI • PyTorch
          </span>

        </div>

      </footer>

    </div>
  );
}

export default Home;