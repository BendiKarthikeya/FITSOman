import React, { useEffect } from 'react';
import { LandingNav } from './LandingNav';
import { HeroSection } from './HeroSection';
import { IndustriesSection } from './IndustriesSection';
import { ComparisonSection } from './ComparisonSection';
import { FAQSection } from './FAQSection';
import { LandingFooter } from './LandingFooter';

export const LandingPageV2: React.FC = () => {
  useEffect(() => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-ibm-plex text-[#0a0a0a] overflow-x-hidden" data-node-id="4:3461">
      <LandingNav />

      <main className="flex flex-col items-center w-full overflow-x-hidden">
        <HeroSection />
        <IndustriesSection />
        <ComparisonSection />
        <FAQSection />
      </main>

      <LandingFooter />
    </div>
  );
};
