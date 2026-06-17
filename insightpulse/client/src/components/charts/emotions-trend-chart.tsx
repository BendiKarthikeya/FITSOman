import { useEffect, useRef } from "react";

type Point = { date: string; evi: number; nps?: number };

interface EmotionsTrendChartProps {
  data?: Point[];
}

// Utility to read a CSS variable with fallback
function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v?.trim() || fallback;
}

export default function EmotionsTrendChart({ data }: EmotionsTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * DPR);
      canvas.height = Math.max(1, rect.height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();

    const cleaned: Point[] = Array.isArray(data)
      ? (data as any[]).filter((p) => typeof p?.evi === 'number' && isFinite(p.evi))
      : [];

    const chartData: Point[] = cleaned.length > 0
      ? cleaned
      : [
          { date: "Mon", evi: 81, nps: 68 },
          { date: "Tue", evi: 84, nps: 70 },
          { date: "Wed", evi: 82, nps: 69 },
          { date: "Thu", evi: 86, nps: 71 },
          { date: "Fri", evi: 88, nps: 73 },
          { date: "Sat", evi: 87, nps: 72 },
          { date: "Sun", evi: 89, nps: 74 },
        ];

    const padding = { top: 20, right: 18, bottom: 28, left: 36 };
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const chartW = Math.max(10, w - padding.left - padding.right);
    const chartH = Math.max(10, h - padding.top - padding.bottom);

    const eviMin = Math.min(...chartData.map(p => p.evi), 60);
    const eviMax = Math.max(...chartData.map(p => p.evi), 100);
    const yMin = Math.max(0, Math.floor((eviMin - 5) / 5) * 5);
    const yMax = Math.min(100, Math.ceil((eviMax + 5) / 5) * 5);
    const xCount = chartData.length;

    const val = (x: number, y: number) => ({
      x: padding.left + x * chartW,
      y: padding.top + (1 - (y - yMin) / (yMax - yMin)) * chartH,
    });

    // Colors from theme
    const colAxis = cssVar("--muted-foreground", "#8E99A5");
    const colGrid = cssVar("--border", "#E2E4E8");
    const colEvi = cssVar("--chart-1", "#2A3F8F");
    const colAreaTop = `${colEvi}33`; // ~20% alpha
    const colAreaBottom = `${colEvi}10`;
    const colNps = cssVar("--success", "#32C48D");

    // Animation state
    const duration = 900;
    let start: number | null = null;
    let hoverIndex: number | null = null;

    const draw = (ts?: number) => {
      if (typeof ts === "number" && start === null) start = ts;
      const t = typeof ts === "number" && start !== null ? Math.min(1, (ts - start) / duration) : 1;
      const ease = 1 - Math.pow(1 - t, 3);

      ctx.clearRect(0, 0, w, h);

      // Grid lines and axes
      ctx.save();
      ctx.translate(0, 0);
      ctx.strokeStyle = colGrid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const yy = padding.top + (i / steps) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, yy);
        ctx.lineTo(w - padding.right, yy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Y axis labels
      ctx.fillStyle = colAxis;
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= steps; i++) {
        const value = yMax - i * ((yMax - yMin) / steps);
        const p = val(0, value);
        ctx.fillText(String(Math.round(value)), padding.left - 8, p.y);
      }

      // X axis labels - hidden to avoid date overlap/mixing
      // ctx.textAlign = "center";
      // ctx.textBaseline = "top";
      // for (let i = 0; i < xCount; i++) {
      //   const x = i / Math.max(1, xCount - 1);
      //   const p = val(x, yMin);
      //   ctx.fillText(chartData[i].date, p.x, h - padding.bottom + 6);
      // }
      ctx.restore();

      // Build path for EVI (smoothed)
      const pts = chartData.map((p, i) => {
        const x = i / Math.max(1, xCount - 1);
        return val(x, p.evi);
      });

      const buildPath = (toIndex: number) => {
        const path = new Path2D();
        if (pts.length === 0) return path;
        path.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i <= toIndex; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const cx = (prev.x + curr.x) / 2;
          path.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + curr.y) / 2);
          path.quadraticCurveTo(curr.x, curr.y, curr.x, curr.y);
        }
        return path;
      };

      const lastIndex = Math.floor((pts.length - 1) * ease);
      const linePath = buildPath(lastIndex);

      // Area gradient
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, colAreaTop);
      grad.addColorStop(1, colAreaBottom);

      // Draw area under curve progressively
      ctx.save();
      ctx.beginPath();
      // Copy linePath
      ctx.strokeStyle = colEvi;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke(linePath);

      // Area fill
      const first = pts[0];
      const last = pts[lastIndex] ?? first;
      const areaPath = new Path2D(linePath);
      areaPath.lineTo(last.x, padding.top + chartH);
      areaPath.lineTo(first.x, padding.top + chartH);
      areaPath.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.9;
      ctx.fill(areaPath);
      ctx.restore();

      // Optional NPS dashed line (appears after EVI)
      const hasNps = chartData.some(p => p.nps !== undefined);
      if (hasNps) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = 12 * (1 - ease);
        ctx.strokeStyle = colNps;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        chartData.forEach((p, i) => {
          if (p.nps === undefined) return;
          const pt = pts[i];
          const yy = val(0, p.nps).y; // position by value
          if (i === 0) ctx.moveTo(pt.x, yy);
          else ctx.lineTo(pt.x, yy);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Points pop-in
      ctx.fillStyle = colEvi;
      for (let i = 0; i <= lastIndex; i++) {
        const p = pts[i];
        const r = 2 + 2 * ease;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hover marker
      if (hoverIndex !== null && pts[hoverIndex]) {
        const p = pts[hoverIndex];
        ctx.save();
        // vertical line
        ctx.strokeStyle = colAxis;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x, padding.top);
        ctx.lineTo(p.x, padding.top + chartH);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // highlight point
        ctx.fillStyle = colEvi;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // tooltip
        const tip = `${chartData[hoverIndex].date}  •  EVI ${Number(chartData[hoverIndex]?.evi).toFixed(1)}${chartData[hoverIndex]?.nps !== undefined ? `  •  NPS ${chartData[hoverIndex]?.nps}` : ""}`;
        const paddingX = 8;
        const paddingY = 6;
        ctx.font = "12px ui-sans-serif, system-ui";
        const textW = ctx.measureText(tip).width;
        const boxW = textW + paddingX * 2;
        const boxH = 24;
        const bx = Math.min(Math.max(p.x - boxW / 2, padding.left), w - padding.right - boxW);
        const by = Math.max(p.y - 36, padding.top + 2);
        ctx.fillStyle = cssVar("--card", "#FFFFFF");
        ctx.strokeStyle = cssVar("--border", "#E2E4E8");
        ctx.lineWidth = 1;
        ctx.beginPath();
        const r = 6;
        ctx.moveTo(bx + r, by);
        ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, r);
        ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, r);
        ctx.arcTo(bx, by + boxH, bx, by, r);
        ctx.arcTo(bx, by, bx + boxW, by, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = cssVar("--foreground", "#111111");
        ctx.textBaseline = "middle";
        ctx.fillText(tip, bx + paddingX, by + boxH / 2);
        ctx.restore();
      }

      if (t < 1) rafRef.current = requestAnimationFrame(draw);
    };

    // initial draw with animation
    rafRef.current = requestAnimationFrame(draw);

    // hover handling
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left);
      let nearest: number | null = null;
      let nearestDist = Infinity;
      for (let i = 0; i < xCount; i++) {
        const px = padding.left + (i / Math.max(1, xCount - 1)) * chartW;
        const d = Math.abs(px - x);
        if (d < nearestDist) { nearest = i; nearestDist = d; }
      }
      hoverIndex = nearest;
      draw();
    };
    const onLeave = () => { hoverIndex = null; draw(); };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const onResize = () => { resize(); draw(); };
    window.addEventListener("resize", onResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
