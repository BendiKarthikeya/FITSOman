import { useEffect, useRef } from "react";

export default function TrendChart() {
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

    // Sample data
    const data = [65, 72, 78, 81, 84, 87];
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    const padding = 20;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, padding, 0, rect.height - padding);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0.05)');
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    
    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = rect.height - padding - ((value - minValue) / valueRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Fill area under curve
    ctx.lineTo(rect.width - padding, rect.height - padding);
    ctx.lineTo(padding, rect.height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
