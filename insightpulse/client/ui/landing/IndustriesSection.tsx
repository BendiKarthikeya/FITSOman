import React from 'react';
import {
  ICON_LOGISTICS,
  ICON_ENTERPRISE,
  ICON_HEALTHCARE,
  ICON_RETAIL,
  ARROW_ICON,
} from './assets';

const INDUSTRIES = [
  {
    nodeId: '4:3640',
    iconSrc: ICON_LOGISTICS,
    title: 'Logistics',
    description:
      'Track engagement across distributed teams, shift workers, and field operations with multi-channel surveys.',
  },
  {
    nodeId: '4:3661',
    iconSrc: ICON_ENTERPRISE,
    title: 'Enterprise Offices',
    description:
      'Measure employee sentiment, leadership effectiveness, and workplace satisfaction with anonymous feedback.',
  },
  {
    nodeId: '4:3681',
    iconSrc: ICON_HEALTHCARE,
    title: 'Health Care',
    description:
      'Capture staff feedback on workload, burnout, safety, and improvements through fast, mobile-friendly surveys.',
  },
  {
    nodeId: '4:3698',
    iconSrc: ICON_RETAIL,
    title: 'Retails',
    description:
      'Improve employee experience across stores by monitoring training feedback, and workplace issues.',
  },
];

export const IndustriesSection: React.FC = () => (
  <section
    id="industries"
    className="w-full bg-[rgba(23,23,23,0.04)]"
    data-node-id="4:3632"
  >
    <div className="flex flex-col items-center gap-5 mx-auto w-full max-w-[1280px] px-6 py-24" data-node-id="4:3633">
      {/* Label */}
      <p className="text-base font-ibm-plex font-normal text-[#737373] text-center" data-node-id="4:3634">
        Best for You
      </p>

      {/* Heading */}
      <div className="max-w-[896px] w-full" data-node-id="4:3635">
        <h2
          className="font-ibm-plex font-semibold text-[#0a0a0a] text-center text-3xl sm:text-5xl leading-[1.1] tracking-[0.4608px]"
          data-node-id="4:3636"
        >
          Industries Where InsightPulse{' '}
          <br className="hidden md:block" />
          Delivers the Highest Impact
        </h2>
      </div>

      {/* Subtitle */}
      <div className="max-w-[896px] w-full" data-node-id="4:3637">
        <p
          className="text-lg font-ibm-plex font-normal text-[#737373] text-center leading-[1.6]"
          data-node-id="4:3638"
        >
          From frontline operations to corporate offices, InsightPulse helps organisations measure
          engagement, improve culture, and drive retention with data-backed action planning.
        </p>
      </div>

      {/* Industry Cards */}
      <div
        className="grid w-full grid-cols-1 gap-4 py-7 sm:grid-cols-2 lg:grid-cols-4"
        data-node-id="4:3639"
      >
        {INDUSTRIES.map((industry) => (
          <div
            key={industry.nodeId}
            className="flex flex-col items-start justify-center rounded-[10px] border border-[#e5e5e5] bg-[#f5f5f5] p-[5px]"
            data-node-id={industry.nodeId}
          >
            <div className="w-full overflow-hidden rounded-[8px] border border-[#e5e5e5] bg-white px-6 py-10">
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div className="relative h-12 w-12 shrink-0">
                  <img
                    src={industry.iconSrc}
                    alt=""
                    className="absolute block h-full w-full max-w-none"
                  />
                </div>

                {/* Title */}
                <div className="pt-8">
                  <h3 className="font-ibm-plex font-semibold text-xl leading-[1.4] text-[#0a0a0a] text-center">
                    {industry.title}
                  </h3>
                </div>

                {/* Description */}
                <div className="pt-3 w-full">
                  <p className="text-base font-ibm-plex font-normal text-[#0a0a0a] text-center leading-normal">
                    {industry.description}
                  </p>
                </div>

                {/* Learn More Button */}
                <div className="pt-6">
                  <button className="flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-ibm-plex font-normal text-[#fafafa] hover:bg-[#2a2a2a] transition-colors">
                    Learn More
                    <img src={ARROW_ICON} alt="" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dark CTA Banner */}
      <div
        className="relative w-full overflow-hidden rounded-[10px] bg-[#0a0a0a] px-10 py-20"
        data-node-id="4:3728"
      >
        {/* Subtle grid pattern overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(250,250,250,0.1) 1px, transparent 1px), linear-gradient(180deg, rgba(250,250,250,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative flex flex-col items-center gap-5 w-full" data-node-id="4:3732">
          {/* Heading */}
          <div className="max-w-[768px] w-full" data-node-id="4:3733">
            <h2
              className="font-ibm-plex font-semibold text-[#fafafa] text-center text-3xl sm:text-5xl leading-[1.1] tracking-[0.4608px]"
              data-node-id="4:3734"
            >
              Build a Feedback Culture That Drives Performance
            </h2>
          </div>

          {/* Sub */}
          <div className="pb-5 w-full" data-node-id="4:3735">
            <p
              className="text-lg font-ibm-plex font-normal text-[#a1a1a1] text-center leading-[1.6]"
              data-node-id="4:3736"
            >
              Launch multi-channel surveys, uncover sentiment insights, and track improvement
              initiatives — all from one platform.
            </p>
          </div>

          {/* Request Demo Button */}
          <button
            className="flex h-12 items-center justify-center rounded-lg bg-[#e5e5e5] px-8 text-base font-ibm-plex font-normal text-[#171717] hover:bg-[#d4d4d4] transition-colors"
            data-node-id="4:3737"
          >
            Request Demo
          </button>
        </div>
      </div>
    </div>
  </section>
);
