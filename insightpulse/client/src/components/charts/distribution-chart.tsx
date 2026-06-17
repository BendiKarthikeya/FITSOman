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

interface DistributionChartProps {
  data?: { positive: number; neutral: number; negative: number };
}

export default function DistributionChart({ data }: DistributionChartProps) {
  const chartRef = useRef(null);

  // Default data if none provided - show zeros for new accounts
  const defaultData = { positive: 0, neutral: 0, negative: 0 };
  const chartData = data || defaultData;

  // Safeguard: avoid invalid data
  const total = chartData.positive + chartData.neutral + chartData.negative;
  const hasValidData = isFinite(total) && total > 0;

  // If no valid data, show zeros
  const displayData = hasValidData ? chartData : defaultData;

  const chartJsData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [displayData.positive, displayData.neutral, displayData.negative],
        backgroundColor: [
          '#10b981', // Green for positive
          '#f59e0b', // Yellow for neutral
          '#ef4444', // Red for negative
        ],
        borderColor: [
          '#ffffff',
          '#ffffff',
          '#ffffff',
        ],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
          color: "#6B7280",
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                const bgColors = data.datasets[0].backgroundColor;
                const bgColor = Array.isArray(bgColors) ? bgColors[i] : bgColors;
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: bgColor as string,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%', // Donut effect
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full" style={{ minHeight: "250px" }}>
        <Doughnut ref={chartRef} data={chartJsData} options={options} />
      </div>
    </div>
  );
}
