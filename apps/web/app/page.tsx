"use client";

import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StatsTicker } from "@/components/landing/StatsTicker";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <StatsTicker />
      <LiveDemo />
      <CTASection />
      <Footer />
    </div>
  );
}
