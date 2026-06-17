import React from 'react';

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Yes">
    <circle cx="12" cy="12" r="10" fill="#0a0a0a" />
    <path
      d="M7.5 12l3 3 6-6"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="No">
    <circle cx="12" cy="12" r="10" stroke="#d4d4d4" strokeWidth="1.5" />
    <path
      d="M9 9l6 6M15 9l-6 6"
      stroke="#d4d4d4"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

type Cell = boolean | string;

const TABLE_ROWS: { feature: string; insightpulse: Cell; basic: Cell; other: Cell }[] = [
  { feature: 'Quick Deployment',          insightpulse: true,         basic: true,  other: false },
  { feature: 'Rapid SOS',                 insightpulse: true,         basic: false, other: false },
  { feature: 'Low Upfront Cost',          insightpulse: true,         basic: true,  other: false },
  { feature: 'Low Monthly Cost',          insightpulse: true,         basic: false, other: true  },
  { feature: 'No Contracts',              insightpulse: true,         basic: false, other: true  },
  { feature: 'Easy and Fair Cancellation',insightpulse: true,         basic: false, other: true  },
  { feature: 'Quick Support',             insightpulse: true,         basic: false, other: false },
  { feature: 'Easy Interface',            insightpulse: true,         basic: false, other: false },
  { feature: 'Free Upgrades',             insightpulse: true,         basic: false, other: false },
  { feature: 'Average Install Time',      insightpulse: '30 minutes', basic: '~ 2 hours', other: '~ 3 hours' },
];

const CellValue: React.FC<{ value: Cell }> = ({ value }) => {
  if (typeof value === 'string') {
    return (
      <span className="text-lg font-ibm-plex font-normal text-[#0a0a0a] text-center leading-[1.6]">
        {value}
      </span>
    );
  }
  return value ? <CheckIcon /> : <XIcon />;
};

export const ComparisonSection: React.FC = () => (
  <section
    id="features"
    className="w-full"
    data-node-id="4:3739"
  >
    <div className="flex flex-col items-center gap-5 mx-auto w-full max-w-[1280px] px-6 py-24">
    {/* Label */}
    <p className="text-base font-ibm-plex font-normal text-[#737373] text-center" data-node-id="4:3740">
      Our Features
    </p>

    {/* Heading */}
    <div className="max-w-[896px] w-full" data-node-id="4:3741">
      <h2
        className="font-ibm-plex font-semibold text-[#0a0a0a] text-center text-3xl sm:text-5xl leading-[1.1] tracking-[0.4608px]"
        data-node-id="4:3742"
      >
        Experience the Difference
      </h2>
    </div>

    {/* Subtitle */}
    <div className="max-w-[672px] w-full" data-node-id="4:3743">
      <p
        className="text-lg font-ibm-plex font-normal text-[#737373] text-center leading-[1.6]"
        data-node-id="4:3744"
      >
        A clear comparison designed for decision-makers evaluating long-term employee engagement
        platforms.
      </p>
    </div>

    {/* Table Container */}
    <div
      className="w-full rounded-[10px] border border-dashed border-[#e5e5e5] bg-[#f5f5f5] p-[9px]"
      data-node-id="4:3745"
    >
      <div className="w-full overflow-x-auto" data-node-id="4:3746">
        <table
          className="w-full min-w-[700px] overflow-hidden rounded-[8px] bg-white"
          data-node-id="4:3747"
        >
          {/* Header */}
          <thead>
            <tr className="border-b border-dashed border-[#e5e5e5]" data-node-id="4:3748">
              <th
                className="border border-dashed border-[#e5e5e5] bg-gradient-to-br from-[#f5f5f5] to-[rgba(245,245,245,0.3)] h-[69px] w-[33%]"
                data-node-id="4:3749"
              />
              <th
                className="border border-dashed border-[#e5e5e5] bg-[rgba(245,245,245,0.3)] px-2 py-5 text-xl font-ibm-plex font-semibold text-[#0a0a0a] text-center leading-[1.4] w-[22%]"
                data-node-id="4:3750"
              >
                InsightPulse
              </th>
              <th
                className="border border-dashed border-[#e5e5e5] bg-[rgba(245,245,245,0.3)] px-2 py-5 text-xl font-ibm-plex font-semibold text-[#0a0a0a] text-center leading-[1.4] w-[22%]"
                data-node-id="4:3752"
              >
                Basic System
              </th>
              <th
                className="border border-dashed border-[#e5e5e5] bg-[rgba(245,245,245,0.3)] px-2 py-5 text-xl font-ibm-plex font-semibold text-[#0a0a0a] text-center leading-[1.4] w-[23%]"
                data-node-id="4:3754"
              >
                Other System
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody data-node-id="4:3756">
            {TABLE_ROWS.map((row, i) => (
              <tr
                key={row.feature}
                className={`${i < TABLE_ROWS.length - 1 ? 'border-b border-dashed border-[#e5e5e5]' : ''}`}
                data-node-id={`row-${i}`}
              >
                {/* Feature name */}
                <td
                  className="border border-dashed border-[#e5e5e5] bg-[rgba(245,245,245,0.3)] px-10 py-5"
                  data-node-id={`feat-${i}`}
                >
                  <span className="text-lg font-ibm-plex font-normal text-[#0a0a0a] leading-[1.6] whitespace-nowrap">
                    {row.feature}
                  </span>
                </td>

                {/* InsightPulse */}
                <td
                  className="border border-dashed border-[#e5e5e5] px-2 py-[22px] text-center"
                  data-node-id={`ip-${i}`}
                >
                  <div className="flex justify-center">
                    <CellValue value={row.insightpulse} />
                  </div>
                </td>

                {/* Basic */}
                <td
                  className="border border-dashed border-[#e5e5e5] px-2 py-[22px] text-center"
                  data-node-id={`basic-${i}`}
                >
                  <div className="flex justify-center">
                    <CellValue value={row.basic} />
                  </div>
                </td>

                {/* Other */}
                <td
                  className="border border-dashed border-[#e5e5e5] px-2 py-[22px] text-center"
                  data-node-id={`other-${i}`}
                >
                  <div className="flex justify-center">
                    <CellValue value={row.other} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  </section>
);
