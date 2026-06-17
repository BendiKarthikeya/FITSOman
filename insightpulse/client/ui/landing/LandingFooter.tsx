import React from 'react';
import { SOCIAL_ICON_1, SOCIAL_ICON_2, SOCIAL_ICON_3 } from './assets';

const FOOTER_LINKS = {
  Company: ['About', 'Careers', 'Contact'],
  Product: ['Features', 'Pricing', 'Integrations', 'FAQs'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

export const LandingFooter: React.FC = () => (
  <footer
    className="w-full border-t border-[#e2e8f0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
    data-node-id="4:3992"
  >
    <div
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-3 py-8 md:px-6"
      data-node-id="4:3993"
    >
      {/* Main footer row */}
      <div
        className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between"
        data-node-id="4:3994"
      >
        {/* Brand column */}
        <div className="flex flex-col gap-3 md:w-[400px]" data-node-id="4:3995">
          <div className="flex flex-col gap-2" data-node-id="4:3996">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f172a]"
              data-node-id="4:3997"
            >
              <span className="font-ibm-plex font-semibold text-xl leading-[1.4] text-white">
                IP
              </span>
            </div>
            <span
              className="font-bricolage font-semibold text-xl leading-7 text-[#0a0a0a]"
              data-node-id="4:3998"
              style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
            >
              InsightPulse
            </span>
          </div>
          <p
            className="font-bricolage font-normal text-base leading-6 text-[#737373]"
            data-node-id="4:4000"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            InsightPulse is an enterprise Employee Experience platform that helps organizations run
            surveys and convert feedback into meaningful action.
          </p>
        </div>

        {/* Link columns */}
        <div
          className="flex flex-wrap gap-12 md:gap-12"
          data-node-id="4:4001"
        >
          {(Object.entries(FOOTER_LINKS) as [string, string[]][]).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-3" data-node-id={`footer-col-${heading}`}>
              <h4
                className="font-bricolage font-semibold text-lg leading-7 text-[#0a0a0a]"
                style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
              >
                {heading}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-bricolage font-normal text-base leading-6 text-[#737373] hover:text-[#0a0a0a] transition-colors"
                      style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between border-t border-[#f1f5f9] pt-8 px-2"
        data-node-id="4:4034"
      >
        <p
          className="font-bricolage font-normal text-sm leading-5 text-[#737373]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          data-node-id="4:4036"
        >
          © 2025 InsightPulse. All rights reserved.
        </p>

        {/* Social icons */}
        <div className="flex items-center gap-4" data-node-id="4:4037">
          {[SOCIAL_ICON_1, SOCIAL_ICON_2, SOCIAL_ICON_3].map((src, i) => (
            <a key={i} href="#" className="block h-5 w-5 hover:opacity-70 transition-opacity">
              <img src={src} alt={`Social ${i + 1}`} className="h-full w-full" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);
