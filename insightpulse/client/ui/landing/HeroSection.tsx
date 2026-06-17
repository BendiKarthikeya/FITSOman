import React from 'react';
import { HERO_SCREENSHOT } from './assets';

export const HeroSection: React.FC = () => (
  <section
    className="flex flex-col items-center w-full"
    data-node-id="4:3488"
  >
    <div className="flex flex-col items-center gap-5 w-full max-w-[1280px] px-6 py-16 md:py-20 lg:py-[64px]">
      {/* Label */}
      <p
        className="text-sm font-ibm-plex font-medium text-[rgba(115,115,115,0.9)] text-center"
        data-node-id="4:3490"
      >
        Survey Building Platform
      </p>

      {/* Heading */}
      <div className="max-w-[768px] w-full" data-node-id="4:3491">
        <h1
          className="font-ibm-plex font-semibold text-[#0a0a0a] text-center text-4xl sm:text-5xl leading-[1.1] tracking-[0.4608px]"
          data-node-id="4:3492"
        >
          Build, Measure &amp; Act on Employee Feedback
        </h1>
      </div>

      {/* Subtitle */}
      <div className="max-w-[768px] w-full pt-3" data-node-id="4:3493">
        <p
          className="font-ibm-plex font-normal text-[#737373] text-center text-lg leading-[1.6]"
          data-node-id="4:3494"
        >
          Create surveys with our no-code builder, distribute across Web, WhatsApp, and Voice AI
          channels, analyze EVI and NPS with advanced sentiment intelligence, and launch action
          planning workflows.
        </p>
      </div>

      {/* CTA Buttons */}
      <div
        className="flex flex-wrap gap-4 items-center justify-center pt-7 w-full"
        data-node-id="4:3495"
      >
        <button
          className="flex h-12 items-center justify-center rounded-lg bg-[#171717] px-8 text-base font-ibm-plex font-normal text-[#fafafa] hover:bg-[#2a2a2a] transition-colors"
          data-node-id="4:3496"
        >
          Make a Request
        </button>
        <button
          className="flex h-12 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white px-8 text-base font-ibm-plex font-normal text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f5f5f5] transition-colors"
          data-node-id="4:3498"
        >
          Learn More
        </button>
      </div>

      {/* Dashboard Preview */}
      <div
        className="w-full rounded-[10px] border border-[#e5e5e5] bg-[#f5f5f5] p-[9px] mt-2"
        data-node-id="4:3500"
      >
        <div
          className="relative w-full overflow-hidden rounded-[4px] border border-[#e5e5e5] bg-white"
          style={{ paddingTop: '55.6%' }}
          data-node-id="4:3501"
        >
          <img
            src={HERO_SCREENSHOT}
            alt="InsightPulse dashboard preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '0 -160px' }}
            data-node-id="4:3502"
          />
        </div>
      </div>
    </div>
  </section>
);
