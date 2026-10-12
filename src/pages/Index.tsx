import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { CTASection } from "@/components/sections/CTASection";
import { WorkflowSections } from "@/components/sections/WorkflowSections";
import { SecuritySection } from "@/components/sections/SecuritySection";
import { CodeSection } from "@/components/sections/CodeSection";
import { ProductDemoSection } from "@/components/sections/ProductDemoSection";
import { StablecoinSection } from "@/components/sections/StablecoinSection";
import { useEffect } from "react";
import { useMetrics } from "@/hooks/useMetrics";

const Index = () => {
  const { trackPageView } = useMetrics();

  useEffect(() => {
    trackPageView("Homepage");
  }, [trackPageView]);

  return (
    <div className="public-page home min-h-screen relative selection:bg-[#b9d9cc]">
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProductDemoSection />
        <HowItWorksSection />
        <WorkflowSections />
        <StablecoinSection />
        <SecuritySection />
        <CodeSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
