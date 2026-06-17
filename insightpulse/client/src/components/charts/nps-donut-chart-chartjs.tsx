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

interface NPSDonutChartProps {
  score: number; // -100 to 100, but we'll display as percentage
}

export function NPSDonutChart({ score }: NPSDonutChartProps) {
  const chartRef = useRef(null);
  
  // Convert NPS score (-100 to 100) to percentage (0-100) for visual display
  const displayScore = Math.max(0, Math.min(100, ((score + 100) / 2)));
  const remaining = 100 - displayScore;

  // Color based on NPS score zones
  const getColor = (npsScore: number) => {
    if (npsScore >= 50) return "#10B981"; // Excellent (green)
    if (npsScore >= 0) return "#F59E0B"; // Good (amber)
    return "#EF4444"; // Needs improvement (red)
  };

  const data = {
    labels: ["NPS Score", "Remaining"],
    datasets: [
      {
        data: [displayScore, remaining],
        backgroundColor: [getColor(score), "#E5E7EB"],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 3,
        hoverBackgroundColor: [
          score >= 50 ? "#059669" : score >= 0 ? "#D97706" : "#DC2626",
          "#D1D5DB",
        ],
        hoverBorderWidth: 4,
        spacing: 2,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            if (context.dataIndex === 0) {
              return `NPS: ${score > 0 ? '+' : ''}${Math.round(score)}`;
            }
            return '';
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-[260px] flex items-center justify-center">
        <div className="w-full h-full max-w-[320px]">
          <Doughnut ref={chartRef} data={data} options={options} />
        </div>
        {/* Center score text - removed NPS label, smaller value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold mb-1" style={{ color: getColor(score) }}>
            {Math.round(displayScore)}%
          </span>
        </div>
      </div>
    </div>
  );
}
