import React from 'react';

// Simple inline icons for FAQ questions (Lucide-style SVG)
const QuestionIcons: React.FC<{ index: number }> = ({ index }) => {
  const icons = [
    // What is InsightPulse? – building/store icon
    <svg key={0} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="8" width="16" height="10" rx="1" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M1 8l9-6 9 6" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="12" width="6" height="6" rx="0.5" stroke="#0a0a0a" strokeWidth="1.5" />
    </svg>,
    // Multi-channel – wifi/signal icon
    <svg key={1} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2.5 7.5c2.083-2.083 4.583-3.125 7.5-3.125s5.417 1.042 7.5 3.125" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 10.5c1.25-1.25 2.75-1.875 4.5-1.875s3.25.625 4.5 1.875" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1.5" fill="#0a0a0a" />
    </svg>,
    // Data security – shield icon
    <svg key={2} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3z" stroke="#0a0a0a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10l2 2 4-4" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
    // Manager views – eye icon
    <svg key={3} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="#0a0a0a" strokeWidth="1.5" />
    </svg>,
    // Payment – credit card icon
    <svg key={4} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="4" width="18" height="12" rx="2" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M1 8h18" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M4 13h3" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>,
    // Support – headset icon
    <svg key={5} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 10a7 7 0 0114 0" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="1" y="10" width="4" height="5" rx="1" stroke="#0a0a0a" strokeWidth="1.5" />
      <rect x="15" y="10" width="4" height="5" rx="1" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M19 15v1a3 3 0 01-3 3h-3" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>,
  ];
  return icons[index] ?? icons[0];
};

const FAQ_ITEMS = [
  {
    q: 'What is InsightPulse?',
    a: 'InsightPulse is an enterprise Employee Experience platform that helps organizations run surveys and convert feedback into meaningful action.',
  },
  {
    q: 'Do you support multi-channel surveys?',
    a: 'Yes. InsightPulse supports survey collection across Web, WhatsApp (WATI), and Voice AI (VAPI).',
  },
  {
    q: 'Is employee data secure?',
    a: 'Yes. InsightPulse is built with enterprise-grade security and role-based access controls to protect sensitive employee feedback.',
  },
  {
    q: 'Can managers see individual responses?',
    a: 'Manager views are designed to be privacy-conscious and focus primarily on aggregated insights and risk indicators.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, PayPal, UPI, and net banking.',
  },
  {
    q: 'Do you offer customer support?',
    a: 'Absolutely. Our support team is available 24/7 via email and chat to help with any issues or questions.',
  },
];

const FAQCard: React.FC<{ item: (typeof FAQ_ITEMS)[0]; index: number }> = ({ item, index }) => (
  <div
    className="relative overflow-hidden bg-white p-6 h-full"
    data-node-id={`faq-${index}`}
  >
    {/* Subtle dot-grid overlay */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(10,10,10,0.07) 1px, transparent 1px), linear-gradient(180deg, rgba(10,10,10,0.07) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        maskImage: 'radial-gradient(ellipse at top left, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at top left, black 30%, transparent 80%)',
      }}
    />

    <div className="relative flex flex-col gap-2">
      {/* Question row */}
      <div className="flex items-center gap-2">
        <div className="shrink-0 w-5 h-5">
          <QuestionIcons index={index} />
        </div>
        <h3
          className="font-bricolage font-medium text-lg leading-7 text-[#0a0a0a]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          {item.q}
        </h3>
      </div>

      {/* Answer */}
      <div className="pl-7">
        <p
          className="font-bricolage font-normal text-base leading-6 text-[rgba(10,10,10,0.8)] overflow-hidden"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          {item.a}
        </p>
      </div>
    </div>
  </div>
);

export const FAQSection: React.FC = () => (
  <section
    id="faq"
    className="w-full bg-[#f5f5f5]"
    data-node-id="4:3887"
  >
    <div
      className="flex flex-col items-center gap-5 mx-auto w-full max-w-[1280px] px-6 pb-24 pt-[116px]"
      data-node-id="4:3888"
    >
      {/* Heading */}
      <div className="max-w-[896px] w-full" data-node-id="4:3889">
        <h2
          className="font-bricolage font-semibold text-[#0a0a0a] text-center text-3xl sm:text-[48px] tracking-[-2.4px] leading-[52.8px]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          data-node-id="4:3890"
        >
          Frequently Asked Questions
        </h2>
      </div>

      {/* Subtitle */}
      <p
        className="text-lg font-ibm-plex font-normal text-[#737373] text-center leading-[1.6]"
        data-node-id="4:3892"
      >
        Find answers to common questions about our products and services.
      </p>

      {/* FAQ Grid */}
      <div
        className="w-full grid grid-cols-1 md:grid-cols-2 rounded-[10px] overflow-hidden border border-[#e5e5e5]"
        data-node-id="4:3893"
      >
        {FAQ_ITEMS.map((item, i) => {
          const isRight = i % 2 !== 0;
          const isLastItem = i === FAQ_ITEMS.length - 1;
          const isLastDesktopRow = i >= FAQ_ITEMS.length - 2;

          const borderClasses: string[] = [];
          // Right column: left divider on md+, no left border on mobile
          if (isRight) borderClasses.push('md:border-l border-l-[#e5e5e5]');
          // Bottom divider: all items except last on mobile; last desktop row removes it on md+
          if (!isLastItem) {
            borderClasses.push('border-b border-b-[#e5e5e5]');
            if (isLastDesktopRow) borderClasses.push('md:border-b-0');
          }

          return (
            <div key={i} className={borderClasses.join(' ')}>
              <FAQCard item={item} index={i} />
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
