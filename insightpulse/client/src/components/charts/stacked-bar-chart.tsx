import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface StackedBarChartProps {
  data: {
    control: string;
    verySatisfied: number;
    satisfied: number;
    neutral: number;
    unsatisfied: number;
    veryUnsatisfied: number;
  }[];
}

export function StackedBarChart({ data }: StackedBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Stack the data
    const keys = ["veryUnsatisfied", "unsatisfied", "neutral", "satisfied", "verySatisfied"];
    const colors = ["#FF4444", "#FF8866", "#FFB84D", "#FFD966", "#4CAF50"];
    const labels = ["Very Unsatisfied", "Unsatisfied", "Neutral", "Satisfied", "Very Satisfied"];

    const stack = d3.stack<any>().keys(keys);
    const series = stack(data);

    // Scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.control))
      .range([0, width])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, 100])
      .nice()
      .range([height, 0]);

    // Draw bars
    svg
      .selectAll("g.layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d, i) => colors[i])
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.data.control) || 0)
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

    // Add value labels on bars
    svg
      .selectAll("g.layer")
      .data(series)
      .selectAll("text")
      .data((d) => d)
      .enter()
      .append("text")
      .attr("x", (d: any) => (x(d.data.control) || 0) + x.bandwidth() / 2)
      .attr("y", (d) => (y(d[1]) + y(d[0])) / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text((d: any) => {
        const value = d[1] - d[0];
        return value > 5 ? value.toFixed(1) : "";
      });

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("font-size", "12px");

    // Y Axis
    svg
      .append("g")
      .call(d3.axisLeft(y).tickFormat((d) => `${d}%`))
      .selectAll("text")
      .attr("font-size", "12px");

    // Legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width + 10}, 0)`);

    labels.forEach((label, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow
        .append("circle")
        .attr("r", 5)
        .attr("fill", colors[i]);

      legendRow
        .append("text")
        .attr("x", 12)
        .attr("y", 5)
        .attr("font-size", "11px")
        .attr("fill", "#666")
        .text(label);
    });

  }, [data]);

  // Show message when no data
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No satisfaction data available</p>
          <p className="text-xs mt-2">Data will appear here once survey responses are collected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}
