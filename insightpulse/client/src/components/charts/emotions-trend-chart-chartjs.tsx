import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Point = { date: string; evi: number; nps?: number };

interface EmotionsTrendChartProps {
  data?: Point[];
}

export default function EmotionsTrendChart({ data }: EmotionsTrendChartProps) {
  const chartRef = useRef(null);

  // Default demo data if none provided
  const defaultData: Point[] = [
    { date: "Mon", evi: 81, nps: 68 },
    { date: "Tue", evi: 84, nps: 70 },
    { date: "Wed", evi: 82, nps: 69 },
    { date: "Thu", evi: 86, nps: 71 },
    { date: "Fri", evi: 88, nps: 73 },
    { date: "Sat", evi: 87, nps: 72 },
    { date: "Sun", evi: 89, nps: 74 },
  ];

  const cleaned: Point[] = Array.isArray(data)
    ? (data as any[]).filter((p) => typeof p?.evi === 'number' && isFinite(p.evi))
    : [];

  const chartData: Point[] = cleaned.length > 0 ? cleaned : defaultData;

  // Don't show dates - just use indices
  const labels = chartData.map((_, index) => `${index + 1}`);

  const chartJsData = {
    labels,
    datasets: [
      {
        label: "EVI Score",
        data: chartData.map((p) => p.evi),
        borderColor: "#3B82F6", // Blue
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.3)");
          gradient.addColorStop(1, "rgba(59, 130, 246, 0.05)");
          return gradient;
        },
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3B82F6",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "#3B82F6",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3,
        fill: true,
        tension: 0.4, // Smooth curve
      },
      ...(chartData.some((p) => p.nps !== undefined)
        ? [
            {
              label: "NPS Score",
              data: chartData.map((p) => p.nps ?? null),
              borderColor: "#10B981", // Green
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: "#10B981",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointHoverBackgroundColor: "#10B981",
              pointHoverBorderColor: "#ffffff",
              pointHoverBorderWidth: 3,
              fill: false,
              tension: 0.4,
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
          color: "#6B7280",
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
          title: function (context) {
            const index = context[0].dataIndex;
            return chartData[index]?.date || `Point ${index + 1}`;
          },
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return `${label}: ${value !== null ? value.toFixed(1) : 'N/A'}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false, // Hide x-axis labels to avoid date mixing
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        min: 60,
        max: 100,
        ticks: {
          stepSize: 10,
          color: "#9CA3AF",
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(229, 231, 235, 0.5)",
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="w-full h-full" style={{ minHeight: "300px" }}>
      <Line ref={chartRef} data={chartJsData} options={options} />
    </div>
  );
}
