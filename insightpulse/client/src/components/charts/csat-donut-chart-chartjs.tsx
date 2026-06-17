import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CSATDonutChartProps {
  forumPercent: number;
  incidentPercent: number;
}

export function CSATDonutChart({ forumPercent, incidentPercent }: CSATDonutChartProps) {
  const chartRef = useRef(null);

  const data = {
    labels: ["Positive", "Neutral"],
    datasets: [
      {
        data: [forumPercent, incidentPercent],
        backgroundColor: [
          "#10B981", // Beautiful emerald green for positive
          "#F59E0B", // Warm amber for neutral
        ],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 4,
        hoverBackgroundColor: [
          "#059669", // Darker green on hover
          "#D97706", // Darker amber on hover
        ],
        hoverBorderColor: ["#ffffff", "#ffffff"],
        hoverBorderWidth: 5,
        // Add spacing between segments
        spacing: 4,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%", // Makes the donut thinner and more modern
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13,
            weight: 500,
          },
          color: "#6B7280",
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              const bgColors = data.datasets[0].backgroundColor as string[];
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                return {
                  text: `${label}: ${value.toFixed(1)}%`,
                  fillStyle: bgColors[i],
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
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 16,
        displayColors: true,
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
            const label = context.label || "";
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(1)}%`;
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
    interaction: {
      mode: "nearest",
      intersect: true,
    },
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full h-[260px] max-w-[320px] flex items-center justify-center">
        <Doughnut ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
}
