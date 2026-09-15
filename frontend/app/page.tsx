"use client";

import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedCompanies } from "@/components/landing/TrustedCompanies";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      <Navbar />
      
      <main>
        <HeroSection />
        <TrustedCompanies />
        <FeaturesSection />
        <WorkflowSection />
        <DashboardPreview />
        <BenefitsSection />
        <StatsSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
