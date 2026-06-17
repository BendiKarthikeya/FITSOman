import React from 'react';
import { FEAT_CARD_ICON, ARROW_ICON, COMPANY_LOGOS, type CompanyLogo } from './assets';

const FEATURE_CARDS = [
  {
    nodeId: '4:3510',
    title: 'Multi-Channel Surveys',
    description:
      'Run surveys seamlessly across Web, WhatsApp (WATI), and Voice AI (VAPI) to maximize participation and reduce drop-offs.',
  },
  {
    nodeId: '4:3525',
    title: 'AI Analytics',
    description:
      'Unlock deeper insights using sentiment analysis, theme extraction, and trend reporting — built to support confident decision-making.',
  },
  {
    nodeId: '4:3540',
    title: 'Action Planning',
    description:
      'Turn feedback into measurable improvement initiatives. Assign tasks, track progress, and manage follow-ups with a Kanban-style board.',
  },
];

const LogoCell: React.FC<{ logo: CompanyLogo }> = ({ logo }) => (
  <div className="flex h-24 items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-[#e5e5e5] bg-white p-6">
    <div className="relative h-[72px] w-32 shrink-0 overflow-hidden">
      {/* desaturate overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-white mix-blend-saturation"
      />
      {logo.parts.map((part, i) => (
        <div key={i} className="absolute" style={{ inset: part.inset }}>
          <img
            src={part.src}
            alt=""
            className="absolute block h-full w-full max-w-none"
          />
        </div>
      ))}
    </div>
  </div>
);

export const WhyChooseUsSection: React.FC = () => (
  <section
    id="why-choose-us"
    className="w-full"
    data-node-id="4:3503"
  >
    <div className="flex flex-col items-center mx-auto w-full max-w-[1280px] px-6 py-24">
    {/* Section label */}
    <p className="text-base font-ibm-plex font-normal text-[#737373] text-center" data-node-id="4:3504">
      Why Choose Us
    </p>

    {/* Heading */}
    <div className="mt-5 max-w-[896px] w-full" data-node-id="4:3505">
      <h2
        className="font-ibm-plex font-semibold text-[#0a0a0a] text-center text-3xl sm:text-5xl leading-[1.1] tracking-[0.4608px]"
        data-node-id="4:3506"
      >
        We are Leading in Smart Assistants
        <br className="hidden sm:block" /> with Nearly 20 Years of Experience
      </h2>
    </div>

    {/* Subtitle */}
    <p className="mt-5 text-lg font-ibm-plex font-normal text-[#737373] text-center leading-relaxed" data-node-id="4:3508">
      We are constantly always keep pace with the time.
    </p>

    {/* Feature Cards */}
    <div
      className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-node-id="4:3509"
    >
      {FEATURE_CARDS.map((card) => (
        <div
          key={card.nodeId}
          className="flex flex-col items-center gap-2 overflow-hidden rounded-[10px] border border-[#f1f5f9] bg-[#f1f5f9] px-6 py-10 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          data-node-id={card.nodeId}
        >
          {/* Icon */}
          <div className="relative h-14 w-14 shrink-0">
            <img src={FEAT_CARD_ICON} alt="" className="absolute block h-full w-full max-w-none" />
          </div>

          {/* Title */}
          <div className="pt-6">
            <h3 className="font-ibm-plex font-semibold text-xl leading-[1.4] text-[#0a0a0a] text-center">
              {card.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-base font-ibm-plex font-normal text-[#737373] text-center leading-normal">
            {card.description}
          </p>

          {/* Learn More Button */}
          <div className="pt-6">
            <button className="flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-ibm-plex font-normal text-[#fafafa] hover:bg-[#2a2a2a] transition-colors">
              Learn More
              <img src={ARROW_ICON} alt="" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Trusted By */}
    <div className="mt-28 flex flex-col items-center gap-12 w-full" data-node-id="4:3555">
      <h3
        className="font-ibm-plex font-semibold text-[#0a0a0a] text-center text-[30px] leading-[1.25] tracking-[0.09px]"
        data-node-id="4:3557"
      >
        Trusted by over 30,000 companies worldwide
      </h3>

      {/* Logo grid */}
      <div
        className="w-full rounded-[10px] border border-dashed border-[#e5e5e5] bg-[rgba(23,23,23,0.05)] p-1"
        data-node-id="4:3558"
      >
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-5">
          {COMPANY_LOGOS.map((logo, idx) => (
            <LogoCell key={idx} logo={logo} />
          ))}
        </div>
      </div>
    </div>
  </div>
  </section>
);
