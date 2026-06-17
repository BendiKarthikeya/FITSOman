import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ResponseTimeLineChartProps {
  data: {
    month: string;
    time: number;
  }[];
}

export function ResponseTimeLineChart({ data }: ResponseTimeLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Use absolute values for time
    const absData = data.map(d => ({ ...d, time: Math.abs(d.time) }));

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
      .scalePoint()
      .domain(absData.map((d) => d.month))
      .range([0, width])
      .padding(0.5);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(absData, (d) => d.time) || 15])
      .nice()
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<{ month: string; time: number }>()
      .x((d) => x(d.month) || 0)
      .y((d) => y(d.time))
      .curve(d3.curveMonotoneX);

    // Draw line
    svg
      .append("path")
      .datum(absData)
      .attr("fill", "none")
      .attr("stroke", "#4CAF50")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Draw points
    svg
      .selectAll("circle")
      .data(absData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.month) || 0)
      .attr("cy", (d) => y(d.time))
      .attr("r", 5)
      .attr("fill", "#4CAF50")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Add value labels
    svg
      .selectAll("text.value")
      .data(absData)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => x(d.month) || 0)
      .attr("y", (d) => y(d.time) - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#4CAF50")
      .text((d) => d.time.toFixed(2));

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
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("font-size", "12px");

    // Y Axis Label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#6B7280")
      .text("Total Time (minutes)");

    // Grid lines
    svg
      .selectAll("line.grid")
      .data(y.ticks())
      .enter()
      .append("line")
      .attr("class", "grid")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#E5E7EB")
      .attr("stroke-dasharray", "2,2")
      .lower();

  }, [data]);

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}
