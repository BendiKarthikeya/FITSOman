import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface NPSDonutChartProps {
  score: number; // -100 to 100, displayed as 0-100 percentage
}

export function NPSDonutChart({ score }: NPSDonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.6;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Convert NPS score (-100 to 100) to percentage (0-100)
    const displayScore = Math.max(0, Math.min(100, ((score + 100) / 2)));
    
    const data = [
      { label: "Score", value: displayScore, color: "#FFB84D" },
      { label: "Remaining", value: 100 - displayScore, color: "#E5E7EB" },
    ];

    const pie = d3
      .pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcs = svg
      .selectAll("arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw arcs
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Score text in center
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", 0)
      .attr("font-size", "48px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(`${Math.round(displayScore)}%`);

    // Scale labels
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", -radius - 10)
      .attr("y", radius + 25)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("-100");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", radius + 10)
      .attr("y", radius + 25)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("100");

  }, [score]);

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}
