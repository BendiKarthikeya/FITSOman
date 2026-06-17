import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsBarChartProps {
  evi?: number;
  nps?: number;
  csat?: number;
}

export default function MetricsBarChart({ evi = 0, nps = 0, csat = 0 }: MetricsBarChartProps) {
  const chartRef = useRef(null);

  // Color function based on score
  const getColor = (value: number, isNPS: boolean = false) => {
    if (isNPS) {
      // NPS scale: -100 to 100
      if (value >= 50) return '#10b981'; // Green - Excellent
      if (value >= 20) return '#3b82f6'; // Blue - Good
      if (value >= 0) return '#f59e0b';  // Yellow - Fair
      return '#ef4444'; // Red - Poor
    } else {
      // Regular 0-100 scale
      if (value >= 80) return '#10b981'; // Green
      if (value >= 60) return '#3b82f6'; // Blue
      if (value >= 40) return '#f59e0b'; // Yellow
      return '#ef4444'; // Red
    }
  };

  const chartData = {
    labels: ['EVI Score', 'NPS Score', 'CSAT Score'],
    datasets: [
      {
        label: 'Current Scores',
        data: [evi, nps, csat],
        backgroundColor: [
          getColor(evi),
          getColor(nps, true),
          getColor(csat),
        ],
        borderColor: [
          getColor(evi),
          getColor(nps, true),
          getColor(csat),
        ],
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 60,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed.y;
            return `${label}: ${value !== null ? value.toFixed(1) : '0'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 13,
            weight: 600,
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: "#9CA3AF",
          font: {
            size: 11,
          },
          callback: function(value) {
            return value + '%';
          },
        },
        grid: {
          color: "rgba(229, 231, 235, 0.5)",
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6 text-center pt-4 border-t">
        <div>
          <div className="text-2xl font-bold" style={{ color: getColor(evi) }}>
            {evi.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Emotional Value Index</div>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: getColor(nps, true) }}>
            {nps.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Net Promoter Score</div>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: getColor(csat) }}>
            {csat.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Customer Satisfaction</div>
        </div>
      </div>
    </div>
  );
}
