import { useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CESGaugeChartProps {
  score: number; // 0-100
}

export function CESGaugeChart({ score }: CESGaugeChartProps) {
  const chartRef = useRef(null);
  const validScore = Math.round(Math.min(100, Math.max(0, score || 0)));
  const remaining = 100 - validScore;

  // Color based on score (green = good, yellow = medium, red = bad)
  const getColor = (score: number) => {
    if (score >= 70) return "#10B981"; // Green
    if (score >= 40) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const data = {
    labels: ["Score", "Remaining"],
    datasets: [
      {
        data: [validScore, remaining],
        backgroundColor: [
          getColor(validScore), 
          "rgba(229, 231, 235, 0.3)" // More transparent background
        ],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 4,
        hoverBackgroundColor: [
          validScore >= 70 ? "#059669" : validScore >= 40 ? "#D97706" : "#DC2626",
          "rgba(209, 213, 219, 0.5)"
        ],
        hoverBorderWidth: 5,
        circumference: 180, // Half circle (gauge)
        rotation: 270, // Start from bottom
        spacing: 3, // Add spacing between segments
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        padding: 16,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            if (context.dataIndex === 0) {
              return `CES Score: ${validScore}%`;
            }
            return '';
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: "easeInOutCubic",
    },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center py-3">
      <div className="relative w-full h-[260px] flex items-center justify-center">
        <div className="w-full h-full max-w-[320px]">
          <Doughnut ref={chartRef} data={data} options={options} />
        </div>
        {/* Center score text - reduced size */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '32%' }}>
          <span className="text-4xl font-bold" style={{ color: getColor(validScore) }}>
            {validScore}%
          </span>
          <span className="text-[10px] text-gray-400 mt-1 tracking-wider uppercase">
            Effort Score
          </span>
        </div>
      </div>
      {/* Scale labels with better styling */}
      <div className="w-full max-w-[320px] flex justify-between text-xs font-medium text-gray-500 px-3 -mt-1">
        <span>-100</span>
        <span className="text-xs text-gray-400">Lower is Better</span>
        <span>100</span>
      </div>
    </div>
  );
}
