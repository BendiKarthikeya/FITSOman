import React from 'react';
import { ArrowUpRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Card, CardContent } from '../components';

const featureCards = [
  {
    title: 'Multi-Channel Surveys',
    description:
      'Run surveys across Web, WhatsApp (WATI), and Voice AI (VAPI) to maximize participation.',
    tags: ['Web', 'WhatsApp', 'Voice AI'],
  },
  {
    title: 'AI-Powered Analytics',
    description:
      'Use sentiment scoring, theme extraction and trend tracking for leadership-ready insights.',
    tags: ['Sentiment', 'Themes', 'Trends'],
  },
  {
    title: 'Action Planning',
    description:
      'Convert findings into accountable initiatives with assignees, due dates, and statuses.',
    tags: ['Track', 'Assign', 'Measure'],
  },
];

const faq = [
  {
    q: 'What is InsightPulse?',
    a: 'InsightPulse is an enterprise employee experience platform for collecting feedback and turning it into measurable action.',
  },
  {
    q: 'Do you support multi-channel surveys?',
    a: 'Yes. Surveys can run on web, WhatsApp and voice channels.',
  },
  {
    q: 'Is employee data secure?',
    a: 'Yes. The platform supports enterprise-grade controls and role-based access.',
  },
  {
    q: 'Do you offer support?',
    a: 'Yes. Support is available for onboarding and production usage.',
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="text-lg font-semibold">InsightPulse</div>
          <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#capabilities" className="hover:text-slate-900">Capabilities</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <Button>Login</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="grid gap-8 rounded-xl border border-slate-200 bg-white p-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-slate-600">Enterprise Employee Experience Platform</p>
            <h1 className="mb-4 text-4xl font-bold leading-tight">Build, Measure & Act on Employee Feedback — In One Platform</h1>
            <p className="mb-6 text-slate-600">
              Create surveys with a no-code builder, distribute across channels, analyze sentiment and NPS, then launch action plans.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="inline-flex items-center gap-2">Request Demo <ArrowUpRight className="h-4 w-4" /></Button>
              <Button variant="outline">Sign In</Button>
            </div>
            <div className="mt-5 flex gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Enterprise-grade security</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />Real-time analytics</span>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm text-slate-500">Response Rate</p>
                  <p className="text-2xl font-semibold">94%</p>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm text-slate-500">NPS Score</p>
                  <p className="text-2xl font-semibold">72</p>
                </div>
              </div>
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
                Dashboard Preview Placeholder
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="features" className="mt-14">
          <h2 className="mb-6 text-3xl font-bold">Designed for Enterprise Feedback at Scale</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-6">
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="mb-4 text-sm text-slate-600">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="capabilities" className="mt-14 rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="mb-4 text-3xl font-bold">Enterprise Capabilities</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'Role-based access control',
              'Department-level analytics',
              'Arabic RTL support',
              'WCAG 2.1 accessibility',
              'WATI and VAPI integrations',
              'SOC 2 aligned security controls',
            ].map((item) => (
              <div key={item} className="inline-flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-14">
          <h2 className="mb-6 text-3xl font-bold">Frequently Asked Questions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {faq.map((entry) => (
              <Card key={entry.q}>
                <CardContent className="p-5">
                  <h3 className="mb-2 font-semibold">{entry.q}</h3>
                  <p className="text-sm text-slate-600">{entry.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm text-slate-600">
          <span>© 2026 InsightPulse. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-900">Privacy</a>
            <a href="#" className="hover:text-slate-900">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
