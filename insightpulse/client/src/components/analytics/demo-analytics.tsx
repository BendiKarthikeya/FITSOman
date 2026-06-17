import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';

function useCountUp(target: number, options?: { duration?: number; decimals?: number }) {
  const { duration = 1200, decimals = 0 } = options || {};
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const start = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(start);
    };
    rafRef.current = requestAnimationFrame(start);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [target, duration, decimals]);

  return value;
}

function Sparkline({ points, color = "hsl(var(--muted-foreground))" }: { points: number[]; color?: string }) {
  const path = useMemo(() => {
    if (points.length === 0) return "";
    const w = 80;
    const h = 28;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = Math.max(1, max - min);
    const step = w / (points.length - 1);
    return points
      .map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg width={80} height={28} viewBox="0 0 80 28" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  suffix,
  change,
  decimals = 0,
  accent = "var(--accent)",
  spark = [72, 74, 73, 76, 78, 77, 80],
}: {
  label: string;
  value: number;
  suffix?: string;
  change?: number; // positive/negative
  decimals?: number;
  accent?: string;
  spark?: number[];
}) {
  const val = useCountUp(value, { duration: 1000, decimals });
  const isUp = (change ?? 0) >= 0;
  return (
    <Card className="group border border-border/80 bg-card/90 backdrop-blur-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {val}
            {suffix}
          </div>
          {typeof change === "number" && (
            <div className={`mt-2 inline-flex items-center text-sm ${isUp ? "text-success" : "text-destructive"}`}>
              {isUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {isUp ? "+" : ""}{Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="opacity-90">
          <Sparkline points={spark} color={`var(--chart-1)`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemoAnalytics() {
  const { t } = useTranslation();
  // Fetch unified metrics for real-time deduplicated data
  const { data: unifiedMetrics } = useQuery({
    queryKey: ["/api/unified-analytics/metrics"],
    refetchInterval: 30000, // 30 seconds
  });

  const metrics = unifiedMetrics as any;
  const hasData = Boolean(
    metrics &&
    (metrics.totalFeedback30d || metrics.eviScore || metrics.npsScore || metrics.csatScore)
  );
  const safeEvi = metrics?.eviScore ?? 0;
  const safeNps = Math.round(metrics?.npsScore ?? 0);
  const safeFeedback = metrics?.totalFeedback30d ?? 0;
  const safeCsat = metrics?.csatScore ?? 0;
  const zeroSpark = [0, 0, 0, 0, 0, 0, 0];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label={t('dashboard.kpis.eviShort')} 
          value={safeEvi} 
          decimals={1} 
          change={hasData ? 0 : undefined} 
          suffix="" 
          spark={hasData ? [0, 0, 0, 0, 0, 0, safeEvi] : zeroSpark} 
        />
        <StatCard 
          label={t('dashboard.kpis.npsShort')} 
          value={safeNps} 
          change={hasData ? 0 : undefined} 
          suffix="" 
          spark={hasData ? [0, 0, 0, 0, 0, 0, safeNps] : zeroSpark} 
        />
        <StatCard 
          label={t('dashboard.kpis.feedback30d')} 
          value={safeFeedback} 
          change={hasData ? 0 : undefined} 
          suffix="" 
          spark={hasData ? [0, 0, 0, 0, 0, 0, safeFeedback] : zeroSpark} 
        />
        <StatCard 
          label={t('dashboard.kpis.csatShort')} 
          value={safeCsat} 
          decimals={1} 
          change={hasData ? 0 : undefined} 
          suffix="/5" 
          spark={hasData ? [0, 0, 0, 0, 0, 0, safeCsat] : zeroSpark} 
        />
      </div>
    </div>
  );
}

