import { useEffect, useRef } from "react";

interface EmotionChartProps {
  data?: Array<{ date: string; evi: number; nps?: number }>;
}

export default function EmotionChart({ data }: EmotionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Default data if none provided
    const chartData = data || [
      { date: 'Week 1', evi: 82, nps: 68 },
      { date: 'Week 2', evi: 85, nps: 71 },
      { date: 'Week 3', evi: 84, nps: 72 },
      { date: 'Week 4', evi: 87, nps: 75 }
    ];
    
    // Handle empty datasets safely
    if (!chartData || chartData.length === 0) {
      return;
    }
    
    const count = chartData.length;
    const getX = (index: number) => {
      // If only one point, place it in the middle
      return count === 1
        ? padding + (chartWidth / 2)
        : padding + (index / (count - 1)) * chartWidth;
    };
    
    const padding = 30;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    
    // Draw EVI line (subtle navy)
    ctx.beginPath();
    ctx.strokeStyle = '#22354C';
    ctx.lineWidth = 2;
    
    chartData.forEach((point, index) => {
      const x = getX(index);
      const y = rect.height - padding - ((point.evi - 60) / 40) * chartHeight; // Scale 60-100 to chart height
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw NPS line if available anywhere in the dataset
    const hasNps = chartData.some(point => point.nps !== undefined);
    if (hasNps) {
      ctx.beginPath();
      ctx.strokeStyle = '#32C48D';
      ctx.lineWidth = 2;
      
      chartData.forEach((point, index) => {
        if (point.nps !== undefined) {
          const x = getX(index);
          const y = rect.height - padding - ((point.nps - 60) / 40) * chartHeight; // Scale 60-100 to chart height
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
    }

    // Draw data points
    chartData.forEach((point, index) => {
      const x = getX(index);
      
      // EVI point
      const eviY = rect.height - padding - ((point.evi - 60) / 40) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, eviY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#22354C';
      ctx.fill();
      
      // NPS point
      if (point.nps !== undefined) {
        const npsY = rect.height - padding - ((point.nps - 60) / 40) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, npsY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#32C48D';
        ctx.fill();
      }
    });

  }, [data]);

  return (
    <div className="relative w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-accent rounded-full"></div>
          <span>EVI Score</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-success rounded-full"></div>
          <span>NPS</span>
        </div>
      </div>
    </div>
  );
}
