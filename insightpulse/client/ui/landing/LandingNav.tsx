import React, { useState } from 'react';

const NAV_LINKS = [
  { label: 'Why Choose Us', href: '#why-choose-us' },
  { label: 'Industries', href: '#industries' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Testimonials', href: '#testimonials' },
];

export const LandingNav: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white border-b border-[#e5e5e5]"
      data-node-id="4:3462"
    >
      <div className="mx-auto flex h-[80px] max-w-[1280px] items-center justify-between px-3 md:px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0" data-node-id="4:3464">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f172a] shrink-0"
            data-node-id="4:3465"
          >
            <span className="font-ibm-plex font-semibold text-xl leading-[1.4] text-white">
              IP
            </span>
          </div>
          <span
            className="font-bricolage font-semibold text-xl leading-7 text-[#0a0a0a]"
            data-node-id="4:3466"
          >
            InsightPulse
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 min-w-0 shrink" data-node-id="4:3468">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-md px-4 py-2 text-sm font-ibm-plex font-normal text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Login Button */}
        <a
          href="/login"
          className="hidden lg:flex h-12 shrink-0 items-center justify-center rounded-lg bg-[#171717] px-8 text-base font-ibm-plex font-normal text-[#fafafa] hover:bg-[#2a2a2a] transition-colors"
          data-node-id="4:3486"
        >
          Login
        </a>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-6 bg-[#0a0a0a] transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-6 bg-[#0a0a0a] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-6 bg-[#0a0a0a] transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[#e5e5e5] bg-white px-4 py-4 flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-md px-4 py-3 text-sm font-ibm-plex font-normal text-[#0a0a0a] hover:bg-[#f5f5f5]"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="mt-2 flex h-12 items-center justify-center rounded-lg bg-[#171717] text-base font-ibm-plex font-normal text-[#fafafa]"
          >
            Login
          </a>
        </div>
      )}
    </header>
  );
};
